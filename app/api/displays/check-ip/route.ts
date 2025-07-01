import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import DisplayModel from '@/lib/models/Display'
import DisplayStatusModel from '@/lib/models/DisplayStatus'

export async function GET(request: NextRequest) {
  try {
    await dbConnect()

    // Get IP address from headers (handles proxy scenarios)
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIP = request.headers.get('x-real-ip')
    
    // Priority: forwarded-for > real-ip > fallback
    const clientIP = forwardedFor?.split(',')[0].trim() || realIP || 'unknown'

    if (clientIP === 'unknown') {
      return NextResponse.json({
        exists: false,
        message: 'Unable to detect IP address'
      })
    }

    // Check if any display has this IP address in their status
    const displayStatus = await DisplayStatusModel.findOne({
      ipAddress: clientIP
    }).populate('displayId')

    if (displayStatus && displayStatus.displayId) {
      // Get the full display data with layout
      const display = await DisplayModel.findById(displayStatus.displayId)
        .populate('layout')
        .populate('widgets')
        .lean()

      if (display) {
        return NextResponse.json({
          exists: true,
          display: {
            _id: display._id,
            name: display.name,
            description: display.description,
            location: display.location,
            building: display.building,
            layout: display.layout,
            orientation: display.orientation,
            lastSeen: displayStatus.lastSeen,
            isOnline: displayStatus.isOnline
          },
          ipAddress: clientIP
        })
      }
    }

    // Also check for displays that might have been created recently but no status yet
    // This is a fallback - ideally all displays should have a status record
    
    return NextResponse.json({
      exists: false,
      ipAddress: clientIP,
      message: 'No display found for this IP address'
    })

  } catch (error) {
    console.error('Error checking display IP:', error)
    return NextResponse.json(
      { error: 'Failed to check display IP' },
      { status: 500 }
    )
  }
}

// Get all displays that can be selected (for dropdown)
export async function POST(request: NextRequest) {
  try {
    await dbConnect()

    const { searchTerm, includeOffline = false } = await request.json()

    // Build query
    const query: Record<string, unknown> = {}
    
    if (!includeOffline) {
      // Only get displays that are offline or haven't been seen recently
      const recentCutoff = new Date(Date.now() - 60 * 60 * 1000) // 1 hour
      
      const offlineStatuses = await DisplayStatusModel.find({
        $or: [
          { isOnline: false },
          { lastSeen: { $lt: recentCutoff } }
        ]
      }).select('displayId')
      
      const offlineDisplayIds = offlineStatuses.map(status => status.displayId)
      query._id = { $in: offlineDisplayIds }
    }

    if (searchTerm) {
      query.$or = [
        { name: { $regex: searchTerm, $options: 'i' } },
        { location: { $regex: searchTerm, $options: 'i' } },
        { building: { $regex: searchTerm, $options: 'i' } }
      ]
    }

    const displays = await DisplayModel.find(query)
      .populate('layout')
      .select('name location building orientation layout')
      .sort({ name: 1 })
      .lean()

    // Get status for each display
    const displayIds = displays.map(d => d._id)
    const statuses = await DisplayStatusModel.find({
      displayId: { $in: displayIds }
    }).lean()

    const statusMap = new Map(statuses.map(s => [s.displayId.toString(), s]))

    const displaysWithStatus = displays.map(display => {
      const status = statusMap.get(display._id.toString())
      return {
        ...display,
        isOnline: status?.isOnline || false,
        lastSeen: status?.lastSeen || null,
        ipAddress: status?.ipAddress || null
      }
    })

    return NextResponse.json({
      displays: displaysWithStatus,
      total: displaysWithStatus.length
    })

  } catch (error) {
    console.error('Error fetching available displays:', error)
    return NextResponse.json(
      { error: 'Failed to fetch available displays' },
      { status: 500 }
    )
  }
}