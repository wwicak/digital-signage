import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import {
  checkActivePriorityVideo,
  getPriorityVideosForDisplay,
  convertPriorityVideoForDisplay,
} from '@/lib/helpers/priorityVideoHelpers';

// GET /api/displays/[id]/priority-video - Check active priority video for a display
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const resolvedParams = await params;
    const priorityCheck = await checkActivePriorityVideo(resolvedParams.id);

    if (priorityCheck.isActive && priorityCheck.priorityVideo) {
      const displayData = convertPriorityVideoForDisplay(priorityCheck.priorityVideo);
      return NextResponse.json({
        isActive: true,
        priorityVideo: displayData,
        priority: priorityCheck.priority,
      });
    }

    return NextResponse.json({
      isActive: false,
      priority: 0,
    });
  } catch (error) {
    console.error('Error checking priority video for display:', error);
    return NextResponse.json(
      { error: 'Failed to check priority video status' },
      { status: 500 }
    );
  }
}