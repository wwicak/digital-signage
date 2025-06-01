import React, { useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faThLarge, faTh, faPencilAlt } from '@fortawesome/free-solid-svg-icons'
import { IconProp, IconDefinition } from '@fortawesome/fontawesome-svg-core'
import GridLayout, { Layout as RglLayout } from 'react-grid-layout'
import { DragDropContext, Droppable, DropResult, DroppableProvided } from '@hello-pangea/dnd'

import Frame from '../components/Admin/Frame' // Assuming .js or .tsx
import EditableWidget from '../components/Admin/EditableWidget' // Assuming .js or .tsx
import StatusBarElement from '../components/Admin/StatusBarElement' // Assuming .js or .tsx
import WidthProvider from '../components/Widgets/WidthProvider' // Assuming .js or .tsx
import DropdownButton, { IDropdownChoice } from '../components/DropdownButton' // Already .tsx

import { Form, Switch } from '../components/Form' // Assuming .js or .tsx

import { StatusBarElementTypes, IStatusBarElementDefinition } from '../helpers/statusbar' // Assuming statusbar.js will be typed

import Widgets, { IWidgetDefinition } from '../widgets' // Assuming widgets/index.js will be typed

import { addWidget, getWidgets, deleteWidget, updateWidget, IWidgetData, INewWidgetData, IUpdateWidgetData } from '../actions/widgets' // Already .tsx
import { WidgetType } from '../api/models/Widget'
import { protect, ProtectProps } from '../helpers/auth' // Assuming auth.js will be typed or allowJs
import { useDisplayContext } from '../contexts/DisplayContext'

const GridLayoutWithWidth = WidthProvider(GridLayout as any)

interface ILayoutPageProps extends ProtectProps {
  displayId?: string; // Assuming protect HOC ensures displayId is available
}

const LayoutPage: React.FC<ILayoutPageProps> = ({ loggedIn, displayId }) => {
  const [widgets, setWidgets] = useState<IWidgetData[]>([])
  const displayContext = useDisplayContext()

  useEffect(() => {
    if (displayId) {
      displayContext.setId(displayId)
      refreshWidgets(displayId)
    }
  }, [displayId, displayContext])

  const refreshWidgets = (displayId: string): Promise<void> => {
    return getWidgets(displayId).then(widgets => {
      setWidgets(widgets)
    }).catch(error => {
      console.error('Failed to refresh widgets:', error)
      setWidgets([]) // Reset or handle error appropriately
    })
  }

  const handleAddWidget = (type: string): void => {
    const widgetDefinition: IWidgetDefinition | undefined = Widgets[type]
    const newWidgetData: Partial<INewWidgetData> = { // Construct data for addWidget action
        display: displayContext.state.id!, // displayContext.state.id should be set
        type: type as WidgetType,
        data: widgetDefinition?.defaultData || {},
        // x, y, w, h can be omitted if server assigns defaults or if not needed immediately
    }

    addWidget(newWidgetData as INewWidgetData) // Type assertion if confident structure is met
        .then(() => refreshWidgets(displayContext.state.id!))
        .catch(error => console.error('Failed to add widget:', error))
  }

  const handleDeleteWidget = (id: string): void => {
    deleteWidget(id)
        .then(() => refreshWidgets(displayContext.state.id!))
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
      icon: elType.icon as IconDefinition, // Cast if confident icon is always IconDefinition
    }
  })

  const widgetChoices: IDropdownChoice[] = Object.keys(Widgets).map(key => {
      const widgetDef = Widgets[key]
      return {
          key: widgetDef.type || key, // Assuming Widgets might have a 'type' field or key is the type
          name: widgetDef.name,
          icon: widgetDef.icon as IconDefinition,
      }
  })

  return (
    <Frame loggedIn={loggedIn}>
      <div className={'head'}>
        <h1>Layout</h1>
        <div className='editable-title'>
          <input
            className='input'
            placeholder='Unnamed display'
            value={displayContext.state.name || ''}
            onChange={handleTitleChange}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            size={(displayContext.state.name && displayContext.state.name.length > 0) ? displayContext.state.name.length : undefined}
          />
          <div className='icon'>
            <FontAwesomeIcon icon={faPencilAlt} fixedWidth color='#828282' />
          </div>
        </div>
      </div>

      <div className='settings'>
        <DropdownButton
          icon={faPencilAlt as IconProp} // Example icon, adjust as needed
          text='Add Status Bar Item'
          onSelect={displayContext.addStatusBarItem}
          choices={statusBarChoices}
        />
      </div>

      {displayContext.state.statusBar && displayContext.state.statusBar.elements && displayContext.state.statusBar.elements.length > 0 && (
          <div className='statusbar'>
              <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId='droppable-statusbar' direction='horizontal'>
                  {(provided: DroppableProvided) => (
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
                      {displayContext.state.statusBar.elements!.map((item: string, index: number) => ( // Added type for item
                      <StatusBarElement
                          key={item} // Assuming item is unique like 'type_id'
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

      <div className='settings'>
        <DropdownButton
          icon={faPencilAlt as IconProp} // Example icon
          text='Add Widget'
          onSelect={handleAddWidget}
          choices={widgetChoices}
        />
        <Form>
          <Switch
            name='layoutStyle' // Added name prop for Switch
            checkedLabel={'Compact'}
            uncheckedLabel={'Spaced'}
            checkedIcon={faTh}
            uncheckedIcon={faThLarge}
            checked={displayContext.state.layout === 'spaced'}
            onValueChange={handleLayoutTypeChange}
          />
        </Form>
      </div>

      <div className='layout' style={{ borderRadius: displayContext.state.layout === 'spaced' ? '8px' : '0px' }}>
        <GridLayoutWithWidth
          layout={rglLayout}
          cols={6}
          onLayoutChange={handleLayoutChange}
          draggableCancel={'.ReactModalPortal,.controls'} // CSS selectors
          margin={displayContext.state.layout === 'spaced' ? [12, 12] : [4, 4]}
          rowHeight={100} // Example, adjust as needed
          isBounded={true} // Example, prevent items from dragging out of bounds
        >
          {widgets.map(widget => (
            <div key={widget._id}>
              <EditableWidget
                id={widget._id}
                type={widget.type as WidgetType} // Cast to the proper WidgetType enum
                onDelete={() => handleDeleteWidget(widget._id)}
                layout={displayContext.state.layout || 'compact'} // Provide a default if layout can be null
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
            /* border-radius is now dynamic via style prop */
          }
          .statusbar {
            background: #dfdfdf;
            border-radius: 8px;
            flex: 1;
            margin-bottom: 16px;
            height: 64px; /* Fixed height, ensure content fits or scrolls */
            min-height: 64px; /* Ensure it doesn't collapse */
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
            margin-top: -8px; /* Adjust if icon size changes */
          }
        `}
      </style>
    </Frame>
  )
}

// Removed view() HOC wrapping and only use protect HOC
export default protect(LayoutPage)
