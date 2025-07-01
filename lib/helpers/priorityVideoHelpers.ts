import PriorityVideoModel, { IPriorityVideo } from '@/lib/models/PriorityVideo';
import DisplayModel from '@/lib/models/Display';
import mongoose from 'mongoose';

export interface PriorityVideoCheck {
  isActive: boolean;
  priorityVideo?: IPriorityVideo;
  priority: number;
}

/**
 * Check if there's an active priority video for a specific display
 */
export async function checkActivePriorityVideo(displayId: string): Promise<PriorityVideoCheck> {
  try {
    // Get display information
    const display = await DisplayModel.findById(displayId);
    if (!display) {
      return { isActive: false, priority: 0 };
    }

    // Find all active priority videos that apply to this display
    const priorityVideos = await PriorityVideoModel.find({
      isActive: true,
      $or: [
        { displays: new mongoose.Types.ObjectId(displayId) }, // Specific display
        { buildings: display.building }, // Building-wide
        { displays: { $exists: false }, buildings: { $exists: false } } // Global (no specific targeting)
      ]
    }).sort({ priority: -1 }); // Sort by priority descending (highest first)

    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // Check each priority video to see if it's currently scheduled
    for (const video of priorityVideos) {
      const isScheduleActive = checkScheduleActive(video.schedule, currentDay, currentTime);
      
      if (isScheduleActive) {
        return {
          isActive: true,
          priorityVideo: video,
          priority: video.priority
        };
      }
    }

    return { isActive: false, priority: 0 };
  } catch (error) {
    console.error('Error checking active priority video:', error);
    return { isActive: false, priority: 0 };
  }
}

/**
 * Check if a schedule is currently active
 */
export function checkScheduleActive(
  schedule: { daysOfWeek: number[]; timeSlots: Array<{ startTime: string; endTime: string }> },
  currentDay: number,
  currentTime: string
): boolean {
  // Check if current day is in allowed days (empty array means all days)
  if (schedule.daysOfWeek && schedule.daysOfWeek.length > 0 && !schedule.daysOfWeek.includes(currentDay)) {
    return false;
  }

  // Check if current time is in allowed time slots
  if (schedule.timeSlots && schedule.timeSlots.length > 0) {
    return schedule.timeSlots.some(slot => {
      return currentTime >= slot.startTime && currentTime <= slot.endTime;
    });
  }

  // If no time slots defined, don't activate
  return false;
}

/**
 * Get all priority videos for a specific display (for admin management)
 */
export async function getPriorityVideosForDisplay(displayId: string): Promise<IPriorityVideo[]> {
  try {
    const display = await DisplayModel.findById(displayId);
    if (!display) {
      return [];
    }

    const priorityVideos = await PriorityVideoModel.find({
      $or: [
        { displays: new mongoose.Types.ObjectId(displayId) },
        { buildings: display.building },
        { displays: { $exists: false }, buildings: { $exists: false } }
      ]
    }).sort({ priority: -1, creation_date: -1 });

    return priorityVideos;
  } catch (error) {
    console.error('Error getting priority videos for display:', error);
    return [];
  }
}

/**
 * Create a new priority video
 */
export async function createPriorityVideo(
  data: Partial<IPriorityVideo>,
  creatorId: string
): Promise<IPriorityVideo | null> {
  try {
    const priorityVideo = new PriorityVideoModel({
      ...data,
      creator_id: new mongoose.Types.ObjectId(creatorId)
    });

    await priorityVideo.save();
    return priorityVideo;
  } catch (error) {
    console.error('Error creating priority video:', error);
    return null;
  }
}

/**
 * Update a priority video
 */
export async function updatePriorityVideo(
  id: string,
  data: Partial<IPriorityVideo>
): Promise<IPriorityVideo | null> {
  try {
    const priorityVideo = await PriorityVideoModel.findByIdAndUpdate(
      id,
      { ...data, last_update: new Date() },
      { new: true }
    );

    return priorityVideo;
  } catch (error) {
    console.error('Error updating priority video:', error);
    return null;
  }
}

/**
 * Delete a priority video
 */
export async function deletePriorityVideo(id: string): Promise<boolean> {
  try {
    await PriorityVideoModel.findByIdAndDelete(id);
    return true;
  } catch (error) {
    console.error('Error deleting priority video:', error);
    return false;
  }
}

/**
 * Get all priority videos (for admin overview)
 */
export async function getAllPriorityVideos(): Promise<IPriorityVideo[]> {
  try {
    const priorityVideos = await PriorityVideoModel.find()
      .populate('creator_id', 'name email')
      .populate('displays', 'name')
      .sort({ priority: -1, creation_date: -1 });

    return priorityVideos;
  } catch (error) {
    console.error('Error getting all priority videos:', error);
    return [];
  }
}

/**
 * Convert priority video data for display component
 */
export function convertPriorityVideoForDisplay(priorityVideo: IPriorityVideo) {
  return {
    title: priorityVideo.title,
    url: priorityVideo.url,
    mediaType: priorityVideo.mediaType,
    backgroundColor: priorityVideo.backgroundColor,
    schedule: priorityVideo.schedule,
    volume: priorityVideo.volume,
    fallbackContent: priorityVideo.fallbackContent,
    priority: priorityVideo.priority,
    playOnce: priorityVideo.playOnce,
  };
}