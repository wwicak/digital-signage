import React, { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import { GridStack, GridStackWidget, GridStackOptions } from 'gridstack'
import 'gridstack/dist/gridstack.min.css'

export interface GridStackItem {
  id: string
  x?: number
  y?: number
  w?: number
  h?: number
  minW?: number
  maxW?: number
  minH?: number
  maxH?: number
  noResize?: boolean
  noMove?: boolean
  locked?: boolean
  content?: React.ReactNode
  widgetType?: string
}

export interface GridStackWrapperProps {
  items: GridStackItem[]
  options?: GridStackOptions
  onLayoutChange?: (items: GridStackItem[]) => void
  onDragStart?: (event: Event, element: Element) => void
  onDragStop?: (event: Event, element: Element) => void
  onResizeStart?: (event: Event, element: Element) => void
  onResizeStop?: (event: Event, element: Element) => void
  onAdded?: (event: Event, items: GridStackWidget[]) => void
  onRemoved?: (event: Event, items: GridStackWidget[]) => void
  className?: string
  children?: React.ReactNode
}

export interface GridStackWrapperRef {
  addWidget: (widget: GridStackItem) => void
  removeWidget: (id: string) => void
  removeAll: () => void
  enableMove: (enable: boolean) => void
  enableResize: (enable: boolean) => void
  getGridItems: () => GridStackItem[]
  autoArrange: () => void
}

const GridStackWrapper = forwardRef<GridStackWrapperRef, GridStackWrapperProps>(({
  items = [],
  options = {},
  onLayoutChange,
  onDragStart,
  onDragStop,
  onResizeStart,
  onResizeStop,
  onAdded,
  onRemoved,
  className = '',
  children
}, ref) => {
  const gridRef = useRef<HTMLDivElement>(null)
  const gridInstanceRef = useRef<GridStack | null>(null)
  const itemRefs = useRef<{ [key: string]: React.RefObject<HTMLDivElement | null> }>({})

  // Default GridStack options optimized for digital signage
  const defaultOptions: GridStackOptions = {
    float: true, // Allow free movement
    cellHeight: 'auto',
    minRow: 1,
    margin: 12,
    resizable: {
      handles: 'se, sw, ne, nw, s, n, e, w'
    },
    draggable: {
      handle: '.gridstack-drag-handle',
      cancel: '.gridstack-no-drag'
    },
    acceptWidgets: true,
    removable: false,
    ...options
  }

  // Create refs for items
  useEffect(() => {
    const newRefs: { [key: string]: React.RefObject<HTMLDivElement | null> } = {}
    items.forEach(item => {
      if (!itemRefs.current[item.id]) {
        newRefs[item.id] = React.createRef<HTMLDivElement>()
      } else {
        newRefs[item.id] = itemRefs.current[item.id]
      }
    })
    itemRefs.current = newRefs
  }, [items])

  // Initialize GridStack
useEffect(() => {
    if (!gridRef.current) return

    // If an instance already exists, destroy it before creating a new one
    if (gridInstanceRef.current) {
      gridInstanceRef.current.destroy(false) // `false` to preserve DOM nodes for React
    }

    const finalOptions = {
        ...defaultOptions,
        ...options
    };

    // Initialize GridStack instance. It will automatically discover and initialize grid items.
    gridInstanceRef.current = GridStack.init(finalOptions, gridRef.current)
    const grid = gridInstanceRef.current

    // --- EVENT LISTENERS ---
    if (onDragStart) grid.on('dragstart', onDragStart)
    if (onDragStop) grid.on('dragstop', onDragStop)
    if (onResizeStart) grid.on('resizestart', onResizeStart)
    if (onResizeStop) grid.on('resizestop', onResizeStop)
    if (onAdded) grid.on('added', onAdded)
    if (onRemoved) grid.on('removed', onRemoved)

    // Layout change handler
    if (onLayoutChange) {
      const handleChange = () => {
        if (!grid) return;
        const currentItems = grid.save(false) as GridStackItem[]
        onLayoutChange(currentItems)
      }
      grid.on('change', handleChange)
    }

    // Cleanup function
    return () => {
      if (gridInstanceRef.current) {
        try {
          gridInstanceRef.current.destroy(false)
        } catch (e) {
          // Can throw error if grid is already destroyed
        }
        gridInstanceRef.current = null
      }
    }
    // This effect should re-run when items change or when crucial grid options are modified.
  }, [items, options.column, options.maxRow, options.margin, onLayoutChange, onDragStart, onDragStop, onResizeStart, onResizeStop, onAdded, onRemoved])

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    addWidget: (widget: GridStackItem) => {
      if (gridInstanceRef.current) {
        const gridWidget: GridStackWidget = {
          x: widget.x,
          y: widget.y,
          w: widget.w,
          h: widget.h,
          minW: widget.minW,
          maxW: widget.maxW,
          minH: widget.minH,
          maxH: widget.maxH,
          noResize: widget.noResize,
          noMove: widget.noMove,
          locked: widget.locked,
        }
        gridInstanceRef.current.addWidget(gridWidget)
      }
    },
    
    removeWidget: (id: string) => {
      if (gridInstanceRef.current) {
        const element = gridRef.current?.querySelector(`[gs-id="${id}"]`)
        if (element) {
          gridInstanceRef.current.removeWidget(element as HTMLElement)
        }
      }
    },
    
    removeAll: () => {
      if (gridInstanceRef.current) {
        gridInstanceRef.current.removeAll()
      }
    },
    
    enableMove: (enable: boolean) => {
      if (gridInstanceRef.current) {
        gridInstanceRef.current.enableMove(enable)
      }
    },
    
    enableResize: (enable: boolean) => {
      if (gridInstanceRef.current) {
        gridInstanceRef.current.enableResize(enable)
      }
    },
    
    getGridItems: () => {
      if (gridInstanceRef.current) {
        return gridInstanceRef.current.save(false) as GridStackItem[]
      }
      return []
    },
    
    autoArrange: () => {
      if (gridInstanceRef.current) {
        // GridStack doesn't have built-in auto-arrange, but we can implement basic logic
        const currentItems = gridInstanceRef.current.save(false) as any[]
        let x = 0, y = 0
        const cols = gridInstanceRef.current.getColumn()

        currentItems.forEach((item: any, index: number) => {
          if (x + (item.w || 1) > cols) {
            x = 0
            y += item.h || 1
          }

          if (item.el) {
            gridInstanceRef.current?.update(item.el as HTMLElement, { x, y })
          }
          x += item.w || 1
        })
      }
    }
  }), [items, options.column, options.margin])

  return (
    <div 
      ref={gridRef} 
      className={`grid-stack ${className}`}
      style={{ minHeight: '400px' }}
    >
      {items.map(item => (
        <div
          key={item.id}
          ref={itemRefs.current[item.id]}
          className="grid-stack-item"
          gs-id={item.id}
          gs-x={item.x}
          gs-y={item.y}
          gs-w={item.w}
          gs-h={item.h}
          gs-min-w={item.minW}
          gs-max-w={item.maxW}
          gs-min-h={item.minH}
          gs-max-h={item.maxH}
          gs-no-resize={item.noResize}
          gs-no-move={item.noMove}
          gs-locked={item.locked}
        >
          <div className="grid-stack-item-content">
            {item.content || children}
          </div>
        </div>
      ))}
    </div>
  )
})

GridStackWrapper.displayName = 'GridStackWrapper'

export default GridStackWrapper
