/**
 * @fileoverview Shows the display frame and renders all the
 * widgets inside of it
 */

import React from 'react'
import GridLayout from 'react-grid-layout'
// import socketIOClient from 'socket.io-client' // Removed Socket.IO
import _ from 'lodash'
import { view } from 'react-easy-state'

import Frame from './Frame.js'
import HeightProvider from '../Widgets/HeightProvider'
import Widgets from '../../widgets'
import EmptyWidget from '../Widgets/EmptyWidget'

import { getDisplay } from '../../actions/display'

const DEFAULT_STATUS_BAR = []
const DEFAULT_LAYOUT = 'spaced'

class Display extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      widgets: [],
      layout: DEFAULT_LAYOUT,
      statusBar: DEFAULT_STATUS_BAR
    }
    this.throttledRefresh = _.debounce(this.refresh, 1500)
    this.eventSource = null; // Initialize eventSource
  }

  componentDidMount() {
    this.refresh()
    // const socket = socketIOClient() // Removed Socket.IO
    // socket.on('admin:update', () => this.throttledRefresh()) // Removed Socket.IO

    if (this.props.display) {
      const sseUrl = `/api/v1/displays/${this.props.display}/events`;
      this.eventSource = new EventSource(sseUrl);

      this.eventSource.addEventListener('display_updated', (event) => {
        // console.log('SSE event received:', event.data);
        // const eventData = JSON.parse(event.data);
        // console.log('Parsed SSE data:', eventData);
        this.throttledRefresh();
      });

      this.eventSource.onerror = (err) => {
        console.error('EventSource failed:', err);
        // Optionally, close and try to reconnect if necessary,
        // though EventSource handles some reconnection automatically.
        // this.eventSource.close(); // Be careful with auto-closing on any error.
      };

      this.eventSource.addEventListener('connected', (event) => {
        console.log('SSE connection established:', JSON.parse(event.data));
      });
    }
  }

  componentWillUnmount() {
    if (this.eventSource) {
      this.eventSource.close();
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.display !== this.props.display) {
      this.refresh(); // Refresh data for the new display

      // Close existing EventSource connection if it exists
      if (this.eventSource) {
        this.eventSource.close();
      }

      // Establish new EventSource connection for the new display ID
      if (this.props.display) { // Ensure display ID is present
        const sseUrl = `/api/v1/displays/${this.props.display}/events`;
        this.eventSource = new EventSource(sseUrl);

        this.eventSource.addEventListener('display_updated', (event) => {
          this.throttledRefresh();
        });

        this.eventSource.onerror = (err) => {
          console.error('EventSource failed:', err);
        };
        
        this.eventSource.addEventListener('connected', (event) => {
            console.log('SSE connection established for new display:', JSON.parse(event.data));
        });
      }
    }
  }

  refresh = () => {
    const { display } = this.props
    return getDisplay(display).then(({ widgets = [], layout, statusBar = DEFAULT_STATUS_BAR }) => {
      this.setState({ widgets, layout, statusBar })
    })
  }

  render() {
    const { widgets, layout, statusBar } = this.state
    const widgetLayout = widgets.map(widget => ({
      i: widget._id,
      x: widget.x || 0,
      y: widget.y || 0,
      w: widget.w || 1,
      h: widget.h || 1
    }))

    const GridLayoutWithHeight = HeightProvider(GridLayout, this.container, layout)

    return (
      <Frame statusBar={statusBar}>
        <div className={'gridContainer'} ref={ref => (this.container = ref)}>
          <GridLayoutWithHeight
            className='layout'
            isDraggable={false}
            isResizable={false}
            layout={widgetLayout}
            cols={6}
            margin={layout == 'spaced' ? [10, 10] : [0, 0]}
          >
            {widgets.map(widget => {
              const Widget = Widgets[widget.type] ? Widgets[widget.type].Widget : EmptyWidget
              return (
                <div key={widget._id} className={'widget'}>
                  <Widget data={widget.data} />
                </div>
              )
            })}
          </GridLayoutWithHeight>
          <style jsx>
            {`
              .gridContainer {
                flex: 1;
                overflow: hidden;
                margin-bottom: ${layout == 'spaced' ? 10 : 0}px;
              }
              .widget {
                border-radius: ${layout == 'spaced' ? 6 : 0}px;
                overflow: hidden;
              }
            `}
          </style>
        </div>
      </Frame>
    )
  }
}

export default view(Display)
