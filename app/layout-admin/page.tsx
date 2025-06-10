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

// Helper function to get widget ID
const getWidgetId = (widget: any): string | null => {
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
      setLayoutData({
        name: existingLayout.name || '',
        description: existingLayout.description || '',
        orientation: existingLayout.orientation || 'landscape',
        layoutType: existingLayout.layoutType || 'spaced',
        widgets: existingLayout.widgets || [],
        statusBar: existingLayout.statusBar || { enabled: true, elements: [] },
        isActive: existingLayout.isActive ?? true,
        isTemplate: existingLayout.isTemplate ?? true,
        gridConfig: {
          cols: existingLayout.gridConfig?.cols || 16,
          rows: existingLayout.gridConfig?.rows || 9,
          margin: existingLayout.gridConfig?.margin || [12, 12],
          rowHeight: existingLayout.gridConfig?.rowHeight || 60,
        },
      })
    }
  }, [existingLayout])

  // Convert layout widgets to GridStack items
  const gridStackItems: GridStackItem[] = useMemo(() => {
    if (!existingLayout?.widgets) return []

    return existingLayout.widgets
      .filter((widget) => {
        const widgetId = getWidgetId(widget)
        return widgetId && /^[0-9a-fA-F]{24}$/.test(widgetId)
      })
      .map((widget) => {
        const widgetId = getWidgetId(widget)!
        let widgetType = 'unknown'

        if (typeof widget.widget_id === 'object' && widget.widget_id) {
          widgetType = (widget.widget_id as any).type || 'unknown'
        }

        return {
          id: widgetId,
          x: widget.x || 0,
          y: widget.y || 0,
          w: widget.w || 2,
          h: widget.h || 2,
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
  }, [existingLayout?.widgets, layoutData.layoutType])

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

    try {
      // Add widget directly to layout with default position
      await addWidgetToLayout(savedLayoutId, {
        type: widgetType,
        name: `${widgetType.charAt(0).toUpperCase() + widgetType.slice(1)} Widget`,
        x: 0,
        y: 0,
        w: 2,
        h: 2,
        data: {},
      })
      
      await refetchLayout()
    } catch (error) {
      console.error('Failed to add widget:', error)
      alert('Failed to add widget. Please try again.')
    }
  }, [savedLayoutId, refetchLayout])

  // Handle layout changes from GridStack
  const handleLayoutChange = useCallback(async (items: GridStackItem[]) => {
    if (!savedLayoutId || !existingLayout?.widgets) return

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
    float: true,
    cellHeight: 'auto',
    margin: layoutData.gridConfig.margin[0],
    column: layoutData.gridConfig.cols,
    maxRow: layoutData.gridConfig.rows,
    resizable: {
      handles: 'se, sw, ne, nw, s, n, e, w'
    },
    draggable: {
      handle: '.gridstack-drag-handle',
      cancel: '.gridstack-no-drag'
    }
  }), [layoutData.gridConfig])

  if (layoutsLoading) {
    return (
      <Frame>
        <div className='flex items-center justify-center h-64'>
          <div className='text-center'>Loading layouts...</div>
        </div>
      </Frame>
    )
  }

  return (
    <Frame>
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
              <CardTitle>Layout Designer</CardTitle>
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
                  }}
                  label={layoutData.orientation === 'portrait' ? 'Portrait' : 'Landscape'}
                />
              </Form>
            </div>
          </div>

          {/* GridStack Canvas */}
          <div className='border border-gray-200 rounded-lg p-4 bg-gray-50 min-h-[600px] relative'>
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
                onDragStart={(event, element) => {
                  console.log('🎯 [DRAG] Started for widget:', element.getAttribute('gs-id'))
                }}
                onDragStop={(event, element) => {
                  console.log('🎯 [DRAG] Stopped for widget:', element.getAttribute('gs-id'))
                }}
                onResizeStart={(event, element) => {
                  console.log('📏 [RESIZE] Started for widget:', element.getAttribute('gs-id'))
                }}
                onResizeStop={(event, element) => {
                  console.log('📏 [RESIZE] Stopped for widget:', element.getAttribute('gs-id'))
                }}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </Frame>
  )
}

export default function LayoutAdmin() {
  return (
    <Suspense fallback={
      <Frame>
        <div className='flex items-center justify-center h-64'>
          <div className='text-center'>Loading...</div>
        </div>
      </Frame>
    }>
      <LayoutAdminContent />
    </Suspense>
  )
}
