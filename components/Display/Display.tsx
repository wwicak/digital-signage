import React, { useEffect, useRef, useMemo, useCallback } from 'react'
import GridLayout, { Layout as RglLayout } from 'react-grid-layout'
import _ from 'lodash'

import Frame from './Frame'
import HeightProvider from '../Widgets/HeightProvider'
import Widgets from '../../widgets'
import EmptyWidget from '../Widgets/EmptyWidget'
import { IBaseWidget } from '../../widgets/base_widget'
import { useDisplayContext } from '../../contexts/DisplayContext'

// --- Component Props and State ---
export type DisplayLayoutType = 'spaced' | 'compact';
import * as z from 'zod'

export const DisplayComponentPropsSchema = z.object({
  display: z.string().optional(),
})
export type IDisplayComponentProps = z.infer<typeof DisplayComponentPropsSchema>;

// --- Constants ---
const DEFAULT_STATUS_BAR: string[] = []
const DEFAULT_LAYOUT: DisplayLayoutType = 'spaced'

const Display: React.FC<IDisplayComponentProps> = React.memo(({ display }) => {
  const { state, setId, refreshDisplayData } = useDisplayContext()
  const eventSourceRef = useRef<EventSource | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Create a debounced refresh function for SSE events using React Query invalidation
  const refreshDisplay = useMemo(() => _.debounce(() => {
    refreshDisplayData()
  }, 500), [refreshDisplayData]) // Reduced debounce time since invalidation is more efficient

  const setupSSE = (): void => {
    // Close existing connection if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    if (display) {
      const sseUrl = `/api/v1/displays/${display}/events`
      eventSourceRef.current = new EventSource(sseUrl)

      eventSourceRef.current.addEventListener('display_updated', (event: MessageEvent) => {
        console.log('SSE event "display_updated" received:', event.data)
        // Trigger a refresh via the context
        refreshDisplay()
      })

      eventSourceRef.current.onerror = (err: Event) => {
        console.error('EventSource failed:', err)
        // Optional: Implement reconnection logic or error display
      }

      eventSourceRef.current.addEventListener('connected', (event: MessageEvent) => {
        try {
            const eventData = JSON.parse(event.data)
            console.log('SSE connection established:', eventData)
        } catch (e) {
            console.error("Failed to parse 'connected' event data:", e, event.data)
        }
      })
    }
  }
  useEffect(() => {
    if (display) {
      setId(display) // This will trigger the data fetch via context
    }
    setupSSE()

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      // Cancel any pending debounced refresh calls
      refreshDisplay.cancel()
    }
  }, [display, setId, refreshDisplay])

  // Memoize layout for react-grid-layout to prevent unnecessary re-renders
  const rglWidgetLayout: RglLayout[] = useMemo(() =>
    (state.widgets || []).map((widget: any) => ({
      i: widget._id, // react-grid-layout uses 'i' for id
      x: widget.x || 0,
      y: widget.y || 0,
      w: widget.w || 1,
      h: widget.h || 1,
      // Add other RGL properties if needed: minW, maxW, isDraggable, isResizable etc.
    }))
  , [state.widgets])

  // Memoize layout setting and grid component
  const currentLayout = useMemo(() => state.layout || DEFAULT_LAYOUT, [state.layout])
  const RglComponent = useMemo(() =>
    HeightProvider(GridLayout as any, containerRef.current, currentLayout) as any
  , [currentLayout])

  // Memoize margin calculation for stable props
  const gridMargin = useMemo(() =>
    currentLayout === 'spaced' ? [10, 10] as [number, number] : [0, 0] as [number, number]
  , [currentLayout])

  // Memoize widget rendering for performance
  const renderWidget = useCallback((widget: any) => {
    const WidgetDefinition: IBaseWidget | undefined = Widgets[widget.type]
    const WidgetComponent = WidgetDefinition ? WidgetDefinition.Widget : EmptyWidget

    return (
      <div
        key={widget._id}
        className={`w-full h-full overflow-hidden transition-all duration-300 ease-in-out bg-gray-100 bg-opacity-10 ${
          currentLayout === 'spaced' ? 'rounded-md' : 'rounded-none'
        } ${isPortrait ? 'min-h-[120px]' : ''}`}
      >
        <WidgetComponent {...(widget.data ? { data: widget.data } : {})} />
      </div>
    )
  }, [currentLayout, isPortrait])

  // Determine orientation-specific styling and grid configuration
  const isPortrait = state.orientation === 'portrait'
  const orientationClass = isPortrait ? 'portrait-display' : 'landscape-display'
  
  // Adjust grid columns based on orientation for better layout
  const gridCols = isPortrait ? 4 : 6 // Fewer columns in portrait for better widget sizing

  return (
    /*
     * Frame.tsx statusBar prop expects string[] currently.
     * If IDisplayData.statusBar is more complex (e.g. { enabled, color, elements }),
     * then Frame prop or this mapping needs adjustment.
     * Current Frame.tsx expects string[] (item identifiers).
     * Assuming this.state.statusBar (from displayData.statusBar.elements) is string[]
     */
    <Frame statusBar={state.statusBar?.elements || DEFAULT_STATUS_BAR} orientation={state.orientation}>
      <div
        className={`flex-1 overflow-hidden transition-all duration-300 ease-in-out ${
          currentLayout === 'spaced' ? 'mb-2' : 'mb-0'
        } ${orientationClass}`}
        ref={containerRef}
        style={{
          marginBottom: currentLayout === 'spaced' ? '10px' : '0px'
        }}
      >
        <RglComponent
          className='layout' // Default class, react-grid-layout uses this
          isDraggable={false} // From original JS
          isResizable={false} // From original JS
          layout={rglWidgetLayout}
          cols={gridCols} // Dynamic columns based on orientation
          margin={gridMargin}
          /*
           * rowHeight is now handled by HeightProvider HOC for stability
           * Other RGL props: width, autoSize, compactType, etc.
           */
        >
          {state.widgets.map(renderWidget)}
        </RglComponent>

      </div>
    </Frame>
  )
})

Display.displayName = 'Display'

export default Display
