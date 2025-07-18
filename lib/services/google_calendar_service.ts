import { google } from 'googleapis';
import UserCalendarLink, { IUserCalendarLink } from '../models/UserCalendarLink';
import Reservation from '../models/Reservation';
import { decrypt } from '../utils/encryption';

export class GoogleCalendarService {
  private calendarLink: IUserCalendarLink;
  private authClient;

  constructor(calendarLink: IUserCalendarLink) {
    this.calendarLink = calendarLink;
    // if (!this.calendarLink.roomId) {
    //   throw new Error('Calendar link must have a roomId for reservation syncing.');
    // }
    this.authClient = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.APP_URL}${process.env.GOOGLE_CALLBACK_URL}`
    );

    const accessToken = decrypt(this.calendarLink.accessToken);
    const refreshToken = this.calendarLink.refreshToken ? decrypt(this.calendarLink.refreshToken) : undefined;

    this.authClient.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
  }

  async syncReservations() {

    try {

    const calendar = google.calendar({ version: 'v3', auth: this.authClient });

    // 1. Fetch recent events from Google Calendar
    const googleEvents = await calendar.events.list({
      calendarId: this.calendarLink.calendarId,
      timeMin: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
      maxResults: 250,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const gEvents = googleEvents.data.items || [];

    // 2. Fetch corresponding local reservations
    const eventIds = gEvents.map(e => e.id).filter(id => id !== null && id !== undefined) as string[];
    const localReservations = await Reservation.find({ externalCalendarEventId: { $in: eventIds } });
    const localReservationMap = new Map(localReservations.map(r => [r.externalCalendarEventId, r]));

    let syncedCount = 0;

    // 3. Iterate through Google events and sync with local reservations
    for (const gEvent of gEvents) {
      if (!gEvent.id) continue;

      const existingReservation = localReservationMap.get(gEvent.id);

      if (existingReservation) {
        // Update existing reservation if changed
        const lastUpdated = new Date(gEvent.updated || gEvent.created || Date.now());
        if (existingReservation.last_update.getTime() < lastUpdated.getTime()) {
          existingReservation.title = gEvent.summary || 'No Title';
          existingReservation.start_time = new Date(gEvent.start?.dateTime || gEvent.start?.date || Date.now());
          existingReservation.end_time = new Date(gEvent.end?.dateTime || gEvent.end?.date || Date.now());
          existingReservation.organizer = gEvent.organizer?.email || 'Unknown';
          existingReservation.attendees = gEvent.attendees?.map(a => a.email).filter(e => e !== null && e !== undefined) as string[] || [];
          existingReservation.location = gEvent.location || undefined;
          existingReservation.lastSyncedAt = new Date();
          await existingReservation.save();
          syncedCount++;
        }
      } else {
        // Create new reservation if it doesn't exist locally
        const newReservation = new Reservation({
          title: gEvent.summary || 'No Title',
          room_id: this.calendarLink.roomId,
          location: gEvent.location || undefined, // Use location from Google event
          start_time: new Date(gEvent.start?.dateTime || gEvent.start?.date || Date.now()),
          end_time: new Date(gEvent.end?.dateTime || gEvent.end?.date || Date.now()),
          organizer: gEvent.organizer?.email || 'Unknown',
          attendees: gEvent.attendees?.map(a => a.email).filter(e => e !== null && e !== undefined) as string[] || [],
          externalCalendarEventId: gEvent.id,
          externalCalendarId: this.calendarLink.calendarId,
          sourceCalendarType: 'google',
          isExternallyManaged: true,
          lastSyncedAt: new Date(),
        });
        await newReservation.save();
        syncedCount++;
      }
    }

    // 4. (Optional) Find and remove local reservations that were deleted in Google
    const localEventIds = localReservations.map(r => r.externalCalendarEventId).filter(id => id !== null && id !== undefined) as string[];
    const deletedEventIds = localEventIds.filter(id => !eventIds.includes(id));
    if (deletedEventIds.length > 0) {
      await Reservation.deleteMany({ externalCalendarEventId: { $in: deletedEventIds } });
      syncedCount += deletedEventIds.length;
    }

    // 5. Update the sync status on the calendar link
    this.calendarLink.lastSyncStatus = 'success';
    this.calendarLink.lastSyncedAt = new Date();
    await this.calendarLink.save();

    return { syncedCount };

  } catch (error) {
    console.error('Sync failed:', error);
    await this.calendarLink.save();
    throw error;
  }
  }

  async revokeAuth(accessToken: string): Promise<void> {
    try {
      await this.authClient.revokeToken(accessToken);
      console.log('Google token revoked successfully.');
    } catch (error) {
      console.error('Error revoking Google token:', error);
      throw error;
    }
  }
}