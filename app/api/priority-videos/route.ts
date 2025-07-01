import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import {
  getAllPriorityVideos,
  createPriorityVideo,
} from '@/lib/helpers/priorityVideoHelpers';
import { requireAuth } from '@/lib/auth';

// GET /api/priority-videos - Get all priority videos
export async function GET(request: NextRequest) {
  try {
    // Note: For App Router, we'll use a simpler auth check
    // In production, you'd want to implement proper NextAuth.js integration
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const priorityVideos = await getAllPriorityVideos();

    return NextResponse.json({ priorityVideos });
  } catch (error) {
    console.error('Error fetching priority videos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch priority videos' },
      { status: 500 }
    );
  }
}

// POST /api/priority-videos - Create a new priority video
export async function POST(request: NextRequest) {
  try {
    // Note: For App Router, we'll use a simpler auth check
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const body = await request.json();

    // Validate required fields
    if (!body.url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    if (!body.schedule || !body.schedule.timeSlots || body.schedule.timeSlots.length === 0) {
      return NextResponse.json(
        { error: 'Schedule with at least one time slot is required' },
        { status: 400 }
      );
    }

    // For testing, we'll use a dummy user ID
    // In production, extract from JWT token
    const priorityVideo = await createPriorityVideo(body, '507f1f77bcf86cd799439011');

    if (!priorityVideo) {
      return NextResponse.json(
        { error: 'Failed to create priority video' },
        { status: 500 }
      );
    }

    return NextResponse.json({ priorityVideo }, { status: 201 });
  } catch (error) {
    console.error('Error creating priority video:', error);
    return NextResponse.json(
      { error: 'Failed to create priority video' },
      { status: 500 }
    );
  }
}