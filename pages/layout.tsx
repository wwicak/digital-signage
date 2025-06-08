import React, { useEffect, useState } from 'react'
import GridLayout, { Layout as RglLayout } from 'react-grid-layout'
import { DragDropContext, Droppable, DropResult, DroppableProvided } from '@hello-pangea/dnd'
import { Edit, Grid2X2, Grid3X3 } from 'lucide-react'

import Frame from '../components/Admin/Frame' // Assuming .js or .tsx
import EditableWidget from '../components/Admin/EditableWidget' // Assuming .js or .tsx
import StatusBarElement from '../components/Admin/StatusBarElement' // Assuming .js or .tsx
import WidthProvider from '../components/Widgets/WidthProvider' // Assuming .js or .tsx
import DropdownButton, { IDropdownChoice } from '../components/DropdownButton' // Already .tsx

import { Form, Switch } from '../components/Form' // Assuming .js or .tsx

import { StatusBarElementTypes, IStatusBarElementDefinition } from '../helpers/statusbar' // Assuming statusbar.js will be typed

import Widgets, { IWidgetDefinition } from '../widgets' // Assuming widgets/index.js will be typed

import { addWidget, getWidgets, deleteWidget, updateWidget, IWidgetData, INewWidgetData, IUpdateWidgetData } from '../actions/widgets' // Already .tsx
import { WidgetType } from '../lib/models/Widget'
import { protect, ProtectProps } from '../helpers/auth' // Assuming auth.js will be typed or allowJs
import { useDisplayContext } from '../contexts/DisplayContext'
import { useDisplays } from '../hooks/useDisplays'

const GridLayoutWithWidth = WidthProvider(GridLayout as any)

interface ILayoutPageProps extends ProtectProps {
  displayId?: string; // Assuming protect HOC ensures displayId is available
}

const LayoutPage: React.FC<ILayoutPageProps> = ({ loggedIn, displayId }) => {
  const [widgets, setWidgets] = useState<IWidgetData[]>([])
  const displayContext = useDisplayContext()
  const { data: displays, isLoading: displaysLoading } = useDisplays()

  useEffect(() => {
    if (displayId && displayId !== displayContext.state.id) {
      console.log('[DEBUG] Setting display ID from URL:', displayId)
      displayContext.setId(displayId)
      refreshWidgets(displayId)
    }
  }, [displayId, displayContext.state.id]) // Only depend on the specific state value, not the whole context

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

  const refreshWidgets = (displayId: string): Promise<void> => {
    return getWidgets(displayId).then(widgets => {
      setWidgets(widgets)
    }).catch(error => {
      console.error('Failed to refresh widgets:', error)
      setWidgets([]) // Reset or handle error appropriately
    })
  }

  const handleAddWidget = (type: string): void => {
    if (!displayContext.state.id) {
      alert('Error: No display selected. Please select a display first.')
      return
    }

    const widgetDefinition: IWidgetDefinition | undefined = Widgets[type]
    
    const newWidgetData: INewWidgetData = { // Construct data for addWidget action
        type: type as WidgetType,
        name: `${type} Widget`, // Provide a default name since it's required by the new API
        data: widgetDefinition?.defaultData || {},
        display_id: displayContext.state.id!, // Pass display ID to associate widget with display
        // x, y, w, h can be omitted if server assigns defaults or if not needed immediately
    }

    addWidget(newWidgetData)
        .then(() => refreshWidgets(displayContext.state.id!))
        .catch(error => console.error('Failed to add widget:', error))
  }

  const handleDeleteWidget = (id: string): void => {
    deleteWidget(id)
        .then(() => refreshWidgets(displayContext.state.id!))
        .catch(error => console.error('Failed to delete widget:', error))
  }

  const handleLayoutChange = (layout: RglLayout[]): void => {
    console.log('[DEBUG] handleLayoutChange called with layout:', layout.length)
    for (const widgetLayout of layout) {
      // Find the current widget to check if position actually changed
      const currentWidget = widgets.find(w => w._id === widgetLayout.i)
      if (currentWidget &&
          (currentWidget.x !== widgetLayout.x ||
           currentWidget.y !== widgetLayout.y ||
           currentWidget.w !== widgetLayout.w ||
           currentWidget.h !== widgetLayout.h)) {
        console.log('[DEBUG] Widget position changed, updating:', widgetLayout.i)
        const widgetData: IUpdateWidgetData = {
          x: widgetLayout.x,
          y: widgetLayout.y,
          w: widgetLayout.w,
          h: widgetLayout.h,
        }
        updateWidget(widgetLayout.i, widgetData)
          .catch(error => console.error(`Failed to update widget ${widgetLayout.i} layout:`, error))
      }
      // Note: No refreshWidgets here to avoid jumpiness; optimistic update or server should confirm.
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

  const rglLayout: RglLayout[] = widgets.map(widget => ({
    i: widget._id,
    x: widget.x || 0,
    y: widget.y || 0,
    w: widget.w || 1,
    h: widget.h || 1,
    // Add min/max W/H if needed, or isDraggable/isResizable per item
  }))

  const statusBarChoices: IDropdownChoice[] = Object.keys(StatusBarElementTypes).map(key => {
    const elType = StatusBarElementTypes[key as keyof typeof StatusBarElementTypes] as IStatusBarElementDefinition
    return {
      key: key,
      name: elType.name,
      icon: elType.icon, // Lucide icon component
    }
  })

  const widgetChoices: IDropdownChoice[] = Object.keys(Widgets).map(key => {
      const widgetDef = Widgets[key]
      return {
          key: widgetDef.type || key, // Assuming Widgets might have a 'type' field or key is the type
          name: widgetDef.name,
          icon: widgetDef.icon, // Lucide icon component
      }
  })

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
                  text="Add Widget"
                  onSelect={handleAddWidget}
                  choices={widgetChoices}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid hsl(var(--border))',
                    background: 'hsl(var(--background))',
                    fontSize: '14px'
                  }}
                />
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
                </Form>
              </div>
            </div>
          </div>
        </div>

        {/* Layout Grid */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Layout Preview</h3>
          <div
            className="bg-muted/30 border-2 border-dashed border-muted-foreground/25 min-h-[400px] rounded-lg overflow-hidden"
            style={{
              borderRadius: displayContext.state.layout === 'spaced' ? '12px' : '8px',
              background: displayContext.state.layout === 'spaced'
                ? 'hsl(var(--muted) / 0.3)'
                : 'hsl(var(--muted) / 0.5)'
            }}
          >
            <GridLayoutWithWidth
              layout={rglLayout}
              cols={6}
              onLayoutChange={handleLayoutChange}
              draggableCancel={'.ReactModalPortal,.controls,button'}
              margin={displayContext.state.layout === 'spaced' ? [16, 16] : [8, 8]}
              rowHeight={120}
              isBounded={true}
              containerPadding={[16, 16]}
              isDraggable={true}
              isResizable={true}
            >
              {widgets.map(widget => (
                <div key={widget._id} className="bg-background border rounded-lg shadow-sm overflow-hidden">
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