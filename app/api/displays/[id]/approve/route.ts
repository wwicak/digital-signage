import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Display from '@/lib/models/Display'
import { requireAuth } from '@/lib/auth'
import { hasPermission } from '@/lib/helpers/rbac_helper'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const ConfigurationSchema = z.object({
  location: z.string().min(1).max(100),
  building: z.string().min(1).max(100),
  layout: z.string().optional(),
  orientation: z.enum(['landscape', 'portrait']).default('landscape'),
  statusBar: z.object({
    enabled: z.boolean().default(true),
    elements: z.array(z.string()).default(['clock', 'wifi'])
  }).optional(),
  settings: z.object({
    volume: z.number().min(0).max(100).default(70),
    brightness: z.number().min(0).max(100).default(100),
    autoRestart: z.boolean().default(true),
    allowRemoteControl: z.boolean().default(true)
  }).optional()
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect()

    const { id: displayId } = await params
    const user = await requireAuth(request)

    // Check if user has permission to configure displays
    if (!hasPermission(user, { action: 'update', resource: 'display' })) {
      return NextResponse.json(
        { error: 'Access denied: Cannot configure displays' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parseResult = ConfigurationSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parseResult.error.errors },
        { status: 400 }
      )
    }

    const data = parseResult.data

    // Find the pending display
    const display = await Display.findById(displayId)
    if (!display) {
      return NextResponse.json(
        { error: 'Display not found' },
        { status: 404 }
      )
    }

    if (display.registrationStatus !== 'configured') {
      return NextResponse.json(
        { error: 'Display must be configured to update' },
        { status: 400 }
      )
    }

    // Update the display configuration
    await Display.findByIdAndUpdate(displayId, {
      configuredBy: user._id,
      configuredAt: new Date(),
      location: data.location,
      building: data.building,
      layout: data.layout || display.layout,
      orientation: data.orientation || display.orientation,
      statusBar: {
        enabled: data.statusBar?.enabled ?? display.statusBar?.enabled ?? true,
        elements: data.statusBar?.elements ?? display.statusBar?.elements ?? ['clock', 'wifi']
      },
      settings: {
        volume: data.settings?.volume ?? display.settings?.volume ?? 70,
        brightness: data.settings?.brightness ?? display.settings?.brightness ?? 100,
        autoRestart: data.settings?.autoRestart ?? display.settings?.autoRestart ?? true,
        allowRemoteControl: data.settings?.allowRemoteControl ?? display.settings?.allowRemoteControl ?? true
      }
    })

    const updatedDisplay = await Display.findById(displayId)

    return NextResponse.json({
      success: true,
      message: 'Display updated successfully',
      display: updatedDisplay
    })

  } catch (error) {
    console.error('Display approval error:', error)
    return NextResponse.json(
      { error: 'Failed to process display approval' },
      { status: 500 }
    )
  }
}

// Get all displays for admin management
export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    const user = await requireAuth(request)

    // Check if user has permission to read displays
    if (!hasPermission(user, { action: 'read', resource: 'display' })) {
      return NextResponse.json(
        { error: 'Access denied: Cannot view displays' },
        { status: 403 }
      )
    }

    const displays = await Display.find({
      registrationStatus: 'configured'
    }).sort({ creation_date: -1 })

    return NextResponse.json({
      displays,
      total: displays.length
    })

  } catch (error) {
    console.error('Error fetching displays:', error)
    return NextResponse.json(
      { error: 'Failed to fetch displays' },
      { status: 500 }
    )
  }
}