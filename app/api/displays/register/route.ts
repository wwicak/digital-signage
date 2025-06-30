import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Display from '@/lib/models/Display'
import { getDefaultSystemUserId } from '@/lib/helpers/system_user'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Schema for display registration with layout
const DisplayRegistrationSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  layout: z.string().optional(), // Layout ID if provided
})

export async function POST(request: NextRequest) {
  try {
    await dbConnect()

    // Get client IP address
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIP = request.headers.get('x-real-ip')
    const clientIP = forwardedFor?.split(',')[0].trim() || realIP || 'unknown'

    const body = await request.json()
    const parseResult = DisplayRegistrationSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid display name', details: parseResult.error.errors },
        { status: 400 }
      )
    }

    const { name, layout } = parseResult.data

    // Check if display with this IP already exists
    const existingDisplay = await Display.findOne({ 
      registrationIP: clientIP
    })

    if (existingDisplay) {
      // Update existing display with new information if provided
      if (layout && layout !== existingDisplay.layout) {
        existingDisplay.layout = layout
        existingDisplay.last_update = new Date()
        await existingDisplay.save()
      }
      
      return NextResponse.json({
        success: true,
        status: 'configured',
        message: 'Display updated successfully',
        display: {
          _id: existingDisplay._id,
          name: existingDisplay.name,
          location: existingDisplay.location,
          building: existingDisplay.building,
          layout: existingDisplay.layout,
          orientation: existingDisplay.orientation,
          registrationStatus: 'configured'
        }
      })
    }


    // Get system user ID for display registrations
    const systemUserId = getDefaultSystemUserId()

    // Create new display registration
    const newDisplay = new Display({
      name,
      description: `Display registered from ${clientIP}`,
      location: 'Unknown Location',
      building: 'Main Building',
      layout: layout || 'spaced', // Use provided layout or default
      orientation: 'landscape',
      registrationStatus: 'configured', // Directly configured and ready to use
      registrationIP: clientIP,
      creator_id: systemUserId,
      widgets: []
    })

    const savedDisplay = await newDisplay.save()

    return NextResponse.json({
      success: true,
      status: 'configured',
      message: 'Display registered successfully and ready to use.',
      display: {
        _id: savedDisplay._id,
        name: savedDisplay.name,
        location: savedDisplay.location,
        building: savedDisplay.building,
        layout: savedDisplay.layout,
        orientation: savedDisplay.orientation,
        registrationStatus: savedDisplay.registrationStatus
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Display registration error:', error)
    
    if (error instanceof Error) {
      if (error.name === 'ValidationError') {
        return NextResponse.json(
          { error: 'Invalid display data', details: error.message },
          { status: 400 }
        )
      }
      
      if (error.name === 'MongoError' && 'code' in error && (error as any).code === 11000) {
        return NextResponse.json(
          { error: 'Display name already exists' },
          { status: 409 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to register display' },
      { status: 500 }
    )
  }
}