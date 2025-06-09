'use client'

import React, { useState, useEffect, useCallback, Suspense, memo } from 'react'
import { Grid3X3, Grid2X2, Edit, Monitor, Smartphone, Save, ArrowLeft, Eye } from 'lucide-react'
import GridLayout, { Layout as RglLayout } from 'react-grid-layout'
import { useSearchParams, useRouter } from 'next/navigation'
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd'
import Link from 'next/link'

import Frame from '../../components/Admin/Frame'
import EditableWidget from '../../components/Admin/EditableWidget'
import StatusBarElement from '../../components/Admin/StatusBarElement'
import WidthProvider from '../../components/Widgets/WidthProvider'
import DropdownButton from '../../components/DropdownButton'
import DisplayStatusCard from '../../components/Admin/DisplayStatusCard'
import { Form, Switch } from '../../components/Form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { StatusBarElementTypes } from '../../helpers/statusbar'
import Widgets from '../../widgets'
import { useWidgetChoices } from '../../hooks/useAvailableWidgets'
import { useLayout } from '../../hooks/useLayout'
import { useLayoutMutations } from '../../hooks/useLayoutMutations'
import { ILayoutCreateData, ILayoutUpdateData, addWidgetToLayout, updateWidgetPositions, removeWidgetFromLayout } from '../../actions/layouts'

import { WidgetType } from '../../lib/models/Widget'

const GridLayoutWithWidth = WidthProvider(GridLayout as any)

const LayoutAdminContent = memo(function LayoutAdminContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const layoutId = searchParams?.get('id') || null
  const isEditing = !!layoutId

  const { data: existingLayout, isLoading: layoutLoading } = useLayout(layoutId)
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
  const [savedLayoutId, setSavedLayoutId] = useState<string | null>(layoutId)

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
    }
  }, [existingLayout, isEditing])

  const handleAddWidget = async (type: string): Promise<void> => {
    if (!savedLayoutId) {
      alert('Please save the layout first before adding widgets')
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
      await addWidgetToLayout(savedLayoutId, {
        type: type as WidgetType,
        name: `${type} Widget`,
        x: bestPosition.x,
        y: bestPosition.y,
        w: widgetSize.w,
        h: widgetSize.h,
        data: widgetDefinition?.defaultData || {},
      })

      // Refresh layout data
      window.location.reload() // Simple refresh for now
    } catch (error) {
      console.error('Failed to add widget:', error)
      alert('Failed to add widget. Please try again.')
    }
  }

  const handleDeleteWidget = async (widgetId: string): Promise<void> => {
    if (!savedLayoutId) {
      return
    }

    try {
      await removeWidgetFromLayout(savedLayoutId, widgetId)
      // Refresh layout data
      window.location.reload() // Simple refresh for now
    } catch (error) {
      console.error('Failed to delete widget:', error)
      alert('Failed to delete widget. Please try again.')
    }
  }

  const handleLayoutChange = useCallback(async (layout: RglLayout[]): Promise<void> => {
    if (!savedLayoutId || !existingLayout?.widgets) {
      return
    }

    // Prepare position updates
    const positionUpdates = layout.map(layoutItem => {
      const widgetIndex = parseInt(layoutItem.i)
      const widget = existingLayout.widgets[widgetIndex]
      if (widget) {
        return {
          widget_id: widget.widget_id._id || widget.widget_id,
          x: layoutItem.x,
          y: layoutItem.y,
          w: layoutItem.w,
          h: layoutItem.h,
        }
      }
      return null
    }).filter(Boolean)

    try {
      await updateWidgetPositions(savedLayoutId, positionUpdates as any)
    } catch (error) {
      console.error('Failed to update widget positions:', error)
    }
  }, [savedLayoutId, existingLayout?.widgets])

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
      if (isEditing && layoutId) {
        updateLayout({ id: layoutId, data: layoutData as any })
        router.push('/layouts')
      } else {
        const newLayout = await createLayoutAsync({ ...layoutData, widgets: [] } as any)
        setSavedLayoutId(newLayout._id as string)
        // Don't redirect immediately - let user add widgets
        alert('Layout saved! You can now add widgets to your layout.')
      }
    } catch (error) {
      console.error('Failed to save layout:', error)
      alert('Failed to save layout. Please try again.')
    }
  }

  const rglLayout: RglLayout[] = existingLayout?.widgets?.map((widget, index) => ({
    i: index.toString(),
    x: widget.x,
    y: widget.y,
    w: widget.w,
    h: widget.h,
  })) || []

  const statusBarChoices = Object.keys(StatusBarElementTypes).map(key => {
    const elType = StatusBarElementTypes[key as keyof typeof StatusBarElementTypes]
    return {
      key: key,
      name: elType.name,
      icon: elType.icon,
    }
  })

  if (layoutLoading) {
    return (
      <Frame loggedIn={true}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading layout...</p>
          </div>
        </div>
      </Frame>
    )
  }

  return (
    <Frame loggedIn={true}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Link href="/layouts">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Layouts
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">
              {isEditing ? 'Edit Layout' : 'Create Layout'}
            </h1>
            <p className="text-muted-foreground">
              {isEditing ? 'Modify your layout template' : 'Design a new layout template for your displays'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {isEditing && (
            <Button
              variant="outline"
              onClick={() => window.open(`/layout-preview?id=${layoutId}`, '_blank')}
            >
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={isCreating || isUpdating || !layoutData.name.trim()}
          >
            <Save className="mr-2 h-4 w-4" />
            {isCreating || isUpdating ? 'Saving...' : 'Save Layout'}
          </Button>
        </div>
      </div>

      {/* Layout Settings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Layout Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Layout Name</label>
              <Input
                placeholder="Enter layout name"
                value={layoutData.name}
                onChange={(e) => setLayoutData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Input
                placeholder="Enter description (optional)"
                value={layoutData.description}
                onChange={(e) => setLayoutData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Bar Configuration */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
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
            <div className="bg-gray-300 rounded-lg h-16 min-h-16">
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
            <p className="text-muted-foreground text-center py-4">
              No status bar items added. Click "Add Status Bar Item" to get started.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Layout Controls */}
      <div className="flex flex-row items-center justify-between mb-4">
        <DropdownButton
          icon={Edit}
          text={widgetChoicesLoading ? 'Loading Widgets...' : 'Add Widget'}
          onSelect={handleAddWidget}
          choices={widgetChoices}
          disabled={widgetChoicesLoading}
        />
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
      <Card>
        <CardHeader>
          <CardTitle>Layout Canvas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-300 relative" style={{
            borderRadius: layoutData.layoutType === 'spaced' ? '8px' : '0px',
            aspectRatio: layoutData.orientation === 'portrait' ? '9/16' : '16/9',
            maxWidth: layoutData.orientation === 'portrait' ? '600px' : '100%',
            minHeight: layoutData.orientation === 'portrait' ? '800px' : '450px',
            margin: layoutData.orientation === 'portrait' ? '0 auto' : '0'
          }}>
            {/* Aspect ratio indicator */}
            <div className="absolute top-2 left-2 bg-black/20 text-white text-xs px-2 py-1 rounded backdrop-blur-sm z-10">
              {layoutData.orientation === 'portrait' ? '9:16' : '16:9'} • {layoutData.gridConfig.cols}×{layoutData.gridConfig.rows}
            </div>

            {(!existingLayout?.widgets || existingLayout.widgets.length === 0) ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <Grid3X3 className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium">No widgets added yet</p>
                  <p className="text-sm">Click "Add Widget" to start designing your layout</p>
                </div>
              </div>
            ) : (
              <GridLayoutWithWidth
                layout={rglLayout}
                cols={layoutData.gridConfig.cols}
                onLayoutChange={handleLayoutChange}
                draggableCancel={'.ReactModalPortal,.controls,button'}
                margin={layoutData.gridConfig.margin}
                rowHeight={layoutData.gridConfig.rowHeight}
                isBounded={true}
                useCSSTransforms={true}
                transformScale={1}
                preventCollision={true}
                compactType="vertical"
                maxRows={layoutData.gridConfig.rows}
              >
                {existingLayout?.widgets?.map((widget, index) => (
                  <div key={index}>
                    <div className="bg-white rounded border-2 border-dashed border-gray-400 h-full flex items-center justify-center relative group">
                      <div className="text-center">
                        <div className="text-sm font-medium text-gray-600 mb-1">
                          {(widget.widget_id as any)?.type || 'Unknown'}
                        </div>
                        <div className="text-xs text-gray-400">{widget.w}×{widget.h}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {(widget.widget_id as any)?.name || 'Unnamed'}
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                        onClick={() => handleDeleteWidget(
                          typeof widget.widget_id === 'string'
                            ? widget.widget_id
                            : (widget.widget_id as any)._id || widget.widget_id.toString()
                        )}
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                ))}
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
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading layout editor...</p>
          </div>
        </div>
      </Frame>
    }>
      <LayoutAdminContent />
    </Suspense>
  )
}