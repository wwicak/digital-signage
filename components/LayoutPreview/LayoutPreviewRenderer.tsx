import React, { useMemo } from 'react'
import GridStackWrapper, { GridStackItem } from '../GridStack/GridStackWrapper'
import Widgets from '../../widgets'
import styles from './LayoutPreview.module.css'

interface LayoutWidget {
  widget_id?: any
  x?: number
  y?: number
  w?: number
  h?: number
}

interface Layout {
  _id: string
  name: string
  description?: string
  orientation: 'landscape' | 'portrait'
  layoutType: 'spaced' | 'compact'
  widgets: LayoutWidget[]
  gridConfig?: {
    cols?: number
    rows?: number
    margin?: [number, number]
    rowHeight?: number
  }
}

interface WidgetObjectData {
  _id: string
  type: string
  data?: Record<string, unknown>
  [key: string]: unknown
}

interface LayoutPreviewRendererProps {
  layout: Layout
  className?: string
}

const LayoutPreviewRenderer: React.FC<LayoutPreviewRendererProps> = ({
  layout,
  className = ''
}) => {
  // Determine orientation-specific styling and grid configuration
  const isPortrait = layout.orientation === 'portrait'
  const gridCols = isPortrait ? 9 : 16 // Portrait: 9 cols (9:16), Landscape: 16 cols (16:9)

  // Memoize layout for GridStack to prevent unnecessary re-renders
  const gridStackItems: GridStackItem[] = useMemo(
    () =>
      (layout.widgets || [])
        .map((widget: LayoutWidget) => {
          // Skip if no widget data
          if (!widget?.widget_id) return null

          // Get the widget definition data
          const widgetData = widget.widget_id
          if (typeof widgetData !== 'object' || widgetData === null) {
            console.error('Widget data is not an object:', widgetData)
            return null
          }

          // Type guard to ensure we have the expected structure
          const isValidWidgetData = (data: unknown): data is WidgetObjectData => {
            return (
              typeof data === 'object' &&
              data !== null &&
              typeof (data as WidgetObjectData)._id === 'string' &&
              typeof (data as WidgetObjectData).type === 'string'
            )
          }

          if (!isValidWidgetData(widgetData)) {
            console.error('Invalid widget data structure:', widget)
            return null
          }

          // Type normalization
          const widgetType = (widgetData.type || '').toLowerCase()

          // Get the component from our widgets registry
          let widgetDef
          const matchingKey = Object.keys(Widgets).find(key =>
            key.toLowerCase() === widgetType ||
            key === widgetData.type // try exact match too
          )

          if (matchingKey) {
            widgetDef = Widgets[matchingKey]
          }

          if (!widgetDef) {
            console.error(
              `Widget type "${widgetData.type}" not found in registry. Available types:`,
              Object.keys(Widgets).join(', ')
            )
            return {
              id: widgetData._id,
              x: widget.x || 0,
              y: widget.y || 0,
              w: widget.w || 1,
              h: widget.h || 1,
              content: (
                <div className='flex items-center justify-center h-full bg-red-100 text-red-600 p-2 text-sm'>
                  <div className='text-center'>
                    <div className='font-semibold'>Unknown Widget</div>
                    <div>{widgetData.type}</div>
                  </div>
                </div>
              )
            }
          }

          return {
            id: widgetData._id,
            x: widget.x || 0,
            y: widget.y || 0,
            w: widget.w || 1,
            h: widget.h || 1,
            content: widgetDef.Widget ? (
              <div className={styles.widgetPreviewContainer}>
                <widgetDef.Widget
                  key={widgetData._id}
                  data={widgetData.data || {}}
                  isPreview={true}
                />
              </div>
            ) : (
              <div className='flex items-center justify-center h-full bg-gray-100 text-gray-600 p-2 text-sm'>
                <div className='text-center'>
                  <div className='font-semibold'>No Widget Component</div>
                  <div>{widgetData.type}</div>
                </div>
              </div>
            )
          }
        })
        .filter(Boolean) as GridStackItem[], // Remove any null items
    [layout.widgets]
  )

  // Memoize margin calculation for stable props
  const gridMargin = useMemo(
    () =>
      layout.layoutType === 'spaced'
        ? ([2, 2] as [number, number])
        : ([0, 0] as [number, number]),
    [layout.layoutType]
  )

  return (
    <div className={`${styles.previewContainer} ${className}`}>
      <GridStackWrapper
        items={gridStackItems}
        options={{
          float: true,
          cellHeight: 'auto',
          margin: layout.layoutType === 'spaced' ? '2' : '0',
          column: layout.gridConfig?.cols || gridCols,
          staticGrid: true, // Make grid read-only for preview
          disableDrag: true,
          disableResize: true,
          animate: false, // Disable animations for better performance
        }}
        className={`${styles.previewGrid} w-full h-full`}
      />
    </div>
  )
}

export default LayoutPreviewRenderer