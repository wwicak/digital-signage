'use client'

import React, { useState, useCallback, useRef, useEffect, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Grid3X3, Plus, Save, Trash2, RotateCcw, ArrowLeft } from 'lucide-react'

import Frame from '../../components/Admin/Frame'
import GridStackWrapper, { GridStackItem, GridStackWrapperRef } from '../../components/GridStack/GridStackWrapper'
import GridStackEditableWidget from '../../components/GridStack/GridStackEditableWidget'
import StatusBarElement from '../../components/Admin/StatusBarElement'
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

// Widget interface for layout widgets
interface LayoutWidget {
  widget_id: string | { _id: string } | null;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  [key: string]: unknown;
}

// Helper function to get widget ID
const getWidgetId = (widget: LayoutWidget): string | null => {
  if (typeof widget.widget_id === 'string') {
    return widget.widget_id
  }
  if (typeof widget.widget_id === 'object' && widget.widget_id?._id) {
    return widget.widget_id._id
  }
  return null
}

// Helper function to get widget type
const getWidgetType = (widgetType: string): WidgetType => {
  return Object.values(WidgetType).includes(widgetType as WidgetType) 
    ? (widgetType as WidgetType) 
    : WidgetType.SLIDESHOW
}

const BrokenWidget: React.FC<{ widgetId: string; onDelete: () => void }> = ({ widgetId, onDelete }) => (
  <div className='flex flex-col items-center justify-center h-full p-4 bg-red-50 border border-red-200 rounded'>
    <div className='text-red-600 mb-2'>⚠️</div>
    <div className='text-sm text-red-700 text-center mb-2'>
      Broken Widget
      <br />
      <span className='text-xs opacity-75'>ID: {widgetId}</span>
    </div>
    <Button size='sm' variant='destructive' onClick={onDelete}>
      Remove
    </Button>
  </div>
)

function LayoutAdminContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const gridRef = useRef<GridStackWrapperRef>(null)
  
  // Get layout ID from URL params
  const layoutIdFromUrl = searchParams?.get('id') || null
  const [selectedLayoutId, setSelectedLayoutId] = useState<string | null>(layoutIdFromUrl)
  const [savedLayoutId, setSavedLayoutId] = useState<string | null>(layoutIdFromUrl)
  const [isDeletingWidget, setIsDeletingWidget] = useState<string | null>(null)

  // Layout state
  const [layoutData, setLayoutData] = useState({
    name: '',
    description: '',
    orientation: 'landscape' as 'landscape' | 'portrait',
    layoutType: 'spaced' as 'spaced' | 'compact',
    widgets: [] as any[],
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

  // Hooks
  const { data: layouts, isLoading: layoutsLoading, refetch: refetchLayouts } = useLayouts()
  const { data: existingLayout, isLoading: layoutLoading, refetch: refetchLayout } = useLayout(savedLayoutId)
  const { createLayoutAsync, updateLayoutAsync } = useLayoutMutations()
  const { widgetChoices } = useWidgetChoices()

  // Update layout data when existing layout is loaded
  useEffect(() => {
    if (existingLayout) {
      // Preserve the current orientation from the local state
      const currentOrientation = layoutData.orientation;
      const currentGridConfig = layoutData.gridConfig;

      setLayoutData({
        name: existingLayout.name || '',
        description: existingLayout.description || '',
        // Use existingLayout.orientation only if it's the initial load (layoutData.name is empty)
        orientation: layoutData.name ? currentOrientation : existingLayout.orientation || 'landscape',
        layoutType: existingLayout.layoutType || 'spaced',
        widgets: existingLayout.widgets || [],
        statusBar: existingLayout.statusBar || { enabled: true, elements: [] },
        isActive: existingLayout.isActive ?? true,
        isTemplate: existingLayout.isTemplate ?? true,
        gridConfig: layoutData.name ? currentGridConfig : {
          cols: existingLayout.gridConfig?.cols || 16,
          rows: existingLayout.gridConfig?.rows || 9,
          margin: existingLayout.gridConfig?.margin || [12, 12],
          rowHeight: existingLayout.gridConfig?.rowHeight || 60,
        },
      })
    }
  }, [existingLayout])

  // Convert layout widgets to GridStack items
  // Convert layout widgets to GridStack items
  const gridStackItems: GridStackItem[] = useMemo(() => {
    if (!existingLayout?.widgets) {
      return []
    }

    const filteredWidgets = existingLayout.widgets.filter((widget) => {
      const widgetId = getWidgetId(widget)
      return widgetId && /^[0-9a-fA-F]{24}$/.test(widgetId)
    })

    // Simplified position validation - trust GridStack to handle collisions
    const items = filteredWidgets.map((widget, index) => {
      const widgetId = getWidgetId(widget)!
      let widgetType = 'unknown'

      if (typeof widget.widget_id === 'object' && widget.widget_id) {
        widgetType = (widget.widget_id as any).type || 'unknown'
      }

      // Basic validation only - let GridStack handle positioning
      const w = Math.max(1, Math.min(layoutData.gridConfig.cols, Math.floor(widget.w || 2)))
      const h = Math.max(1, Math.floor(widget.h || 2))
      const x = Math.max(0, Math.min(layoutData.gridConfig.cols - w, Math.floor(widget.x || 0)))
      const y = Math.max(0, Math.floor(widget.y || 0))

      return {
        id: widgetId,
        x: x,
        y: y,
        w: w,
        h: h,
        widgetType,
        content: (
          <GridStackEditableWidget
            id={widgetId}
            type={getWidgetType(widgetType)}
            layout={layoutData.layoutType}
            onDelete={() => handleDeleteWidget(widgetId)}
          />
        )
      }
    })
    
    return items
  }, [existingLayout?.widgets, layoutData.layoutType, layoutData.gridConfig.cols])
  // Handle layout selection
  const handleLayoutSelect = (layoutId: string) => {
    if (layoutId === 'new') {
      setSelectedLayoutId(null)
      setSavedLayoutId(null)
      setLayoutData({
        name: '',
        description: '',
        orientation: 'landscape',
        layoutType: 'spaced',
        widgets: [],
        statusBar: { enabled: true, elements: [] },
        isActive: true,
        isTemplate: true,
        gridConfig: { cols: 16, rows: 9, margin: [12, 12], rowHeight: 60 },
      })
    } else {
      setSelectedLayoutId(layoutId)
      setSavedLayoutId(layoutId) // This was missing!
      router.replace(`/layout-admin?id=${layoutId}`, { scroll: false })
    }
  }

  // Handle widget deletion
  const handleDeleteWidget = useCallback(async (widgetId: string) => {
    if (!savedLayoutId) return

    setIsDeletingWidget(widgetId)
    try {
      await removeWidgetFromLayout(savedLayoutId, widgetId)
      await refetchLayout()
    } catch (error) {
      console.error('Failed to delete widget:', error)
      alert('Failed to delete widget. Please try again.')
    } finally {
      setIsDeletingWidget(null)
    }
  }, [savedLayoutId, refetchLayout])

  // Handle adding new widget
  const handleAddWidget = useCallback(async (widgetType: WidgetType) => {
    if (!savedLayoutId) {
      alert('Please save the layout first before adding widgets.')
      return
    }
    
    if (!existingLayout) {
        alert('Could not read existing layout to determine widget position.');
        return;
    }

    const newWidgetSize = { w: 2, h: 2 };
    const { cols, rows } = layoutData.gridConfig;
    const widgets = existingLayout.widgets || [];
    const grid = Array(rows).fill(null).map(() => Array(cols).fill(false));

    widgets.forEach(widget => {
        const w = widget.w || 0;
        const h = widget.h || 0;
        const x = widget.x || 0;
        const y = widget.y || 0;
        for (let i = y; i < y + h && i < rows; i++) {
            for (let j = x; j < x + w && j < cols; j++) {
                grid[i][j] = true;
            }
        }
    });

    let position: {x: number, y: number} | null = null;

    for (let y = 0; y <= rows - newWidgetSize.h; y++) {
        for (let x = 0; x <= cols - newWidgetSize.w; x++) {
            let canPlace = true;
            for (let i = 0; i < newWidgetSize.h; i++) {
                for (let j = 0; j < newWidgetSize.w; j++) {
                    if (grid[y + i][x + j]) {
                        canPlace = false;
                        break;
                    }
                }
                if (!canPlace) break;
            }
            if (canPlace) {
                position = { x, y };
                break;
            }
        }
        if (position) break;
    }

    if (!position) {
        // Fallback: find the first empty cell for a 1x1 widget as a last resort
        let fallbackPosition: {x: number, y: number} | null = null;
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                if (!grid[y][x]) {
                    fallbackPosition = { x, y };
                    break;
                }
            }
            if (fallbackPosition) break;
        }

        if (fallbackPosition) {
            position = fallbackPosition;
        } else {
            alert('No available space for a new widget. Please make some room.');
            return;
        }
    }

    try {
      await addWidgetToLayout(savedLayoutId, {
        type: widgetType,
        name: `${widgetType.charAt(0).toUpperCase() + widgetType.slice(1)} Widget`,
        x: position.x,
        y: position.y,
        w: newWidgetSize.w,
        h: newWidgetSize.h,
        data: {},
      })
      
      await refetchLayout()
    } catch (error) {
      console.error('Failed to add widget:', error)
      alert('Failed to add widget. Please try again.')
    }
  }, [savedLayoutId, refetchLayout, existingLayout, layoutData.gridConfig])

  // Handle layout changes from GridStack
  const handleLayoutChange = useCallback(async (items: GridStackItem[]) => {
    if (!savedLayoutId || !existingLayout?.widgets) {
      return
    }

    try {
      const updatedWidgets = items.map(item => ({
        widget_id: item.id,
        x: item.x || 0,
        y: item.y || 0,
        w: item.w || 2,
        h: item.h || 2,
      }))

      await updateWidgetPositions(savedLayoutId, updatedWidgets)
    } catch (error) {
      console.error('Failed to update widget positions:', error)
    }
  }, [savedLayoutId, existingLayout?.widgets])

  // Handle save layout
  const handleSaveLayout = useCallback(async () => {
    try {
      if (savedLayoutId) {
        // Update existing layout
        await updateLayoutAsync({
          id: savedLayoutId,
          data: layoutData,
        })
      } else {
        // Create new layout
        const result = await createLayoutAsync(layoutData)
        setSavedLayoutId(result._id as string)
        router.replace(`/layout-admin?id=${result._id}`, { scroll: false })
      }
      
      await refetchLayouts()
      alert('Layout saved successfully!')
    } catch (error) {
      console.error('Failed to save layout:', error)
      alert('Failed to save layout. Please try again.')
    }
  }, [layoutData, savedLayoutId, createLayoutAsync, updateLayoutAsync, refetchLayouts, router])

  // Handle auto-arrange
  const handleAutoArrange = useCallback(() => {
    if (gridRef.current) {
      gridRef.current.autoArrange()
    }
  }, [])

  // GridStack options
  const gridStackOptions = useMemo(() => ({
    float: false, // Disable float to prevent collision detection infinite loops
    cellHeight: 'auto',
    margin: layoutData.gridConfig.margin[0],
    column: layoutData.gridConfig.cols,
    maxRow: layoutData.gridConfig.rows,
    minRow: 1,
    resizable: {
      handles: 'se, sw, ne, nw, s, n, e, w'
    },
    draggable: {
      handle: '.gridstack-drag-handle',
      cancel: '.gridstack-no-drag'
    },
    acceptWidgets: true,
    removable: false,
    animate: false, // Disable animations to prevent layout thrashing
    rtl: false,
  }), [layoutData.gridConfig])

  if (layoutsLoading) {
    return (
      <Frame loggedIn={true} title="Layout Designer">
        <div className='flex items-center justify-center h-64'>
          <div className='text-center'>Loading layouts...</div>
        </div>
      </Frame>
    )
  }

  return (
    <Frame loggedIn={true} title="Layout Designer">
      <div className='p-6'>
        <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-4'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => router.push('/layouts')}
              >
                <ArrowLeft className='w-4 h-4 mr-2' />
                Back to Layouts
              </Button>
            </div>
            <div className='flex items-center space-x-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={handleAutoArrange}
                disabled={!savedLayoutId || gridStackItems.length === 0}
              >
                <RotateCcw className='w-4 h-4 mr-2' />
                Auto Arrange
              </Button>
              <Button onClick={handleSaveLayout} disabled={!layoutData.name.trim()}>
                <Save className='w-4 h-4 mr-2' />
                Save Layout
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className='space-y-6'>
          {/* Layout Selection and Basic Info */}
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
            <div>
              <label className='block text-sm font-medium mb-2'>Select Layout</label>
              <Select value={selectedLayoutId || 'new'} onValueChange={handleLayoutSelect}>
                <SelectTrigger>
                  <SelectValue placeholder='Choose layout...' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='new'>Create New Layout</SelectItem>
                  {layouts?.layouts?.map((layout: any) => (
                    <SelectItem key={layout._id} value={layout._id}>
                      {layout.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className='block text-sm font-medium mb-2'>Layout Name</label>
              <Input
                value={layoutData.name}
                onChange={(e) => setLayoutData(prev => ({ ...prev, name: e.target.value }))}
                placeholder='Enter layout name...'
              />
            </div>

            <div>
              <label className='block text-sm font-medium mb-2'>Add Widget</label>
              <DropdownButton
                text="Add Widget"
                icon={Plus}
                disabled={!savedLayoutId}
                choices={widgetChoices.map((choice) => ({
                  key: choice.key,
                  name: choice.name,
                  icon: choice.icon,
                }))}
                onSelect={(key) => handleAddWidget(key as WidgetType)}
              />
            </div>

            <div>
              <label className='block text-sm font-medium mb-2'>Orientation</label>
              <Form>
                <Switch
                  name='orientation'
                  checked={layoutData.orientation === 'portrait'}
                  onValueChange={(name: string, checked: boolean) => {
                    const newOrientation = checked ? 'portrait' : 'landscape'
                    setLayoutData(prev => ({
                      ...prev,
                      orientation: newOrientation,
                      gridConfig: {
                        ...prev.gridConfig,
                        cols: newOrientation === 'portrait' ? 9 : 16,
                        rows: newOrientation === 'portrait' ? 16 : 9,
                        margin: newOrientation === 'portrait' ? [6, 6] : [12, 12],
                        rowHeight: newOrientation === 'portrait' ? 40 : 60,
                      }
                    }))

                    // Force GridStack to refresh after orientation change
                    setTimeout(() => {
                      if (gridRef.current) {
                        // Trigger a layout refresh
                        window.dispatchEvent(new Event('resize'))
                      }
                    }, 100)
                  }}
                  label={layoutData.orientation === 'portrait' ? 'Portrait' : 'Landscape'}
                />
              </Form>
            </div>
          </div>

          {/* GridStack Canvas */}
          <div className='border border-gray-200 rounded-lg p-4 bg-gray-50 relative'>
            {/* Canvas Info */}
            <div className='mb-4 flex items-center justify-between text-sm text-gray-600'>
              <div className='flex items-center space-x-4'>
                <span>Canvas: {layoutData.gridConfig.cols} × {layoutData.gridConfig.rows}</span>
                <span>Orientation: {layoutData.orientation}</span>
                <span>Margin: {layoutData.gridConfig.margin[0]}px</span>
              </div>
              <div className='text-xs text-gray-500'>
                {layoutData.orientation === 'portrait' ? '📱 Portrait Mode' : '🖥️ Landscape Mode'}
              </div>
            </div>

            {/* Canvas Container with Aspect Ratio */}
            <div
              className={`border-2 border-dashed border-gray-300 rounded-lg bg-white relative ${
                layoutData.orientation === 'portrait'
                  ? 'aspect-[9/16] max-h-[800px]'
                  : 'aspect-[16/9] min-h-[500px]'
              }`}
              style={{
                width: '100%',
                maxWidth: layoutData.orientation === 'portrait' ? '450px' : '100%',
                margin: '0 auto'
              }}
            >
              {(!existingLayout?.widgets || existingLayout.widgets.length === 0) ? (
                <div className='absolute inset-0 flex items-center justify-center'>
                  <div className='text-center text-gray-500'>
                    <Grid3X3 className='mx-auto h-12 w-12 mb-4 opacity-50' />
                    <p className='text-lg font-medium'>No widgets added yet</p>
                    <p className='text-sm'>Click "Add Widget" to start designing your layout</p>
                  </div>
                </div>
              ) : (
                <GridStackWrapper
                  ref={gridRef}
                  items={gridStackItems}
                  options={gridStackOptions}
                  onLayoutChange={handleLayoutChange}
                  className="h-full w-full"
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </Frame>
  )
}

export default function LayoutAdmin() {
  return (
    <Suspense fallback={
     <Frame loggedIn={true} title="Layout Designer">
       <div className='flex items-center justify-center h-64'>
         <div className='text-center'>Loading...</div>
       </div>
     </Frame>
    }>
      <LayoutAdminContent />
    </Suspense>
  )
}
