import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import GridLayout, { Layout as RglLayout } from 'react-grid-layout'
import { DragDropContext, Droppable, DropResult, DroppableProvided } from '@hello-pangea/dnd'
import { Edit, Grid2X2, Grid3X3, Monitor, Smartphone, RotateCcw, Maximize2 } from 'lucide-react'

import Frame from '../components/Admin/Frame' // Assuming .js or .tsx
import EditableWidget from '../components/Admin/EditableWidget' // Assuming .js or .tsx
import StatusBarElement from '../components/Admin/StatusBarElement' // Assuming .js or .tsx
import WidthProvider from '../components/Widgets/WidthProvider' // Assuming .js or .tsx
import DropdownButton, { IDropdownChoice } from '../components/DropdownButton' // Already .tsx
import DisplayStatusCard from '../components/Admin/DisplayStatusCard'

import { Form, Switch } from '../components/Form' // Assuming .js or .tsx

import { StatusBarElementTypes, IStatusBarElementDefinition } from '../helpers/statusbar' // Assuming statusbar.js will be typed

import Widgets, { IWidgetDefinition } from '../widgets' // Assuming widgets/index.js will be typed
import { useWidgetChoices } from '../hooks/useAvailableWidgets'

import { addWidget, getWidgets, deleteWidget, updateWidget, IWidgetData, INewWidgetData, IUpdateWidgetData } from '../actions/widgets' // Already .tsx
import { WidgetType } from '../lib/models/Widget'
import { protect, ProtectProps } from '../helpers/auth' // Assuming auth.js will be typed or allowJs
import { useDisplayContext } from '../contexts/DisplayContext'
import { useDisplays } from '../hooks/useDisplays'
import { useDragPerformanceMonitoring } from '../lib/performance-monitor'
import { calculateGridConstraints, validateWidgetDimensions, getOptimalWidgetSize, getDisplayInfo, getContainerStyles } from '../lib/display-utils'

const GridLayoutWithWidth = WidthProvider(GridLayout as any)

interface ILayoutPageProps extends ProtectProps {
  displayId?: string; // Assuming protect HOC ensures displayId is available
}

const LayoutPage: React.FC<ILayoutPageProps> = ({ loggedIn, displayId }) => {
  // ALL HOOKS MUST BE CALLED AT THE TOP - BEFORE ANY CONDITIONAL LOGIC
  const displayContext = useDisplayContext()
  const { data: displays, isLoading: displaysLoading } = useDisplays()
  const [widgets, setWidgets] = useState<IWidgetData[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null)
  const [optimisticLayout, setOptimisticLayout] = useState<RglLayout[]>([])
  const { widgetChoices, isLoading: widgetChoicesLoading } = useWidgetChoices()
  const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSavedLayoutRef = useRef<RglLayout[]>([])
  const pendingUpdatesRef = useRef<Map<string, IUpdateWidgetData>>(new Map())
  const { startMonitoring, stopMonitoring, startApiCall, endApiCall } = useDragPerformanceMonitoring()

  // Calculate grid constraints based on aspect ratio using utility
  const gridConstraints = useMemo(() =>
    calculateGridConstraints(displayContext.state.orientation || 'landscape'),
    [displayContext.state.orientation]
  )

  // Get display info for UI
  const displayInfo = useMemo(() =>
    getDisplayInfo(displayContext.state.orientation || 'landscape'),
    [displayContext.state.orientation]
  )

  // Get container styles
  const containerStyles = useMemo(() =>
    getContainerStyles(displayContext.state.orientation || 'landscape', displayContext.state.layout || 'spaced'),
    [displayContext.state.orientation, displayContext.state.layout]
  )

  // Auto-arrange widgets to maximize space usage with aspect ratio awareness
  const autoArrangeLayout = useCallback((widgets: IWidgetData[]): RglLayout[] => {
    const { cols, rows } = gridConstraints
    const arranged: RglLayout[] = []

    // Sort widgets by size (larger widgets first) for better packing
    const sortedWidgets = [...widgets].sort((a, b) => {
      const aSize = (a.w || 1) * (a.h || 1)
      const bSize = (b.w || 1) * (b.h || 1)
      return bSize - aSize
    })

    // Create a grid occupancy map for efficient collision detection
    const occupancyGrid: boolean[][] = Array(rows).fill(null).map(() => Array(cols).fill(false))

    for (const widget of sortedWidgets) {
      // Ensure widget dimensions respect aspect ratio constraints
      let w = Math.min(widget.w || 2, gridConstraints.maxItemWidth)
      let h = Math.min(widget.h || 2, gridConstraints.maxItemHeight)

      // Adjust dimensions to maintain reasonable proportions for the aspect ratio
      if (displayInfo.isPortrait) {
        // In portrait mode (9:16), prefer taller widgets
        w = Math.min(w, Math.floor(cols * 0.67)) // Max ~6 units in 9-column grid
        h = Math.max(h, 2) // Minimum height of 2
      } else {
        // In landscape mode (16:9), prefer wider widgets
        w = Math.max(w, 2) // Minimum width of 2
        h = Math.min(h, Math.floor(rows * 0.67)) // Max ~6 units in 9-row grid
      }

      let bestX = 0
      let bestY = 0
      let foundPosition = false

      // Find the best position using a more efficient algorithm
      for (let y = 0; y <= rows - h && !foundPosition; y++) {
        for (let x = 0; x <= cols - w && !foundPosition; x++) {
          // Check if this position is free
          let canPlace = true
          for (let dy = 0; dy < h && canPlace; dy++) {
            for (let dx = 0; dx < w && canPlace; dx++) {
              if (occupancyGrid[y + dy] && occupancyGrid[y + dy][x + dx]) {
                canPlace = false
              }
            }
          }

          if (canPlace) {
            bestX = x
            bestY = y
            foundPosition = true

            // Mark the grid cells as occupied
            for (let dy = 0; dy < h; dy++) {
              for (let dx = 0; dx < w; dx++) {
                if (occupancyGrid[bestY + dy]) {
                  occupancyGrid[bestY + dy][bestX + dx] = true
                }
              }
            }
          }
        }
      }

      // If no position found, place at the bottom
      if (!foundPosition) {
        bestX = 0
        bestY = Math.max(0, ...arranged.map(item => item.y + item.h))
      }

      arranged.push({
        i: widget._id,
        x: bestX,
        y: bestY,
        w,
        h,
        minW: gridConstraints.minItemWidth,
        minH: gridConstraints.minItemHeight,
        maxW: gridConstraints.maxItemWidth,
        maxH: gridConstraints.maxItemHeight,
      })
    }

    return arranged
  }, [gridConstraints, displayInfo.isPortrait])

  // Batch update function to handle multiple widget updates efficiently
  const batchUpdateWidgets = useCallback(async () => {
    if (pendingUpdatesRef.current.size === 0) return

    const updates = Array.from(pendingUpdatesRef.current.entries())
    pendingUpdatesRef.current.clear()

    console.log('[DEBUG] Batch updating widgets:', updates.length)

    // Execute all updates in parallel for better performance
    const updatePromises = updates.map(([widgetId, widgetData]) =>
      updateWidget(widgetId, widgetData).catch(error => {
        console.error(`Failed to update widget ${widgetId} layout:`, error)
        // Revert optimistic update on error
        setWidgets(prev => prev.map(w =>
          w._id === widgetId
            ? { ...w, x: lastSavedLayoutRef.current.find(l => l.i === widgetId)?.x || w.x }
            : w
        ))
      })
    )

    try {
      await Promise.all(updatePromises)
      // Update last saved layout reference
      lastSavedLayoutRef.current = optimisticLayout
    } catch (error) {
      console.error('Some widget updates failed:', error)
    }
  }, [optimisticLayout])

  // useEffect hooks
  useEffect(() => {
    if (displayId && displayId !== displayContext.state.id) {
      console.log('[DEBUG] Setting display ID from URL:', displayId)
      displayContext.setId(displayId)
      refreshWidgets(displayId)
    }
  }, [displayId, displayContext.state.id])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current)
      }
    }
  }, [])

  // Initialize optimistic layout when widgets change
  useEffect(() => {
    const newLayout = widgets.map(widget => ({
      i: widget._id,
      x: widget.x || 0,
      y: widget.y || 0,
      w: widget.w || 1,
      h: widget.h || 1,
    }))
    setOptimisticLayout(newLayout)
    lastSavedLayoutRef.current = newLayout
  }, [widgets])

  // Optimized drag start handler
  const handleDragStart = useCallback((layout: RglLayout[], oldItem: RglLayout, newItem: RglLayout) => {
    setIsDragging(true)
    setDraggedWidgetId(newItem.i)
    startMonitoring()
    console.log('[DEBUG] Drag started for widget:', newItem.i)
  }, [startMonitoring])

  // Optimized drag handler with boundary validation using utility
  const handleDrag = useCallback((layout: RglLayout[], oldItem: RglLayout, newItem: RglLayout) => {
    // Validate boundaries using utility function
    const validated = validateWidgetDimensions(
      newItem.x,
      newItem.y,
      newItem.w,
      newItem.h,
      gridConstraints
    )

    const validatedItem = {
      ...newItem,
      x: validated.x,
      y: validated.y,
      w: validated.w,
      h: validated.h,
    }

    // Update layout with validated item
    const validatedLayout = layout.map(item =>
      item.i === newItem.i ? validatedItem : item
    )

    // Update optimistic layout immediately for smooth UI
    setOptimisticLayout(validatedLayout)

    // Update widgets state optimistically
    setWidgets(prev => prev.map(widget => {
      const layoutItem = validatedLayout.find(l => l.i === widget._id)
      if (layoutItem) {
        return {
          ...widget,
          x: layoutItem.x,
          y: layoutItem.y,
          w: layoutItem.w,
          h: layoutItem.h,
        }
      }
      return widget
    }))
  }, [gridConstraints])

  // Optimized drag stop handler
  const handleDragStop = useCallback((layout: RglLayout[], oldItem: RglLayout, newItem: RglLayout) => {
    setIsDragging(false)
    setDraggedWidgetId(null)
    stopMonitoring()

    console.log('[DEBUG] Drag stopped for widget:', newItem.i)

    // Queue the update for batch processing
    const widgetData: IUpdateWidgetData = {
      x: newItem.x,
      y: newItem.y,
      w: newItem.w,
      h: newItem.h,
    }
    pendingUpdatesRef.current.set(newItem.i, widgetData)

    // Clear existing timeout and set new one
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current)
    }

    dragTimeoutRef.current = setTimeout(() => {
      startApiCall()
      batchUpdateWidgets().finally(() => endApiCall())
    }, 500) // Batch updates after 500ms of inactivity
  }, [batchUpdateWidgets, stopMonitoring, startApiCall, endApiCall])

  // Optimized resize handlers
  const handleResizeStart = useCallback((layout: RglLayout[], oldItem: RglLayout, newItem: RglLayout) => {
    setIsDragging(true)
    setDraggedWidgetId(newItem.i)
    console.log('[DEBUG] Resize started for widget:', newItem.i)
  }, [])

  const handleResize = useCallback((layout: RglLayout[], oldItem: RglLayout, newItem: RglLayout) => {
    // Validate boundaries using utility function
    const validated = validateWidgetDimensions(
      newItem.x,
      newItem.y,
      newItem.w,
      newItem.h,
      gridConstraints
    )

    const validatedItem = {
      ...newItem,
      x: validated.x,
      y: validated.y,
      w: validated.w,
      h: validated.h,
    }

    // Update layout with validated item
    const validatedLayout = layout.map(item =>
      item.i === newItem.i ? validatedItem : item
    )

    // Update optimistic layout immediately
    setOptimisticLayout(validatedLayout)

    // Update widgets state optimistically
    setWidgets(prev => prev.map(widget => {
      const layoutItem = validatedLayout.find(l => l.i === widget._id)
      if (layoutItem) {
        return {
          ...widget,
          x: layoutItem.x,
          y: layoutItem.y,
          w: layoutItem.w,
          h: layoutItem.h,
        }
      }
      return widget
    }))
  }, [gridConstraints])

  const handleResizeStop = useCallback((layout: RglLayout[], oldItem: RglLayout, newItem: RglLayout) => {
    setIsDragging(false)
    setDraggedWidgetId(null)
    stopMonitoring()

    console.log('[DEBUG] Resize stopped for widget:', newItem.i)

    // Queue the update for batch processing
    const widgetData: IUpdateWidgetData = {
      x: newItem.x,
      y: newItem.y,
      w: newItem.w,
      h: newItem.h,
    }
    pendingUpdatesRef.current.set(newItem.i, widgetData)

    // Clear existing timeout and set new one
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current)
    }

    dragTimeoutRef.current = setTimeout(() => {
      startApiCall()
      batchUpdateWidgets().finally(() => endApiCall())
    }, 500) // Batch updates after 500ms of inactivity
  }, [batchUpdateWidgets, stopMonitoring, startApiCall, endApiCall])

  // Legacy layout change handler for compatibility
  const handleLayoutChange = useCallback((layout: RglLayout[]): void => {
    // Only update if not currently dragging to avoid conflicts
    if (!isDragging) {
      setOptimisticLayout(layout)
    }
  }, [isDragging])

  // Manual rearrange function
  const handleManualRearrange = useCallback(() => {
    console.log('[DEBUG] Manual rearrange triggered')
    const rearrangedLayout = autoArrangeLayout(widgets)
    setOptimisticLayout(rearrangedLayout)

    // Update widgets state optimistically
    setWidgets(prev => prev.map(widget => {
      const layoutItem = rearrangedLayout.find(l => l.i === widget._id)
      if (layoutItem) {
        return {
          ...widget,
          x: layoutItem.x,
          y: layoutItem.y,
          w: layoutItem.w,
          h: layoutItem.h,
        }
      }
      return widget
    }))

    // Batch update all widgets
    const updates = rearrangedLayout.map(item => ({
      widgetId: item.i,
      data: {
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
      }
    }))

    // Clear pending updates and add new ones
    pendingUpdatesRef.current.clear()
    updates.forEach(({ widgetId, data }) => {
      pendingUpdatesRef.current.set(widgetId, data)
    })

    // Trigger batch update
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current)
    }

    dragTimeoutRef.current = setTimeout(() => {
      startApiCall()
      batchUpdateWidgets().finally(() => endApiCall())
    }, 100) // Quick update for manual rearrange
  }, [widgets, autoArrangeLayout, batchUpdateWidgets, startApiCall, endApiCall])

  // Memoized layout calculation with auto-arrangement option
  const rglLayout: RglLayout[] = useMemo(() => {
    // Check if any widget is outside boundaries
    const needsRearrangement = widgets.some(widget => {
      const x = widget.x || 0
      const w = widget.w || 1
      return x + w > gridConstraints.cols || x < 0
    })

    if (needsRearrangement) {
      console.log('[DEBUG] Auto-arranging widgets due to boundary violations')
      return autoArrangeLayout(widgets)
    }

    return widgets.map(widget => ({
      i: widget._id,
      x: Math.max(0, Math.min(widget.x || 0, gridConstraints.cols - (widget.w || 1))),
      y: widget.y || 0,
      w: Math.min(widget.w || 1, gridConstraints.maxItemWidth),
      h: Math.min(widget.h || 1, gridConstraints.maxItemHeight),
      minW: gridConstraints.minItemWidth,
      minH: gridConstraints.minItemHeight,
      maxW: gridConstraints.maxItemWidth,
      maxH: gridConstraints.maxItemHeight,
    }))
  }, [widgets, gridConstraints, autoArrangeLayout])

  // Helper function
  const refreshWidgets = (displayId: string): Promise<void> => {
    return getWidgets(displayId).then(widgets => {
      setWidgets(widgets)
    }).catch(error => {
      console.error('Failed to refresh widgets:', error)
      setWidgets([]) // Reset or handle error appropriately
    })
  }

  // If no display ID is available, show a display selector
  if (!displayContext.state.id && !displayId) {
    return (
      <Frame loggedIn={loggedIn}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-6 max-w-md">
            <h2 className="text-2xl font-bold">Select a Display</h2>
            <p className="text-muted-foreground">
              Choose a display to start designing its layout with widgets.
            </p>

            {displaysLoading ? (
              <div>Loading displays...</div>
            ) : displays && displays.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Available Displays:</h3>
                <div className="grid gap-2">
                  {displays.map((display) => (
                    <button
                      key={display._id}
                      onClick={() => {
                        console.log('[DEBUG] Selected display:', display._id)
                        displayContext.setId(display._id)
                      }}
                      className="p-3 border rounded-lg hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="font-medium">{display.name || 'Unnamed Display'}</div>
                      <div className="text-sm text-muted-foreground">
                        {display.orientation} • {display.layout}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p>No displays found. Create a display first.</p>
                <button
                  onClick={() => window.location.href = '/screens'}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Go to Displays
                </button>
              </div>
            )}
          </div>
        </div>
      </Frame>
    )
  }

  const handleAddWidget = (type: string): void => {
    if (!displayContext.state.id) {
      alert('Error: No display selected. Please select a display first.')
      return
    }

    const widgetDefinition: IWidgetDefinition | undefined = Widgets[type]

    // Get optimal size for this widget type and orientation
    const optimalSize = getOptimalWidgetSize(type, displayContext.state.orientation || 'landscape')

    const newWidgetData: INewWidgetData = { // Construct data for addWidget action
        type: type as WidgetType,
        name: `${type} Widget`, // Provide a default name since it's required by the new API
        data: widgetDefinition?.defaultData || {},
        display_id: displayContext.state.id!, // Pass display ID to associate widget with display
        w: optimalSize.w,
        h: optimalSize.h,
        // x, y will be auto-assigned by the auto-arrange algorithm
    }

    addWidget(newWidgetData)
        .then(() => refreshWidgets(displayContext.state.id!))
        .catch(error => console.error('Failed to add widget:', error))
  }

  const handleDeleteWidget = async (id: string): Promise<void> => {
    try {
      await deleteWidget(id)
      await refreshWidgets(displayContext.state.id!)
    } catch (error) {
      console.error('Failed to delete widget:', error)
      throw error // Re-throw to let the modal handle the error
    }
  }

  const handleDragEnd = (result: DropResult): void => {
    if (!result.destination || !displayContext.state.id) {
      return
    }
    displayContext.reorderStatusBarItems(result.source.index, result.destination.index)
  }

  const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const title = event.target.value
    displayContext.updateName(title) // updateName is debounced in the context
  }

  const handleLayoutTypeChange = (name: string, checked: boolean): void => {
    displayContext.updateLayout(checked ? 'spaced' : 'compact')
  }

  const handleOrientationChange = (name: string, checked: boolean): void => {
    displayContext.updateOrientation(checked ? 'portrait' : 'landscape')
  }

  const statusBarChoices: IDropdownChoice[] = Object.keys(StatusBarElementTypes).map(key => {
    const elType = StatusBarElementTypes[key as keyof typeof StatusBarElementTypes] as IStatusBarElementDefinition
    return {
      key: key,
      name: elType.name,
      icon: elType.icon, // Lucide icon component
    }
  })

  // Widget choices are now provided by the useWidgetChoices hook
  // which filters based on feature flags

  return (
    <Frame loggedIn={loggedIn}>
      <div className="space-y-8">
        {/* Header Section */}
        <div className="space-y-6">
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Layout Designer</h1>
              <p className="text-muted-foreground">
                Design and customize your display layout with widgets and status bar elements.
              </p>
            </div>
          </div>

          {/* Display Name Editor */}
          <div className="flex items-center space-x-3 p-4 bg-card border rounded-lg">
            <Edit className="w-5 h-5 text-muted-foreground" />
            <div className="flex-1">
              <label className="text-sm font-medium text-muted-foreground">Display Name</label>
              <input
                className="block w-full mt-1 text-lg font-semibold bg-transparent border-none outline-none focus:ring-0 p-0"
                placeholder="Unnamed display"
                value={displayContext.state.name || ''}
                onChange={handleTitleChange}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              />
            </div>
          </div>
        </div>

        {/* Display Status Card - Shows displays using this layout */}
        <DisplayStatusCard
          layoutId={displayId}
          title="Displays Using This Layout"
          className="mb-6"
        />

        {/* Controls Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Bar Controls */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Status Bar</h3>
              <DropdownButton
                icon={Edit}
                text="Add Status Item"
                onSelect={displayContext.addStatusBarItem}
                choices={statusBarChoices}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid hsl(var(--border))',
                  background: 'hsl(var(--background))',
                  fontSize: '14px'
                }}
              />
            </div>

            {displayContext.state.statusBar && displayContext.state.statusBar.elements && displayContext.state.statusBar.elements.length > 0 && (
              <div className="bg-muted/50 rounded-lg p-4 min-h-[80px] border-2 border-dashed border-muted-foreground/25">
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="droppable-statusbar" direction="horizontal">
                    {(provided: DroppableProvided) => (
                      <div
                        ref={provided.innerRef}
                        className="flex gap-2 overflow-auto h-full"
                        {...provided.droppableProps}
                      >
                        {displayContext.state.statusBar.elements!.map((item: string, index: number) => (
                          <StatusBarElement
                            key={item}
                            item={item}
                            index={index}
                            onDelete={() => displayContext.removeStatusBarItem(index)}
                          />
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </div>
            )}
          </div>

          {/* Widget Controls */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Widgets</h3>
              <div className="flex items-center space-x-3">
                <DropdownButton
                  icon={Edit}
                  text={widgetChoicesLoading ? "Loading Widgets..." : "Add Widget"}
                  onSelect={handleAddWidget}
                  choices={widgetChoices}
                  disabled={widgetChoicesLoading}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid hsl(var(--border))',
                    background: 'hsl(var(--background))',
                    fontSize: '14px'
                  }}
                />
                <button
                  onClick={handleManualRearrange}
                  disabled={widgets.length === 0}
                  className="flex items-center space-x-2 px-3 py-2 text-sm border border-border rounded-md hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Auto-arrange widgets to maximize space"
                >
                  <Maximize2 className="w-4 h-4" />
                  <span>Auto-arrange</span>
                </button>
                <Form>
                  <Switch
                    name="layoutStyle"
                    checkedLabel="Compact"
                    uncheckedLabel="Spaced"
                    checkedIcon={Grid2X2}
                    uncheckedIcon={Grid3X3}
                    checked={displayContext.state.layout === 'spaced'}
                    onValueChange={handleLayoutTypeChange}
                  />
                  <Switch
                    name="orientation"
                    checkedLabel="Portrait"
                    uncheckedLabel="Landscape"
                    checkedIcon={Smartphone}
                    uncheckedIcon={Monitor}
                    checked={displayContext.state.orientation === 'portrait'}
                    onValueChange={handleOrientationChange}
                  />
                </Form>
              </div>
            </div>
          </div>
        </div>

        {/* Layout Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Layout Preview</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {displayInfo.description}
              </p>
            </div>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <span>
                Aspect Ratio: {displayInfo.aspectRatio}
              </span>
              <span>
                Grid: {displayInfo.gridSize}
              </span>
              <span>
                Widgets: {widgets.length}
              </span>
              <span>
                {displayInfo.orientation}
              </span>
            </div>
          </div>
          <div
            className="bg-muted/30 border-2 border-dashed border-muted-foreground/25 rounded-lg overflow-hidden relative"
            style={{
              ...containerStyles,
              background: displayContext.state.layout === 'spaced'
                ? 'hsl(var(--muted) / 0.3)'
                : 'hsl(var(--muted) / 0.5)',
            }}
          >
            {/* Aspect ratio indicator */}
            <div className="absolute top-2 left-2 bg-black/20 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
              {displayInfo.aspectRatio} • {displayInfo.gridSize}
            </div>

            {/* Display type indicator */}
            <div className="absolute top-2 right-2 bg-primary/20 text-primary text-xs px-2 py-1 rounded backdrop-blur-sm">
              {displayInfo.isPortrait ? '📱 Portrait Display' : '📺 TV/Monitor'}
            </div>
            <GridLayoutWithWidth
              layout={rglLayout}
              cols={gridConstraints.cols}
              onLayoutChange={handleLayoutChange}
              onDragStart={handleDragStart}
              onDrag={handleDrag}
              onDragStop={handleDragStop}
              onResizeStart={handleResizeStart}
              onResize={handleResize}
              onResizeStop={handleResizeStop}
              draggableCancel={'.ReactModalPortal,.controls,button'}
              margin={gridConstraints.recommendedMargin}
              rowHeight={gridConstraints.recommendedRowHeight}
              isBounded={true}
              containerPadding={[12, 12]}
              isDraggable={true}
              isResizable={true}
              useCSSTransforms={true}
              transformScale={1}
              preventCollision={true}
              compactType="vertical"
              autoSize={true}
              verticalCompact={true}
              allowOverlap={false}
              maxRows={gridConstraints.rows}
            >
              {widgets.map(widget => (
                <div
                  key={widget._id}
                  className={`group relative transition-all duration-200 ${
                    draggedWidgetId === widget._id
                      ? 'z-10 ring-2 ring-primary/50'
                      : isDragging
                        ? 'opacity-90'
                        : ''
                  }`}
                  style={{
                    transform: draggedWidgetId === widget._id ? 'scale(1.02)' : 'scale(1)',
                    transition: isDragging ? 'none' : 'all 200ms ease',
                  }}
                >
                  <EditableWidget
                    id={widget._id}
                    type={widget.type as WidgetType}
                    onDelete={() => handleDeleteWidget(widget._id)}
                    layout={displayContext.state.layout || 'compact'}
                  />
                </div>
              ))}
            </GridLayoutWithWidth>
            
            {widgets.length === 0 && (
              <div className="flex items-center justify-center h-full text-center p-8">
                <div className="space-y-3">
                  <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                    <Grid3X3 className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h4 className="text-lg font-medium">No widgets added yet</h4>
                  <p className="text-muted-foreground">
                    Start building your layout by adding widgets from the controls above.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Frame>
  )
}

// Removed view() HOC wrapping and only use protect HOC
export default protect(LayoutPage)