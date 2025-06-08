'use client'

import React, { useState, useEffect, useCallback, Suspense, memo } from 'react'
import { Grid3X3, Grid2X2, Edit, Monitor, Smartphone } from 'lucide-react'
import GridLayout, { Layout as RglLayout } from 'react-grid-layout'
import { useSearchParams } from 'next/navigation'
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd'

import Frame from '../../components/Admin/Frame'
import EditableWidget from '../../components/Admin/EditableWidget'
import StatusBarElement from '../../components/Admin/StatusBarElement'
import WidthProvider from '../../components/Widgets/WidthProvider'
import DropdownButton from '../../components/DropdownButton'
import { Form, Switch } from '../../components/Form'
import { useDisplayContext } from '../../contexts/DisplayContext'

import { StatusBarElementTypes } from '../../helpers/statusbar'
import Widgets from '../../widgets'
import { useWidgetChoices } from '../../hooks/useAvailableWidgets'

import { addWidget, getWidgets, deleteWidget, updateWidget, IWidgetData, INewWidgetData, IUpdateWidgetData } from '../../actions/widgets'
import { WidgetType } from '../../lib/models/Widget'

const GridLayoutWithWidth = WidthProvider(GridLayout as any)

const LayoutAdminContent = memo(function LayoutAdminContent() {
  const [widgets, setWidgets] = useState<IWidgetData[]>([])
  const searchParams = useSearchParams()
  const context = useDisplayContext()
  const { widgetChoices, isLoading: widgetChoicesLoading } = useWidgetChoices()

  // Memoize refreshWidgets to stabilize useEffect dependency
  const refreshWidgets = useCallback((displayId: string): Promise<void> => {
    return getWidgets(displayId).then(apiWidgets => { // Renamed to avoid confusion with state
      setWidgets(apiWidgets)
    }).catch(error => {
      console.error('Failed to refresh widgets:', error)
      setWidgets([]) // Ensure widgets is cleared or handled on error
    })
  }, []) // Assuming getWidgets and setWidgets are stable or have no dependencies from component scope

  useEffect(() => {
    // Get display ID from URL search params (e.g., ?display=ID)
    const displayIdFromUrl = searchParams?.get('display')
    const id = displayIdFromUrl || 'default-display-id' // Fallback to default
    
    // Set the display ID in context, which will trigger data fetching
    context.setId(id)
    refreshWidgets(id)
  }, [searchParams, context.setId, refreshWidgets]) // Updated dependencies

  const handleAddWidget = (type: string): void => {
    if (!context.state.id) {
      console.error('Display ID not set, cannot add widget.')
      return
    }
    const widgetDefinition = Widgets[type]
    const newWidgetData: INewWidgetData = {
        type: type as WidgetType,
        name: `${type} Widget`, // Provide a default name since it's required by the new API
        data: widgetDefinition?.defaultData || {},
        display_id: context.state.id, // Pass display ID to associate widget with display
    }

    addWidget(newWidgetData)
        .then(() => refreshWidgets(context.state.id!)) // context.state.id should be stable if refreshWidgets is called
        .catch(error => console.error('Failed to add widget:', error))
  }

  const handleDeleteWidget = (id: string): void => {
    if (!context.state.id) {
      console.error('Display ID not set, cannot delete widget.')
      return
    }
    deleteWidget(id)
        .then(() => refreshWidgets(context.state.id!)) // context.state.id should be stable
        .catch(error => console.error('Failed to delete widget:', error))
  }

  // Debounced layout change handler for better performance
  const debouncedLayoutUpdate = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout
      return (layout: RglLayout[]) => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => {
          console.log('[DEBUG] Batch updating layout changes')
          for (const widgetLayout of layout) {
            const widgetData: IUpdateWidgetData = {
              x: widgetLayout.x,
              y: widgetLayout.y,
              w: widgetLayout.w,
              h: widgetLayout.h,
            }
            updateWidget(widgetLayout.i, widgetData)
              .catch(error => console.error(`Failed to update widget ${widgetLayout.i} layout:`, error))
          }
        }, 300) // 300ms debounce delay
      }
    })(),
    []
  )

  const handleLayoutChange = useCallback((layout: RglLayout[]): void => {
    debouncedLayoutUpdate(layout)
  }, [debouncedLayoutUpdate])

  const handleDragEnd = (result: DropResult): void => {
    if (!result.destination || !context.state.id) {
      return
    }
    context.reorderStatusBarItems(result.source.index, result.destination.index)
  }

  const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const title = event.target.value
    context.updateName(title)
  }
  
  const handleLayoutTypeChange = (name: string, checked: boolean): void => {
    context.updateLayout(checked ? 'spaced' : 'compact')
  }

  const handleOrientationChange = (name: string, checked: boolean): void => {
    context.updateOrientation(checked ? 'portrait' : 'landscape')
  }

  const rglLayout: RglLayout[] = widgets.map(widget => ({
    i: widget._id,
    x: widget.x || 0,
    y: widget.y || 0,
    w: widget.w || 1,
    h: widget.h || 1,
  }))

  const statusBarChoices = Object.keys(StatusBarElementTypes).map(key => {
    const elType = StatusBarElementTypes[key as keyof typeof StatusBarElementTypes]
    return {
      key: key,
      name: elType.name,
      icon: elType.icon,
    }
  })

  // Widget choices are now provided by the useWidgetChoices hook
  // which filters based on feature flags

  return (
    <Frame loggedIn={true}>
      <div className={'head'}>
        <h1>Layout</h1>
        <div className="inline-block relative ml-4 mr-4 border-b-2 border-gray-400">
          <input
            className='input'
            placeholder='Unnamed display'
            value={context.state.name || ''}
            onChange={handleTitleChange}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            size={(context.state.name && context.state.name.length > 0) ? context.state.name.length : undefined}
          />
          <div className='icon'>
            <Edit className="w-4 h-4 text-gray-500" />
          </div>
        </div>
      </div>

      <div className="flex flex-row items-center justify-between mb-4">
        <DropdownButton
          icon={Edit}
          text='Add Status Bar Item'
          onSelect={context.addStatusBarItem}
          choices={statusBarChoices}
        />
      </div>

      {context.state.statusBar && context.state.statusBar.elements && context.state.statusBar.elements.length > 0 && (
          <div className="bg-gray-300 rounded-lg flex-1 mb-4 h-16 min-h-16">
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
                      {context.state.statusBar.elements!.map((item: string, index: number) => (
                      <StatusBarElement
                          key={item}
                          item={item}
                          index={index}
                          onDelete={() => context.removeStatusBarItem(index)}
                      />
                      ))}
                      {provided.placeholder}
                  </div>
                  )}
              </Droppable>
              </DragDropContext>
          </div>
      )}

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
            checked={context.state.layout === 'spaced'}
            onValueChange={handleLayoutTypeChange}
          />
          <Switch
            name='orientation'
            checkedLabel={'Portrait'}
            uncheckedLabel={'Landscape'}
            checkedIcon={Smartphone}
            uncheckedIcon={Monitor}
            checked={context.state.orientation === 'portrait'}
            onValueChange={handleOrientationChange}
          />
        </Form>
      </div>

      <div className="bg-gray-300 relative" style={{
        borderRadius: context.state.layout === 'spaced' ? '8px' : '0px',
        aspectRatio: context.state.orientation === 'portrait' ? '9/16' : '16/9',
        maxWidth: context.state.orientation === 'portrait' ? '600px' : '100%',
        minHeight: context.state.orientation === 'portrait' ? '800px' : '450px',
        margin: context.state.orientation === 'portrait' ? '0 auto' : '0'
      }}>
        {/* Aspect ratio indicator */}
        <div className="absolute top-2 left-2 bg-black/20 text-white text-xs px-2 py-1 rounded backdrop-blur-sm z-10">
          {context.state.orientation === 'portrait' ? '9:16' : '16:9'} • {context.state.orientation === 'portrait' ? '9×16' : '16×9'}
        </div>
        <GridLayoutWithWidth
          layout={rglLayout}
          cols={context.state.orientation === 'portrait' ? 9 : 16}
          onLayoutChange={handleLayoutChange}
          draggableCancel={'.ReactModalPortal,.controls,button'}
          margin={context.state.layout === 'spaced' ? [12, 12] : [6, 6]}
          rowHeight={context.state.orientation === 'portrait' ? 40 : 60}
          isBounded={true}
          useCSSTransforms={true}
          transformScale={1}
          preventCollision={true}
          compactType="vertical"
          maxRows={context.state.orientation === 'portrait' ? 16 : 9}
        >
          {widgets.map(widget => (
            <div key={widget._id}>
              <EditableWidget
                id={widget._id}
                type={widget.type as WidgetType}
                onDelete={() => handleDeleteWidget(widget._id)}
                layout={context.state.layout || 'compact'}
              />
            </div>
          ))}
        </GridLayoutWithWidth>
      </div>
      
    </Frame>
  )
})

export default function LayoutAdminPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LayoutAdminContent />
    </Suspense>
  )
}