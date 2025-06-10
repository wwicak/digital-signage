'use client'

import React, { useState, useEffect, useCallback, Suspense, memo, useRef, useMemo } from 'react'
import { Grid3X3, Grid2X2, Edit, Monitor, Smartphone, Save, ArrowLeft, Eye, Maximize2, AlertCircle, X } from 'lucide-react'
import GridLayout, { Layout as RglLayout } from 'react-grid-layout'
import { useSearchParams, useRouter } from 'next/navigation'
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd'
import Link from 'next/link'

// Import react-grid-layout CSS
import 'react-grid-layout/css/styles.css'

// Using Tailwind-only styling for grid layout

import Frame from '../../components/Admin/Frame'
import EditableWidget from '../../components/Admin/EditableWidget'
import StatusBarElement from '../../components/Admin/StatusBarElement'
import WidthProvider from '../../components/Widgets/WidthProvider'
import DropdownButton from '../../components/DropdownButton'
import { Form, Switch } from '../../components/Form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { StatusBarElementTypes } from '../../helpers/statusbar'
import Widgets from '../../widgets'
import { useWidgetChoices } from '../../hooks/useAvailableWidgets'
import { useLayout } from '../../hooks/useLayout'
import { useLayouts } from '../../hooks/useLayouts'
import { useLayoutMutations } from '../../hooks/useLayoutMutations'
import { addWidgetToLayout, updateWidgetPositions, removeWidgetFromLayout } from '../../actions/layouts'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getWidget } from '../../actions/widgets'

import { WidgetType } from '../../lib/models/Widget'

const GridLayoutWithWidth = WidthProvider(GridLayout as any)

// Helper function to convert string to WidgetType enum
const getWidgetType = (typeString: string): WidgetType => {
  // Map string types to enum values
  const typeMap: Record<string, WidgetType> = {
    'announcement': WidgetType.ANNOUNCEMENT,
    'congrats': WidgetType.CONGRATS,
    'image': WidgetType.IMAGE,
    'list': WidgetType.LIST,
    'media-player': WidgetType.MEDIA_PLAYER,
    'meeting-room': WidgetType.MEETING_ROOM,
    'slideshow': WidgetType.SLIDESHOW,
    'weather': WidgetType.WEATHER,
    'web': WidgetType.WEB,
    'youtube': WidgetType.YOUTUBE,
  }

  // Return mapped type or use EMPTY as default for unknown types
  return typeMap[typeString?.toLowerCase()] || WidgetType.EMPTY
}

// Fallback component for broken widgets
const BrokenWidget = memo(function BrokenWidget({
  widgetId,
  onDelete
}: {
  widgetId: string
  onDelete: (id: string) => void
}) {
  const handleDelete = useCallback(() => onDelete(widgetId), [onDelete, widgetId])

  return (
    <div className='group relative bg-red-50 border border-red-200 rounded-lg p-4 h-full'>
      <div className='absolute top-2 right-2 flex space-x-1 controls no-drag z-10'>
        <button
          className='p-2 rounded hover:bg-red-100 transition-colors bg-white/90 backdrop-blur-sm shadow-sm hover:bg-red-50 hover:text-red-600'
          onClick={handleDelete}
          aria-label='Delete broken widget'
        >
          <X className='w-4 h-4 text-red-500' />
        </button>
      </div>
      <div className='flex flex-col items-center justify-center h-full min-h-24'>
        <AlertCircle className='w-8 h-8 text-red-500 mb-2' />
        <span className='text-sm font-medium text-red-600 text-center'>
          Broken Widget
        </span>
        <span className='text-xs text-red-500 text-center mt-1'>
          ID: {widgetId.slice(0, 8)}...
        </span>
      </div>
    </div>
  )
})

// Memoized widget component to prevent unnecessary re-renders
const LayoutWidget = memo(function LayoutWidget({
  widgetId,
  widgetType,
  layoutType,
  isDeleting,
  onDelete
}: {
  widgetId: string
  widgetType: string
  layoutType: 'spaced' | 'compact'
  isDeleting: boolean
  onDelete: (id: string) => void
}) {
  const handleDelete = useCallback(() => onDelete(widgetId), [onDelete, widgetId])

  // If widget type is unknown or invalid, show broken widget component
  if (!widgetType || widgetType === 'unknown') {
    return <BrokenWidget widgetId={widgetId} onDelete={handleDelete} />
  }

  try {
    return (
      <div className={`w-full h-full ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}>
        <EditableWidget
          id={widgetId}
          type={getWidgetType(widgetType)}
          layout={layoutType}
          onDelete={handleDelete}
        />
      </div>
    )
  } catch (error) {
    console.error('Error rendering widget:', error)
    return <BrokenWidget widgetId={widgetId} onDelete={handleDelete} />
  }
})

const LayoutAdminContent = memo(function LayoutAdminContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlLayoutId = searchParams?.get('id') || null

  // State for selected layout (can be from URL or dropdown)
  const [selectedLayoutId, setSelectedLayoutId] = useState<string | null>(urlLayoutId)
  const [invalidWidgetsCount, setInvalidWidgetsCount] = useState<number>(0)
  const isEditing = !!selectedLayoutId

  const { data: existingLayout, isLoading: layoutLoading, refetch: refetchLayout } = useLayout(selectedLayoutId)
  const { data: layoutsResponse, isLoading: layoutsLoading } = useLayouts({ limit: 100 })
  const { createLayout, updateLayout, createLayoutAsync, updateLayoutAsync, isCreating, isUpdating } = useLayoutMutations()
  const { widgetChoices, isLoading: widgetChoicesLoading } = useWidgetChoices()

  // Layout state - simplified for form data
  const [layoutData, setLayoutData] = useState({
    name: '',
    description: '',
    orientation: 'landscape' as 'landscape' | 'portrait',
    layoutType: 'spaced' as 'spaced' | 'compact',
    statusBar: {
      enabled: true,
      elements: [] as string[],
    },
    isActive: true,
    isTemplate: true,
    gridConfig: {
      cols: 16,
      rows: 9,
      margin: [12, 12] as [number, number],
      rowHeight: 60,
    },
  })

  // Track if layout has been saved (needed for widget operations)
  const [savedLayoutId, setSavedLayoutId] = useState<string | null>(selectedLayoutId)

  // Debouncing for layout changes to improve performance
  const layoutChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Loading states for better UX
  const [isAddingWidget, setIsAddingWidget] = useState(false)
  const [isDeletingWidget, setIsDeletingWidget] = useState<string | null>(null)

  // Load existing layout data when editing
  useEffect(() => {
    if (existingLayout && isEditing) {
      setLayoutData({
        name: existingLayout.name,
        description: existingLayout.description || '',
        orientation: existingLayout.orientation,
        layoutType: existingLayout.layoutType,
        statusBar: existingLayout.statusBar,
        isActive: existingLayout.isActive,
        isTemplate: existingLayout.isTemplate,
        gridConfig: existingLayout.gridConfig || {
          cols: 16,
          rows: 9,
          margin: [12, 12],
          rowHeight: 60,
        },
      })
      setSavedLayoutId(existingLayout._id as string)

      // Preload widget data for faster configuration dialog opening
      preloadWidgetData(existingLayout.widgets || [])
    }
  }, [existingLayout, isEditing])

  // Preload widget data to cache for faster configuration dialog opening
  const preloadWidgetData = useCallback(async (widgets: any[]) => {
    const preloadPromises = widgets.map(async (widget) => {
      let widgetId: string | null = null

      // Handle different widget_id formats
      if (typeof widget.widget_id === 'string') {
        widgetId = widget.widget_id
      } else if (widget.widget_id && typeof widget.widget_id === 'object') {
        // If widget_id is populated, use the _id from the populated object
        widgetId = (widget.widget_id as any)._id?.toString() || (widget.widget_id as any).toString()
      }

      // Only try to preload if we have a valid widget ID
      if (widgetId && /^[0-9a-fA-F]{24}$/.test(widgetId)) {
        try {
          // This will cache the widget data
          await getWidget(widgetId)
        } catch (error) {
          // Silently fail for preloading - user will see error when they actually open the dialog
          console.warn(`Failed to preload widget data for ${widgetId}:`, error)
        }
      } else {
        console.warn('Skipping preload for invalid widget ID:', widgetId, 'from widget:', widget)
      }
    })

    // Don't await all - let them load in background
    Promise.allSettled(preloadPromises)
  }, [])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (layoutChangeTimeoutRef.current) {
        clearTimeout(layoutChangeTimeoutRef.current)
      }
    }
  }, [])

  // Handle layout selection from dropdown
  const handleLayoutSelect = (layoutId: string) => {
    if (layoutId === 'new') {
      // Create new layout
      setSelectedLayoutId(null)
      setSavedLayoutId(null)
      setLayoutData({
        name: '',
        description: '',
        orientation: 'landscape' as 'landscape' | 'portrait',
        layoutType: 'spaced' as 'spaced' | 'compact',
        statusBar: {
          enabled: true,
          elements: [] as string[],
        },
        isActive: true,
        isTemplate: true,
        gridConfig: {
          cols: 16,
          rows: 9,
          margin: [12, 12] as [number, number],
          rowHeight: 60,
        },
      })
    } else {
      // Select existing layout
      setSelectedLayoutId(layoutId)
      // Update URL to reflect selection
      router.replace(`/layout-admin?id=${layoutId}`, { scroll: false })
    }
  }

  const handleAddWidget = async (type: string): Promise<void> => {
    if (isAddingWidget) return // Prevent multiple simultaneous additions

    setIsAddingWidget(true)
    try {
      // If we're creating a new layout, save it first
      if (!savedLayoutId && !isEditing) {
        if (!layoutData.name.trim()) {
          alert('Please enter a layout name before adding widgets')
          return
        }

        try {
          const newLayout = await createLayoutAsync({ ...layoutData, widgets: [] } as any)
          setSavedLayoutId(newLayout._id as string)
          setSelectedLayoutId(newLayout._id as string)
          // Update URL to reflect the new layout
          router.replace(`/layout-admin?id=${newLayout._id}`, { scroll: false })
        } catch (error) {
          console.error('Failed to save layout:', error)
          alert('Failed to save layout. Please try again.')
          return
        }
      }

      const currentLayoutId = savedLayoutId || selectedLayoutId
      if (!currentLayoutId) {
        alert('Unable to add widget. Please try again.')
        return
      }

    const widgetDefinition = Widgets[type]

    // Find a good position for the new widget
    const existingPositions = existingLayout?.widgets?.map(w => ({ x: w.x, y: w.y, w: w.w, h: w.h })) || []
    let bestPosition = { x: 0, y: 0 }
    const widgetSize = { w: widgetDefinition?.defaultSize?.w || 4, h: widgetDefinition?.defaultSize?.h || 2 }

    // Simple placement algorithm - find first available spot
    for (let y = 0; y < layoutData.gridConfig.rows; y++) {
      for (let x = 0; x <= layoutData.gridConfig.cols - widgetSize.w; x++) {
        const wouldOverlap = existingPositions.some(pos =>
          x < pos.x + pos.w && x + widgetSize.w > pos.x &&
          y < pos.y + pos.h && y + widgetSize.h > pos.y
        )
        if (!wouldOverlap) {
          bestPosition = { x, y }
          break
        }
      }
      if (bestPosition.x !== 0 || bestPosition.y !== 0) break
    }

    try {
      await addWidgetToLayout(currentLayoutId, {
        type: type as WidgetType,
        name: `${type} Widget`,
        x: bestPosition.x,
        y: bestPosition.y,
        w: widgetSize.w,
        h: widgetSize.h,
        data: widgetDefinition?.defaultData || {},
      })

        // Refresh layout data without full page reload
        await refetchLayout()
      } catch (error) {
        console.error('Failed to add widget:', error)
        alert('Failed to add widget. Please try again.')
      }
    } finally {
      setIsAddingWidget(false)
    }
  }

  const handleDeleteWidget = async (widgetId: string): Promise<void> => {
    if (!savedLayoutId || isDeletingWidget) {
      return
    }

    setIsDeletingWidget(widgetId)
    try {
      await removeWidgetFromLayout(savedLayoutId, widgetId)
      // Refresh layout data without full page reload
      await refetchLayout()
    } catch (error) {
      console.error('Failed to delete widget:', error)
      alert('Failed to delete widget. Please try again.')
    } finally {
      setIsDeletingWidget(null)
    }
  }

  // Helper function to extract widget ID consistently
  const getWidgetId = useCallback((widget: any): string | null => {
    if (typeof widget.widget_id === 'string') {
      return widget.widget_id
    } else if (widget.widget_id && typeof widget.widget_id === 'object') {
      return (widget.widget_id as any)._id?.toString() || (widget.widget_id as any).toString()
    }
    return null
  }, [])

  // Auto-arrange widgets to optimize space usage
  const handleAutoArrange = useCallback(async (): Promise<void> => {
    if (!existingLayout?.widgets || existingLayout.widgets.length === 0) {
      return
    }

    // Simple auto-arrange algorithm: pack widgets from top-left
    const arrangedWidgets = existingLayout.widgets.map((widget, index) => {
      const cols = layoutData.gridConfig.cols
      const widgetWidth = widget.w
      const widgetHeight = widget.h

      // Calculate position based on index and widget size
      const widgetsPerRow = Math.floor(cols / widgetWidth)
      const row = Math.floor(index / widgetsPerRow)
      const col = (index % widgetsPerRow) * widgetWidth

      return {
        widget_id: widget.widget_id._id || widget.widget_id,
        x: col,
        y: row * widgetHeight,
        w: widgetWidth,
        h: widgetHeight,
      }
    })

    try {
      await updateWidgetPositions(savedLayoutId!, arrangedWidgets as any)
      await refetchLayout()
    } catch (error) {
      console.error('Failed to auto-arrange widgets:', error)
      alert('Failed to auto-arrange widgets. Please try again.')
    }
  }, [existingLayout?.widgets, layoutData.gridConfig, savedLayoutId, refetchLayout])

  // Drag and resize event handlers with improved feedback
  const handleDragStart = useCallback((layout: RglLayout[], oldItem: RglLayout, newItem: RglLayout) => {
    console.log('🎯 [DRAG] Started for widget:', newItem.i, 'at position:', oldItem.x, oldItem.y)
    // Add visual feedback for drag start
    const element = document.querySelector(`[data-grid='${newItem.i}']`)
    if (element) {
      element.classList.add('dragging-active')
    }
  }, [])

  const handleDrag = useCallback((layout: RglLayout[], oldItem: RglLayout, newItem: RglLayout) => {
    console.log('🎯 [DRAG] Moving widget:', newItem.i, 'from', oldItem.x, oldItem.y, 'to', newItem.x, newItem.y)
  }, [])

  const handleResizeStart = useCallback((layout: RglLayout[], oldItem: RglLayout, newItem: RglLayout) => {
    console.log('📏 [RESIZE] Started for widget:', newItem.i, 'size:', oldItem.w, 'x', oldItem.h)
    // Add visual feedback for resize start
    const element = document.querySelector(`[data-grid='${newItem.i}']`)
    if (element) {
      element.classList.add('resizing-active')
    }
  }, [])

  const handleResize = useCallback((layout: RglLayout[], oldItem: RglLayout, newItem: RglLayout) => {
    console.log('📏 [RESIZE] Resizing widget:', newItem.i, 'from', oldItem.w, 'x', oldItem.h, 'to', newItem.w, 'x', newItem.h)
  }, [])

  const handleLayoutChange = useCallback((layout: RglLayout[]): void => {
    if (!savedLayoutId || !existingLayout?.widgets || layout.length === 0) {
      console.log('Skipping layout change - missing requirements:', {
        savedLayoutId: !!savedLayoutId,
        hasWidgets: !!existingLayout?.widgets,
        layoutLength: layout.length
      })
      return
    }

    // Clear existing timeout
    if (layoutChangeTimeoutRef.current) {
      clearTimeout(layoutChangeTimeoutRef.current)
    }

    // Debounce the layout update to improve performance
    layoutChangeTimeoutRef.current = setTimeout(async () => {
      console.log('Processing layout change with', layout.length, 'items')

      // Prepare position updates
      const positionUpdates = layout.map(layoutItem => {
        const widgetId = layoutItem.i
        const widget = existingLayout.widgets.find((w: any) => {
          const wId = getWidgetId(w)
          return wId === widgetId
        })

        if (widget) {
          return {
            widget_id: widgetId,
            x: Math.max(0, layoutItem.x),
            y: Math.max(0, layoutItem.y),
            w: Math.max(1, layoutItem.w),
            h: Math.max(1, layoutItem.h),
          }
        } else {
          console.warn('Widget not found for layout item:', layoutItem)
          return null
        }
      }).filter(Boolean)

      if (positionUpdates.length === 0) {
        console.warn('No valid position updates to save')
        return
      }

      try {
        console.log('Saving position updates:', positionUpdates)
        await updateWidgetPositions(savedLayoutId, positionUpdates as any)
        console.log('Successfully updated widget positions')
      } catch (error) {
        console.error('Failed to update widget positions:', error)
      }
    }, 500) // 500ms debounce
  }, [savedLayoutId, existingLayout?.widgets, getWidgetId])

  const handleDragStop = useCallback((layout: RglLayout[], oldItem: RglLayout, newItem: RglLayout) => {
    console.log('🎯 [DRAG] Stopped for widget:', newItem.i, 'final position:', newItem.x, newItem.y)

    // Clean up visual feedback
    const element = document.querySelector(`[data-grid='${newItem.i}']`)
    if (element) {
      element.classList.remove('dragging-active')
    }

    // Trigger layout change handling
    handleLayoutChange(layout)
  }, [handleLayoutChange])

  const handleResizeStop = useCallback((layout: RglLayout[], oldItem: RglLayout, newItem: RglLayout) => {
    console.log('📏 [RESIZE] Stopped for widget:', newItem.i, 'final size:', newItem.w, 'x', newItem.h)

    // Clean up visual feedback
    const element = document.querySelector(`[data-grid='${newItem.i}']`)
    if (element) {
      element.classList.remove('resizing-active')
    }

    // Trigger layout change handling
    handleLayoutChange(layout)
  }, [handleLayoutChange])

  const handleDragEnd = (result: DropResult): void => {
    if (!result.destination) {
      return
    }

    const newElements = [...layoutData.statusBar.elements]
    const [removed] = newElements.splice(result.source.index, 1)
    newElements.splice(result.destination.index, 0, removed)

    setLayoutData(prev => ({
      ...prev,
      statusBar: {
        ...prev.statusBar,
        elements: newElements
      }
    }))
  }

  const handleAddStatusBarItem = (type: string): void => {
    setLayoutData(prev => ({
      ...prev,
      statusBar: {
        ...prev.statusBar,
        elements: [...prev.statusBar.elements, type]
      }
    }))
  }

  const handleRemoveStatusBarItem = (index: number): void => {
    setLayoutData(prev => ({
      ...prev,
      statusBar: {
        ...prev.statusBar,
        elements: prev.statusBar.elements.filter((_, i) => i !== index)
      }
    }))
  }

  const handleLayoutTypeChange = (name: string, checked: boolean): void => {
    const newLayoutType = checked ? 'spaced' : 'compact'
    setLayoutData(prev => ({
      ...prev,
      layoutType: newLayoutType,
      gridConfig: {
        ...prev.gridConfig,
        margin: newLayoutType === 'spaced' ? [12, 12] : [6, 6]
      }
    }))
  }

  const handleOrientationChange = (name: string, checked: boolean): void => {
    const newOrientation = checked ? 'portrait' : 'landscape'
    setLayoutData(prev => ({
      ...prev,
      orientation: newOrientation,
      gridConfig: {
        ...prev.gridConfig,
        cols: newOrientation === 'portrait' ? 9 : 16,
        rows: newOrientation === 'portrait' ? 16 : 9,
        rowHeight: newOrientation === 'portrait' ? 40 : 60
      }
    }))
  }

  const handleSave = async (): Promise<void> => {
    try {
      if (isEditing && selectedLayoutId) {
        updateLayout({ id: selectedLayoutId, data: layoutData as any })
        router.push('/layouts')
      } else {
        const newLayout = await createLayoutAsync({ ...layoutData, widgets: [] } as any)
        setSavedLayoutId(newLayout._id as string)
        setSelectedLayoutId(newLayout._id as string)
        // Update URL to reflect the new layout
        router.replace(`/layout-admin?id=${newLayout._id}`, { scroll: false })
        alert('Layout saved! You can now add widgets to your layout.')
      }
    } catch (error) {
      console.error('Failed to save layout:', error)
      alert('Failed to save layout. Please try again.')
    }
  }

  const rglLayout: RglLayout[] = useMemo(() => {
    if (!existingLayout?.widgets) return []

    let invalidCount = 0
    const validWidgets = existingLayout.widgets.filter((widget) => {
      const widgetId = getWidgetId(widget)
      const isValid = widgetId && /^[0-9a-fA-F]{24}$/.test(widgetId)
      if (!isValid) {
        invalidCount++
        console.warn('Invalid widget found:', widget)
      }
      return isValid
    })

    setInvalidWidgetsCount(invalidCount)

    return validWidgets.map((widget) => {
      const widgetId = getWidgetId(widget)!

      return {
        i: widgetId, // Use actual widget ID as the grid item ID
        x: widget.x || 0,
        y: widget.y || 0,
        w: widget.w || 4,
        h: widget.h || 2,
      }
    })
  }, [existingLayout?.widgets, getWidgetId])

  // Memoize choices to prevent unnecessary re-renders
  const statusBarChoices = useMemo(() =>
    Object.keys(StatusBarElementTypes).map(key => {
      const elType = StatusBarElementTypes[key as keyof typeof StatusBarElementTypes]
      return {
        key: key,
        name: elType.name,
        icon: elType.icon,
      }
    }), []
  )

  const layoutOptions = useMemo(() =>
    layoutsResponse?.layouts?.map((layout: any) => ({
      id: layout._id,
      name: layout.name,
      widgetCount: layout.widgets?.length || 0,
      orientation: layout.orientation,
      layoutType: layout.layoutType
    })) || [], [layoutsResponse?.layouts]
  )

  if (layoutLoading || (selectedLayoutId && layoutsLoading)) {
    return (
      <Frame loggedIn={true}>
        <div className='flex items-center justify-center min-h-[400px]'>
          <div className='text-center'>
            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4'></div>
            <p className='text-muted-foreground'>
              {layoutLoading ? 'Loading layout...' : 'Loading layouts...'}
            </p>
          </div>
        </div>
      </Frame>
    )
  }

  return (
    <Frame loggedIn={true}>
      {/* Header */}
      <div className='flex items-center justify-between mb-6'>
        <div className='flex items-center space-x-4'>
          <Link href='/layouts'>
            <Button variant='outline' size='sm'>
              <ArrowLeft className='mr-2 h-4 w-4' />
              Back to Layouts
            </Button>
          </Link>
          <div>
            <h1 className='text-3xl font-bold'>
              {isEditing ? 'Edit Layout' : 'Create Layout'}
            </h1>
            <p className='text-muted-foreground'>
              {isEditing ? 'Modify your layout template' : 'Design a new layout template for your displays'}
            </p>
          </div>
        </div>

        <div className='flex items-center space-x-2'>
          {isEditing && (
            <Button
              variant='outline'
              onClick={() => window.open(`/layout-preview?id=${selectedLayoutId}`, '_blank')}
            >
              <Eye className='mr-2 h-4 w-4' />
              Preview
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={isCreating || isUpdating || !layoutData.name.trim()}
          >
            <Save className='mr-2 h-4 w-4' />
            {isCreating || isUpdating ? 'Saving...' : 'Save Layout'}
          </Button>
        </div>
      </div>

      {/* Layout Selector */}
      <Card className='mb-6'>
        <CardHeader>
          <CardTitle>Layout Selection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex items-center space-x-4'>
            <div className='flex-1'>
              <label className='text-sm font-medium mb-2 block'>
                Choose Layout to Edit or Create New
              </label>
              <Select
                value={selectedLayoutId || 'new'}
                onValueChange={handleLayoutSelect}
                disabled={layoutsLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder='Select a layout to edit or create new' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='new'>
                    <div className='flex items-center'>
                      <span className='font-medium'>Create New Layout</span>
                    </div>
                  </SelectItem>
                  {layoutOptions.map((layout) => (
                    <SelectItem key={layout.id} value={layout.id}>
                      <div className='flex flex-col'>
                        <span className='font-medium'>{layout.name}</span>
                        <span className='text-xs text-muted-foreground'>
                          {layout.widgetCount} widgets • {layout.orientation} • {layout.layoutType}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='text-sm text-muted-foreground'>
              {isEditing ? (
                <div className='flex items-center space-x-2'>
                  <div className='w-2 h-2 bg-green-500 rounded-full'></div>
                  <span>Editing existing layout</span>
                </div>
              ) : (
                <div className='flex items-center space-x-2'>
                  <div className='w-2 h-2 bg-blue-500 rounded-full'></div>
                  <span>Creating new layout</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Layout Settings */}
      <Card className='mb-6'>
        <CardHeader>
          <CardTitle>Layout Settings</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div>
              <label className='text-sm font-medium mb-2 block'>Layout Name</label>
              <Input
                placeholder='Enter layout name'
                value={layoutData.name}
                onChange={(e) => setLayoutData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <label className='text-sm font-medium mb-2 block'>Description</label>
              <Input
                placeholder='Enter description (optional)'
                value={layoutData.description}
                onChange={(e) => setLayoutData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Bar Configuration */}
      <Card className='mb-6'>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle>Status Bar</CardTitle>
            <DropdownButton
              icon={Edit}
              text='Add Status Bar Item'
              onSelect={handleAddStatusBarItem}
              choices={statusBarChoices}
            />
          </div>
        </CardHeader>
        <CardContent>
          {layoutData.statusBar.elements.length > 0 ? (
            <div className='bg-gray-300 rounded-lg h-16 min-h-16'>
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId='droppable-statusbar' direction='horizontal'>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      style={{
                        display: 'flex',
                        paddingTop: 8,
                        paddingBottom: 8,
                        paddingRight: 4,
                        paddingLeft: 4,
                        overflow: 'auto',
                        height: '100%',
                        boxSizing: 'border-box',
                      }}
                      {...provided.droppableProps}
                    >
                      {layoutData.statusBar.elements.map((item: string, index: number) => (
                        <StatusBarElement
                          key={`${item}-${index}`}
                          item={item}
                          index={index}
                          onDelete={() => handleRemoveStatusBarItem(index)}
                        />
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
          ) : (
            <p className='text-muted-foreground text-center py-4'>
              No status bar items added. Click &quot;Add Status Bar Item&quot; to get started.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Layout Controls */}
      <div className='relative z-30 flex flex-row items-center justify-between mb-4'>
        <div className='flex items-center space-x-4'>
          <DropdownButton
            icon={Edit}
            text={
              isAddingWidget ? 'Adding Widget...' :
              widgetChoicesLoading ? 'Loading Widgets...' :
              'Add Widget'
            }
            onSelect={handleAddWidget}
            choices={widgetChoices}
            disabled={widgetChoicesLoading || isAddingWidget}
          />
          <Button
            variant='outline'
            size='sm'
            onClick={handleAutoArrange}
            disabled={!existingLayout?.widgets || existingLayout.widgets.length === 0}
            className='flex items-center space-x-2'
          >
            <Maximize2 className='w-4 h-4' />
            <span>Auto-arrange</span>
          </Button>
          {!isEditing && !savedLayoutId && (
            <div className='text-sm text-muted-foreground bg-blue-50 px-3 py-2 rounded-md border border-blue-200'>
              💡 Enter a layout name and click &quot;Add Widget&quot; to save and start adding widgets
            </div>
          )}
        </div>
        <Form>
          <Switch
            name='layoutStyle'
            checkedLabel={'Compact'}
            uncheckedLabel={'Spaced'}
            checkedIcon={Grid2X2}
            uncheckedIcon={Grid3X3}
            checked={layoutData.layoutType === 'spaced'}
            onValueChange={handleLayoutTypeChange}
          />
          <Switch
            name='orientation'
            checkedLabel={'Portrait'}
            uncheckedLabel={'Landscape'}
            checkedIcon={Smartphone}
            uncheckedIcon={Monitor}
            checked={layoutData.orientation === 'portrait'}
            onValueChange={handleOrientationChange}
          />
        </Form>
      </div>

      {/* Layout Canvas */}
      <Card className='relative z-10'>
        <CardHeader>
          <CardTitle>Layout Canvas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='bg-gray-300 relative' style={{
            borderRadius: layoutData.layoutType === 'spaced' ? '8px' : '0px',
            aspectRatio: layoutData.orientation === 'portrait' ? '9/16' : '16/9',
            maxWidth: layoutData.orientation === 'portrait' ? '600px' : '100%',
            minHeight: layoutData.orientation === 'portrait' ? '800px' : '450px',
            margin: layoutData.orientation === 'portrait' ? '0 auto' : '0'
          }}>
            {/* Aspect ratio indicator */}
            <div className='absolute top-2 left-2 bg-black/20 text-white text-xs px-2 py-1 rounded backdrop-blur-sm z-10'>
              {layoutData.orientation === 'portrait' ? '9:16' : '16:9'} • {layoutData.gridConfig.cols}×{layoutData.gridConfig.rows}
            </div>

            {/* Warning banner for invalid widgets */}
            {invalidWidgetsCount > 0 && (
              <div className='absolute top-12 left-2 right-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3 z-20'>
                <div className='flex items-center space-x-2 text-yellow-800'>
                  <AlertCircle className='w-4 h-4' />
                  <span className='text-sm font-medium'>
                    {invalidWidgetsCount} widget{invalidWidgetsCount > 1 ? 's' : ''} {invalidWidgetsCount > 1 ? 'have' : 'has'} invalid references and {invalidWidgetsCount > 1 ? 'are' : 'is'} not displayed
                  </span>
                </div>
              </div>
            )}

            {(!existingLayout?.widgets || existingLayout.widgets.length === 0) ? (
              <div className='absolute inset-0 flex items-center justify-center'>
                <div className='text-center text-gray-500'>
                  <Grid3X3 className='mx-auto h-12 w-12 mb-4 opacity-50' />
                  <p className='text-lg font-medium'>No widgets added yet</p>
                  <p className='text-sm'>Click &quot;Add Widget&quot; to start designing your layout</p>
                </div>
              </div>
            ) : (
              <GridLayoutWithWidth
                layout={rglLayout}
                cols={layoutData.gridConfig.cols}
                onLayoutChange={handleLayoutChange}
                onDragStart={handleDragStart}
                onDrag={handleDrag}
                onDragStop={handleDragStop}
                onResizeStart={handleResizeStart}
                onResize={handleResize}
                onResizeStop={handleResizeStop}
                draggableCancel=".no-drag"
                draggableHandle=".drag-handle"
                resizeHandles={['se', 'sw', 'ne', 'nw', 's', 'n', 'e', 'w']}
                margin={layoutData.gridConfig.margin}
                rowHeight={layoutData.gridConfig.rowHeight}
                isBounded={true}
                useCSSTransforms={true}
                transformScale={1}
                preventCollision={false}
                compactType={null}
                maxRows={layoutData.gridConfig.rows}
                className="react-grid-layout w-full h-full"
                isDraggable={true}
                isResizable={true}
                autoSize={false}
                verticalCompact={false}
                allowOverlap={false}
                containerPadding={[0, 0]}
              >
                {existingLayout?.widgets?.filter((widget) => {
                  const widgetId = getWidgetId(widget)
                  const isValid = widgetId && /^[0-9a-fA-F]{24}$/.test(widgetId)

                  if (!isValid) {
                    console.warn('Filtering out invalid widget:', widget)
                  }

                  return isValid
                }).map((widget) => {
                  const widgetId = getWidgetId(widget)!
                  let widgetType = 'unknown'

                  // Extract widget type
                  if (typeof widget.widget_id === 'object' && widget.widget_id) {
                    widgetType = (widget.widget_id as any).type || 'unknown'
                  }

                  return (
                    <LayoutWidget
                      key={widgetId}
                      widgetId={widgetId}
                      widgetType={widgetType}
                      layoutType={layoutData.layoutType}
                      isDeleting={isDeletingWidget === widgetId}
                      onDelete={handleDeleteWidget}
                    />
                  )
                })}
              </GridLayoutWithWidth>
            )}
          </div>
        </CardContent>
      </Card>
    </Frame>
  )
})

export default function LayoutAdminPage() {
  return (
    <Suspense fallback={
      <Frame loggedIn={true}>
        <div className='flex items-center justify-center min-h-[400px]'>
          <div className='text-center'>
            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4'></div>
            <p className='text-muted-foreground'>Loading layout editor...</p>
          </div>
        </div>
      </Frame>
    }>
      <LayoutAdminContent />
    </Suspense>
  )
}