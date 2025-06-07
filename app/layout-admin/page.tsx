'use client'

import React, { useState, useEffect, useCallback, Suspense, memo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faThLarge, faTh, faPencilAlt } from '@fortawesome/free-solid-svg-icons'
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

import { addWidget, getWidgets, deleteWidget, updateWidget, IWidgetData, INewWidgetData, IUpdateWidgetData } from '../../actions/widgets'
import { WidgetType } from '../../lib/models/Widget'

const GridLayoutWithWidth = WidthProvider(GridLayout as any)

const LayoutAdminContent = memo(function LayoutAdminContent() {
  const [widgets, setWidgets] = useState<IWidgetData[]>([])
  const searchParams = useSearchParams()
  const context = useDisplayContext()

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

  const handleLayoutChange = (layout: RglLayout[]): void => {
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
  }

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

  const widgetChoices = Object.keys(Widgets).map(key => {
      const widgetDef = Widgets[key]
      return {
          key: widgetDef.type || key,
          name: widgetDef.name,
          icon: widgetDef.icon,
      }
  })

  return (
    <Frame loggedIn={true}>
      <div className={'head'}>
        <h1>Layout</h1>
        <div className='editable-title'>
          <input
            className='input'
            placeholder='Unnamed display'
            value={context.state.name || ''}
            onChange={handleTitleChange}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            size={(context.state.name && context.state.name.length > 0) ? context.state.name.length : undefined}
          />
          <div className='icon'>
            <FontAwesomeIcon icon={faPencilAlt} fixedWidth color='#828282' />
          </div>
        </div>
      </div>

      <div className='settings'>
        <DropdownButton
          icon={faPencilAlt}
          text='Add Status Bar Item'
          onSelect={context.addStatusBarItem}
          choices={statusBarChoices}
        />
      </div>

      {context.state.statusBar && context.state.statusBar.elements && context.state.statusBar.elements.length > 0 && (
          <div className='statusbar'>
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

      <div className='settings'>
        <DropdownButton
          icon={faPencilAlt}
          text='Add Widget'
          onSelect={handleAddWidget}
          choices={widgetChoices}
        />
        <Form>
          <Switch
            name='layoutStyle'
            checkedLabel={'Compact'}
            uncheckedLabel={'Spaced'}
            checkedIcon={faTh}
            uncheckedIcon={faThLarge}
            checked={context.state.layout === 'spaced'}
            onValueChange={handleLayoutTypeChange}
          />
        </Form>
      </div>

      <div className='layout' style={{ borderRadius: context.state.layout === 'spaced' ? '8px' : '0px' }}>
        <GridLayoutWithWidth
          layout={rglLayout}
          cols={6}
          onLayoutChange={handleLayoutChange}
          draggableCancel={'.ReactModalPortal,.controls'}
          margin={context.state.layout === 'spaced' ? [12, 12] : [4, 4]}
          rowHeight={100}
          isBounded={true}
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
      <style jsx>
        {`
          h1 {
            font-family: 'Open Sans', sans-serif;
            font-size: 24px;
            color: #4f4f4f;
            margin: 0px;
            display: inline-block;
            margin-right: 16px;
          }
          .head {
            margin-bottom: 24px;
            display: flex;
            flex-direction: row;
            align-items: center;
          }
          .layout {
            background: #dfdfdf;
          }
          .statusbar {
            background: #dfdfdf;
            border-radius: 8px;
            flex: 1;
            margin-bottom: 16px;
            height: 64px;
            min-height: 64px;
          }
          .settings {
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 16px;
          }
          .editable-title {
            display: inline-block;
            position: relative;
            margin-left: 16px;
            margin-right: 16px;
            border-bottom: 3px solid #aaa;
          }
          .editable-title .input {
            font-family: 'Open Sans', sans-serif;
            color: #666;
            background-color: transparent;
            min-height: 40px;
            border: none;
            outline: none;
            margin-right: 24px;
            font-size: 24px;
            font-weight: 600;
          }
          .editable-title .icon {
            position: absolute;
            right: 8px;
            top: 50%;
            margin-top: -8px;
          }
        `}
      </style>
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