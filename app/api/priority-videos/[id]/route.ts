import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import {
  updatePriorityVideo,
  deletePriorityVideo,
} from '@/lib/helpers/priorityVideoHelpers';
import PriorityVideoModel from '@/lib/models/PriorityVideo';

// GET /api/priority-videos/[id] - Get a specific priority video
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const resolvedParams = await params;
    const priorityVideo = await PriorityVideoModel.findById(resolvedParams.id)
      .populate('creator_id', 'name email')
      .populate('displays', 'name');

    if (!priorityVideo) {
      return NextResponse.json(
        { error: 'Priority video not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ priorityVideo });
  } catch (error) {
    console.error('Error fetching priority video:', error);
    return NextResponse.json(
      { error: 'Failed to fetch priority video' },
      { status: 500 }
    );
  }
}

// PUT /api/priority-videos/[id] - Update a priority video
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const resolvedParams = await params;
    const body = await request.json();

    const priorityVideo = await updatePriorityVideo(resolvedParams.id, body);

    if (!priorityVideo) {
      return NextResponse.json(
        { error: 'Priority video not found or update failed' },
        { status: 404 }
      );
    }

    return NextResponse.json({ priorityVideo });
  } catch (error) {
    console.error('Error updating priority video:', error);
    return NextResponse.json(
      { error: 'Failed to update priority video' },
      { status: 500 }
    );
  }
}

// DELETE /api/priority-videos/[id] - Delete a priority video
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const resolvedParams = await params;
    const success = await deletePriorityVideo(resolvedParams.id);

    if (!success) {
      return NextResponse.json(
        { error: 'Priority video not found or delete failed' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Priority video deleted successfully' });
  } catch (error) {
    console.error('Error deleting priority video:', error);
    return NextResponse.json(
      { error: 'Failed to delete priority video' },
      { status: 500 }
    );
  }
}