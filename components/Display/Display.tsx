import React, { Component, CSSProperties } from 'react';
import GridLayout, { Layout as RglLayout } from 'react-grid-layout'; // Import RglLayout type
import _ from 'lodash';
import { view } from 'react-easy-state';

import Frame from './Frame'; // Frame.tsx
import HeightProvider from '../Widgets/HeightProvider'; // Assuming .js or .tsx (HeightProvider.js)
import Widgets from '../../widgets'; // ../../widgets/index.ts (exports Record<string, IBaseWidget>)
import EmptyWidget from '../Widgets/EmptyWidget'; // Assuming .js or .tsx (EmptyWidget.js)

import { getDisplay, IDisplayData as FullDisplayData, IWidgetData } from '../../actions/display'; // Types from display actions
import { IBaseWidget } from '../../widgets/base_widget'; // Type for individual widget definition

// --- Component Props and State ---
export type DisplayLayoutType = 'spaced' | 'compact';

export interface IDisplayComponentProps {
  // host prop was in pages/display.tsx but not used by this Display component directly.
  // If needed for constructing SSE URL or other purposes, it should be added.
  // For now, assuming SSE URL is relative or host is configured elsewhere.
  display: string | undefined; // The display ID (from URL/props)
}

interface IDisplayComponentState {
  widgets: IWidgetData[];
  layout: DisplayLayoutType;
  statusBar: string[]; // Or a more structured type if Frame.tsx's statusBar prop evolves
  // No explicit loading/error state in original, relies on empty/default renders
}

// --- Constants ---
const DEFAULT_STATUS_BAR: string[] = [];
const DEFAULT_LAYOUT: DisplayLayoutType = 'spaced';

class Display extends Component<IDisplayComponentProps, IDisplayComponentState> {
  private throttledRefresh: () => void;
  private eventSource: EventSource | null = null;
  private container: HTMLDivElement | null = null; // Ref for HeightProvider

  constructor(props: IDisplayComponentProps) {
    super(props);
    this.state = {
      widgets: [],
      layout: DEFAULT_LAYOUT,
      statusBar: DEFAULT_STATUS_BAR,
    };
    this.throttledRefresh = _.debounce(this.refresh, 1500);
  }

  componentDidMount() {
    this.refresh(); // Initial data load
    this.setupSSE();
  }

  componentDidUpdate(prevProps: IDisplayComponentProps) {
    if (prevProps.display !== this.props.display) {
      this.refresh(); // Refresh data for the new display ID
      this.setupSSE(); // Re-initialize SSE for the new display ID
    }
  }

  componentWillUnmount() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    // Cancel any pending debounced refresh calls
    this.throttledRefresh.cancel();
  }

  setupSSE = (): void => {
    // Close existing connection if any
    if (this.eventSource) {
      this.eventSource.close();
    }

    if (this.props.display) {
      const sseUrl = `/api/v1/displays/${this.props.display}/events`;
      this.eventSource = new EventSource(sseUrl);

      this.eventSource.addEventListener('display_updated', (event: MessageEvent) => {
        console.log('SSE event "display_updated" received:', event.data);
        // Potentially parse event.data if it contains specific info about what changed
        // const eventData = JSON.parse(event.data);
        this.throttledRefresh();
      });

      this.eventSource.onerror = (err: Event) => { // Event is generic, could be more specific if error structure is known
        console.error('EventSource failed:', err);
        // Optional: Implement reconnection logic or error display
      };

      this.eventSource.addEventListener('connected', (event: MessageEvent) => {
        try {
            const eventData = JSON.parse(event.data);
            console.log('SSE connection established:', eventData);
        } catch (e) {
            console.error("Failed to parse 'connected' event data:", e, event.data);
        }
      });
    }
  };

  refresh = (): void => {
    const { display: displayId } = this.props;
    if (!displayId) {
      // Reset state if displayId is undefined (e.g., navigating away or error)
      this.setState({
        widgets: [],
        layout: DEFAULT_LAYOUT,
        statusBar: DEFAULT_STATUS_BAR,
      });
      return;
    }

    getDisplay(displayId)
      .then((displayData: FullDisplayData) => { // getDisplay returns FullDisplayData
        this.setState({
          widgets: displayData.widgets || [], // Ensure widgets is always an array
          layout: (displayData.layout as DisplayLayoutType) || DEFAULT_LAYOUT, // Cast layout if necessary
          statusBar: displayData.statusBar?.elements || DEFAULT_STATUS_BAR, // Assuming statusBar in FullDisplayData matches this structure
        });
      })
      .catch(error => {
        console.error(`Failed to get display data for ${displayId}:`, error);
        // Optionally set an error state or clear existing data
        this.setState({
          widgets: [],
          layout: DEFAULT_LAYOUT,
          statusBar: DEFAULT_STATUS_BAR,
        });
      });
  };

  render() {
    const { widgets, layout, statusBar } = this.state;

    // Prepare layout for react-grid-layout
    const rglWidgetLayout: RglLayout[] = widgets.map((widget: IWidgetData) => ({
      i: widget._id, // react-grid-layout uses 'i' for id
      x: widget.x || 0,
      y: widget.y || 0,
      w: widget.w || 1,
      h: widget.h || 1,
      // Add other RGL properties if needed: minW, maxW, isDraggable, isResizable etc.
    }));

    // HeightProvider HOC
    const GridLayoutWithHeight = HeightProvider(GridLayout, this.container, layout);
    // The props for GridLayoutWithHeight would be GridLayoutProps from 'react-grid-layout'
    // For now, casting to 'any' to avoid deep typing of HOCs if HeightProvider is still JS.
    // If HeightProvider is TSX, it should correctly type the returned component.
    const RglComponent = GridLayoutWithHeight as any;


    return (
      // Frame.tsx statusBar prop expects string[] currently.
      // If IDisplayData.statusBar is more complex (e.g. { enabled, color, elements }),
      // then Frame prop or this mapping needs adjustment.
      // Current Frame.tsx expects string[] (item identifiers).
      // Assuming this.state.statusBar (from displayData.statusBar.elements) is string[]
      <Frame statusBar={statusBar}>
        <div className={'gridContainer'} ref={ref => (this.container = ref)}>
          <RglComponent
            className='layout' // Default class, react-grid-layout uses this
            isDraggable={false} // From original JS
            isResizable={false} // From original JS
            layout={rglWidgetLayout}
            cols={6} // From original JS
            rowHeight={this.container ? this.container.clientHeight / (layout === 'compact' ? 12 : 10) : 50} // Example dynamic rowHeight
            margin={layout === 'spaced' ? ([10, 10] as [number, number]) : ([0, 0] as [number, number])} // From original JS
            // Other RGL props: width, autoSize, compactType, etc.
          >
            {widgets.map((widget: IWidgetData) => {
              // Widgets is Record<string, IBaseWidget>
              // widget.type is string (e.g. "announcement")
              const WidgetDefinition: IBaseWidget | undefined = Widgets[widget.type];
              const WidgetComponent = WidgetDefinition ? WidgetDefinition.Widget : EmptyWidget;
              
              // Key for RGL items must be string, widget._id is string.
              return (
                <div key={widget._id} className={'widget-wrapper'}> {/* Renamed class */}
                  {/* Pass widget-specific data to the WidgetComponent */}
                  {/* Also pass isPreview or other context if needed */}
                  <WidgetComponent data={widget.data} />
                </div>
              );
            })}
          </RglComponent>
          <style jsx>
            {`
              .gridContainer {
                flex: 1;
                overflow: hidden; /* Important for RGL and scrolling */
                margin-bottom: ${layout === 'spaced' ? '10px' : '0px'};
                /* background: #eee; */ /* Optional: for visualizing grid container */
              }
              .widget-wrapper { /* Renamed from .widget */
                border-radius: ${layout === 'spaced' ? '6px' : '0px'};
                overflow: hidden; /* Clip widget content */
                background-color: rgba(200,200,200,0.1); /* Example placeholder background */
                /* Add transition for smooth resize/move if RGL animations are on */
              }
            `}
          </style>
        </div>
      </Frame>
    );
  }
}

export default view(Display);
