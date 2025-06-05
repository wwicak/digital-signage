import mongoose from "mongoose";
import Reservation, { IReservation } from "../../../api/models/Reservation";
import Room from "../../../api/models/Room";
import Building from "../../../api/models/Building";

describe("Updated Reservation Model - External Calendar Integration", () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(
        process.env.MONGODB_URI || "mongodb://localhost:27017/test"
      );
    }
  });

  beforeEach(async () => {
    await Reservation.deleteMany({});
    await Room.deleteMany({});
    await Building.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe("External Calendar Fields", () => {
    let room: any;

    beforeEach(async () => {
      const building = new Building({
        name: "Test Building",
        address: "123 Test St",
      });
      await building.save();

      room = new Room({
        name: "Test Room",
        building_id: building._id,
        capacity: 10,
      });
      await room.save();
    });

    it("should create reservation with default external calendar values", async () => {
      const reservation = new Reservation({
        title: "Test Meeting",
        room_id: room._id,
        start_time: new Date("2024-01-01T10:00:00Z"),
        end_time: new Date("2024-01-01T11:00:00Z"),
        organizer: "test@example.com",
        attendees: ["attendee1@example.com"],
        agenda_meeting: "Test agenda",
      });

      const savedReservation = await reservation.save();

      expect(savedReservation.sourceCalendarType).toBe("internal");
      expect(savedReservation.isExternallyManaged).toBe(false);
      expect(savedReservation.externalCalendarEventId).toBeUndefined();
      expect(savedReservation.externalCalendarId).toBeUndefined();
      expect(savedReservation.lastSyncedAt).toBeUndefined();
    });

    it("should create reservation with Google calendar integration", async () => {
      const reservation = new Reservation({
        title: "Google Calendar Meeting",
        room_id: room._id,
        start_time: new Date("2024-01-01T10:00:00Z"),
        end_time: new Date("2024-01-01T11:00:00Z"),
        organizer: "test@example.com",
        attendees: ["attendee1@example.com"],
        agenda_meeting: "Google calendar sync test",
        externalCalendarEventId: "google-event-123",
        externalCalendarId: "user-calendar-link-id-456",
        sourceCalendarType: "google",
        isExternallyManaged: true,
        lastSyncedAt: new Date(),
      });

      const savedReservation = await reservation.save();

      expect(savedReservation.externalCalendarEventId).toBe("google-event-123");
      expect(savedReservation.externalCalendarId).toBe(
        "user-calendar-link-id-456"
      );
      expect(savedReservation.sourceCalendarType).toBe("google");
      expect(savedReservation.isExternallyManaged).toBe(true);
      expect(savedReservation.lastSyncedAt).toBeDefined();
    });

    it("should create reservation with Outlook calendar integration", async () => {
      const reservation = new Reservation({
        title: "Outlook Calendar Meeting",
        room_id: room._id,
        start_time: new Date("2024-01-01T14:00:00Z"),
        end_time: new Date("2024-01-01T15:00:00Z"),
        organizer: "organizer@company.com",
        attendees: ["attendee1@company.com", "attendee2@company.com"],
        agenda_meeting: "Outlook calendar sync test",
        externalCalendarEventId: "outlook-event-789",
        externalCalendarId: "user-calendar-link-id-101",
        sourceCalendarType: "outlook",
        isExternallyManaged: true,
        lastSyncedAt: new Date(),
      });

      const savedReservation = await reservation.save();

      expect(savedReservation.externalCalendarEventId).toBe(
        "outlook-event-789"
      );
      expect(savedReservation.externalCalendarId).toBe(
        "user-calendar-link-id-101"
      );
      expect(savedReservation.sourceCalendarType).toBe("outlook");
      expect(savedReservation.isExternallyManaged).toBe(true);
      expect(savedReservation.lastSyncedAt).toBeDefined();
    });

    it("should validate sourceCalendarType enum values", async () => {
      const reservation = new Reservation({
        title: "Invalid Calendar Type Meeting",
        room_id: room._id,
        start_time: new Date("2024-01-01T10:00:00Z"),
        end_time: new Date("2024-01-01T11:00:00Z"),
        organizer: "test@example.com",
        sourceCalendarType: "invalid-type" as any,
      });

      let error;
      try {
        await reservation.save();
      } catch (e) {
        error = e;
      }

      expect(error).toBeDefined();
      expect(error.errors.sourceCalendarType).toBeDefined();
    });

    it("should allow all valid sourceCalendarType values", async () => {
      const validTypes = ["google", "outlook", "internal"];

      for (const type of validTypes) {
        const reservation = new Reservation({
          title: `${type} Calendar Meeting`,
          room_id: room._id,
          start_time: new Date(
            `2024-01-0${validTypes.indexOf(type) + 1}T10:00:00Z`
          ),
          end_time: new Date(
            `2024-01-0${validTypes.indexOf(type) + 1}T11:00:00Z`
          ),
          organizer: "test@example.com",
          sourceCalendarType: type as "google" | "outlook" | "internal",
        });

        const savedReservation = await reservation.save();
        expect(savedReservation.sourceCalendarType).toBe(type);
      }
    });

    it("should handle partial external calendar data", async () => {
      const reservation = new Reservation({
        title: "Partial External Data Meeting",
        room_id: room._id,
        start_time: new Date("2024-01-01T10:00:00Z"),
        end_time: new Date("2024-01-01T11:00:00Z"),
        organizer: "test@example.com",
        externalCalendarEventId: "event-123",
        // Missing externalCalendarId, should still save
        sourceCalendarType: "google",
      });

      const savedReservation = await reservation.save();

      expect(savedReservation.externalCalendarEventId).toBe("event-123");
      expect(savedReservation.externalCalendarId).toBeUndefined();
      expect(savedReservation.sourceCalendarType).toBe("google");
      expect(savedReservation.isExternallyManaged).toBe(false); // default value
    });
  });

  describe("Zod Schema Validation", () => {
    it("should validate external calendar fields in Zod schema", () => {
      const {
        ReservationSchemaZod,
      } = require("../../../api/models/Reservation");

      const validReservationData = {
        title: "Test Meeting",
        room_id: new mongoose.Types.ObjectId(),
        start_time: new Date("2024-01-01T10:00:00Z"),
        end_time: new Date("2024-01-01T11:00:00Z"),
        organizer: "test@example.com",
        attendees: ["attendee1@example.com"],
        externalCalendarEventId: "event-123",
        externalCalendarId: "calendar-456",
        sourceCalendarType: "google",
        isExternallyManaged: true,
        lastSyncedAt: new Date(),
      };

      const result = ReservationSchemaZod.safeParse(validReservationData);
      expect(result.success).toBe(true);
    });

    it("should use default values for external calendar fields in Zod schema", () => {
      const {
        ReservationSchemaZod,
      } = require("../../../api/models/Reservation");

      const minimalReservationData = {
        title: "Test Meeting",
        room_id: new mongoose.Types.ObjectId(),
        start_time: new Date("2024-01-01T10:00:00Z"),
        end_time: new Date("2024-01-01T11:00:00Z"),
        organizer: "test@example.com",
      };

      const result = ReservationSchemaZod.safeParse(minimalReservationData);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.sourceCalendarType).toBe("internal");
        expect(result.data.isExternallyManaged).toBe(false);
      }
    });
  });

  describe("Indexes for External Calendar Integration", () => {
    it("should have indexes for external calendar fields", async () => {
      const indexes = await Reservation.collection.getIndexes();
      const indexNames = Object.keys(indexes);

      expect(indexNames).toContain("externalCalendarEventId_1");
      expect(indexNames).toContain(
        "sourceCalendarType_1_isExternallyManaged_1"
      );
    });
  });
});
