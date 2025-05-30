import React from 'react';
import { NextPage, NextPageContext } from 'next'; // For typing Next.js specific props if needed
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faThLarge, faTh, faPencilAlt, IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import GridLayout, { Layout as RglLayout, Layouts as RglLayouts } from 'react-grid-layout';
import { view } from 'react-easy-state';
import { DragDropContext, Droppable, DropResult, DroppableProvided } from 'react-beautiful-dnd';

import Frame from '../components/Admin/Frame'; // Assuming .js or .tsx
import EditableWidget from '../components/Admin/EditableWidget'; // Assuming .js or .tsx
import StatusBarElement from '../components/Admin/StatusBarElement'; // Assuming .js or .tsx
import WidthProvider from '../components/Widgets/WidthProvider'; // Assuming .js or .tsx
import DropdownButton, { IDropdownChoice } from '../components/DropdownButton'; // Already .tsx

import { Form, Switch } from '../components/Form'; // Assuming .js or .tsx

import { StatusBarElementTypes, IStatusBarElementDefinition } from '../helpers/statusbar'; // Assuming statusbar.js will be typed

import Widgets, { IWidgetDefinition } from '../widgets'; // Assuming widgets/index.js will be typed

import { addWidget, getWidgets, deleteWidget, updateWidget, IWidgetData, INewWidgetData, IUpdateWidgetData } from '../actions/widgets'; // Already .tsx
import { WidgetType } from '../api/models/Widget';
import { protect } from '../helpers/auth'; // Assuming auth.js will be typed or allowJs
import { display as displayStore } from '../stores'; // Already .tsx

const GridLayoutWithWidth = WidthProvider(GridLayout as any);

interface ILayoutPageProps {
  displayId: string; // Assuming protect HOC ensures displayId is available
  loggedIn?: boolean; // From protect HOC or similar
  // host?: string; // If needed for actions, though actions have default host
}

interface ILayoutPageState {
  widgets: IWidgetData[];
}

class LayoutPage extends React.Component<ILayoutPageProps, ILayoutPageState> {
  constructor(props: ILayoutPageProps) {
    super(props);
    this.state = {
      widgets: [], // Initialize with empty, fetched in componentDidMount
    };
  }

  // Example if getInitialProps were directly on this page (though protect HOC handles it)
  // static async getInitialProps(ctx: NextPageContext): Promise<ILayoutPageProps> {
  //   const displayId = typeof ctx.query.displayId === 'string' ? ctx.query.displayId : 'defaultDisplayId';
  //   // Potentially fetch initial widgets here if SSR for widgets is desired
  //   return { displayId, loggedIn: true /* or from session */ };
  // }

  componentDidMount() {
    const { displayId } = this.props;
    if (displayId) {
      displayStore.setId(displayId);
      this.refreshWidgets(displayId);
    }
  }

  componentDidUpdate(prevProps: ILayoutPageProps) {
    if (prevProps.displayId !== this.props.displayId && this.props.displayId) {
      displayStore.setId(this.props.displayId);
      this.refreshWidgets(this.props.displayId);
    }
  }

  refreshWidgets = (displayId: string): Promise<void> => {
    return getWidgets(displayId).then(widgets => {
      this.setState({ widgets });
    }).catch(error => {
      console.error("Failed to refresh widgets:", error);
      this.setState({ widgets: [] }); // Reset or handle error appropriately
    });
  }

  handleAddWidget = (type: string): void => {
    const widgetDefinition: IWidgetDefinition | undefined = Widgets[type];
    const newWidgetData: Partial<INewWidgetData> = { // Construct data for addWidget action
        display: displayStore.id!, // displayStore.id should be set
        type: type as WidgetType,
        data: widgetDefinition?.defaultData || {},
        // x, y, w, h can be omitted if server assigns defaults or if not needed immediately
    };

    addWidget(newWidgetData as INewWidgetData) // Type assertion if confident structure is met
        .then(() => this.refreshWidgets(displayStore.id!))
        .catch(error => console.error("Failed to add widget:", error));
  }

  handleDeleteWidget = (id: string): void => {
    deleteWidget(id)
        .then(() => this.refreshWidgets(displayStore.id!))
        .catch(error => console.error("Failed to delete widget:", error));
  }

  handleLayoutChange = (layout: RglLayout[]): void => {
    for (const widgetLayout of layout) {
      const widgetData: IUpdateWidgetData = {
        x: widgetLayout.x,
        y: widgetLayout.y,
        w: widgetLayout.w,
        h: widgetLayout.h,
      };
      updateWidget(widgetLayout.i, widgetData)
        .catch(error => console.error(`Failed to update widget ${widgetLayout.i} layout:`, error));
      // Note: No refreshWidgets here to avoid jumpiness; optimistic update or server should confirm.
    }
  }

  handleDragEnd = (result: DropResult): void => {
    if (!result.destination || !displayStore.id) {
      return;
    }
    displayStore.reorderStatusBarItems(result.source.index, result.destination.index);
  }

  handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const title = event.target.value;
    displayStore.updateName(title); // updateName is debounced in the store
  }
  
  handleLayoutTypeChange = (name: string, checked: boolean): void => {
    displayStore.updateLayout(checked ? 'spaced' : 'compact');
  }

  render() {
    const { widgets } = this.state;
    const { loggedIn } = this.props;

    const rglLayout: RglLayout[] = widgets.map(widget => ({
      i: widget._id,
      x: widget.x || 0,
      y: widget.y || 0,
      w: widget.w || 1,
      h: widget.h || 1,
      // Add min/max W/H if needed, or isDraggable/isResizable per item
    }));

    const statusBarChoices: IDropdownChoice[] = Object.keys(StatusBarElementTypes).map(key => {
      const elType = StatusBarElementTypes[key as keyof typeof StatusBarElementTypes] as IStatusBarElementDefinition;
      return {
        key: key,
        name: elType.name,
        icon: elType.icon as IconDefinition, // Cast if confident icon is always IconDefinition
      };
    });

    const widgetChoices: IDropdownChoice[] = Object.keys(Widgets).map(key => {
        const widgetDef = Widgets[key];
        return {
            key: widgetDef.type || key, // Assuming Widgets might have a 'type' field or key is the type
            name: widgetDef.name,
            icon: widgetDef.icon as IconDefinition,
        };
    });

    return (
      <Frame loggedIn={loggedIn}>
        <div className={'head'}>
          <h1>Layout</h1>
          <div className='editable-title'>
            <input
              className='input'
              placeholder='Unnamed display'
              value={displayStore.name || ''}
              onChange={this.handleTitleChange}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              size={(displayStore.name && displayStore.name.length > 0) ? displayStore.name.length : undefined}
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
            onSelect={displayStore.addStatusBarItem}
            choices={statusBarChoices}
          />
        </div>

        {displayStore.statusBar && displayStore.statusBar.elements && displayStore.statusBar.elements.length > 0 && (
            <div className='statusbar'>
                <DragDropContext onDragEnd={this.handleDragEnd}>
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
                        {displayStore.statusBar.elements!.map((item: string, index: number) => ( // Added type for item
                        <StatusBarElement
                            key={item} // Assuming item is unique like 'type_id'
                            item={item}
                            index={index}
                            onDelete={() => displayStore.removeStatusBarItem(index)}
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
            onSelect={this.handleAddWidget}
            choices={widgetChoices}
          />
          <Form>
            <Switch
              name="layoutStyle" // Added name prop for Switch
              checkedLabel={'Compact'}
              uncheckedLabel={'Spaced'}
              checkedIcon={faTh}
              uncheckedIcon={faThLarge}
              checked={displayStore.layout === 'spaced'}
              onValueChange={this.handleLayoutTypeChange}
            />
          </Form>
        </div>

        <div className='layout' style={{ borderRadius: displayStore.layout === 'spaced' ? '8px' : '0px' }}>
          <GridLayoutWithWidth
            layout={rglLayout}
            cols={6}
            onLayoutChange={this.handleLayoutChange}
            draggableCancel={'.ReactModalPortal,.controls'} // CSS selectors
            margin={displayStore.layout === 'spaced' ? [12, 12] : [4, 4]}
            rowHeight={100} // Example, adjust as needed
            isBounded={true} // Example, prevent items from dragging out of bounds
          >
            {widgets.map(widget => (
              <div key={widget._id}>
                <EditableWidget
                  id={widget._id}
                  type={widget.type as string} // Cast if widget.type is more specific than string
                  onDelete={() => this.handleDeleteWidget(widget._id)}
                  layout={displayStore.layout || 'compact'} // Provide a default if layout can be null
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
    );
  }
}

// Assuming protect HOC is typed to accept a React.ComponentType
// and returns a React.ComponentType with compatible props.
// If protect injects props, ILayoutPageProps should reflect that.
export default protect(view(LayoutPage));
