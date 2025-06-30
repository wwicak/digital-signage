import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react' // Removed unused useCallback
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
    float: true, // Re-enable float but with proper collision prevention
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
    animate: false, // Disable animations that might cause layout thrashing
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
    if (!gridRef.current) return;

    // Initialize grid
    if (!gridInstanceRef.current) {
      gridInstanceRef.current = GridStack.init(defaultOptions, gridRef.current);
      const grid = gridInstanceRef.current;

      const handleUserChange = () => {
        if (onLayoutChange) {
          const currentItems = grid.save(false) as GridStackItem[];
          onLayoutChange(currentItems);
        }
      };

      // Implement drag and resize event handlers for better UX feedback
      if (onDragStart) grid.on('dragstart', onDragStart);
      grid.on('dragstop', handleUserChange);
      if (onDragStop) grid.on('dragstop', onDragStop);
      
      if (onResizeStart) grid.on('resizestart', onResizeStart);
      grid.on('resizestop', handleUserChange);
      if (onResizeStop) grid.on('resizestop', onResizeStop);
      
      if (onAdded) grid.on('added', onAdded);
      if (onRemoved) grid.on('removed', onRemoved);
    }
  }, [onLayoutChange, onDragStart, onDragStop, onResizeStart, onResizeStop, onAdded, onRemoved, defaultOptions]);

  // Sync items with grid
  useEffect(() => {
    const grid = gridInstanceRef.current;
    if (!grid) return;

    // Use batch update for better performance
    grid.batchUpdate();

    try {
      // Get current grid nodes
      const currentNodes = grid.engine.nodes.map(n => n.id).filter(Boolean) as string[];
      const newItemIds = items.map(item => item.id);

      // Remove nodes that are no longer in items
      currentNodes.forEach(nodeId => {
        if (!newItemIds.includes(nodeId)) {
          const el = grid.engine.nodes.find(n => n.id === nodeId)?.el;
          if (el) grid.removeWidget(el, false);
        }
      });

      // Add or update items
      items.forEach(item => {
        const el = itemRefs.current?.[item.id]?.current;
        if (!el) return;

        const existingNode = grid.engine.nodes.find(n => n.id === item.id);

        if (existingNode) {
          // Update existing widget if position/size changed
          if (existingNode.x !== item.x || existingNode.y !== item.y ||
            existingNode.w !== item.w || existingNode.h !== item.h) {
            grid.update(el, {
              x: item.x,
              y: item.y,
              w: item.w,
              h: item.h
            });
          }
        } else {
          // Add new widget
          try {
            // Set attributes first
            el.setAttribute('gs-x', item.x?.toString() || '0');
            el.setAttribute('gs-y', item.y?.toString() || '0');
            el.setAttribute('gs-w', item.w?.toString() || '1');
            el.setAttribute('gs-h', item.h?.toString() || '1');
            el.setAttribute('gs-id', item.id);

            // Then make it a widget
            grid.makeWidget(el);
          } catch (error) {
            console.error('Error adding widget:', item.id, error);
          }
        }
      });

    } finally {
      grid.batchUpdate(false);
    }
  }, [items]);

  // Handle options change
  useEffect(() => {
    const grid = gridInstanceRef.current;
    if (!grid) return;

    if (options.column && grid.getColumn() !== options.column) {
      grid.column(options.column as number);
    }
    if (options.margin && grid.getMargin() !== options.margin) {
      grid.margin(options.margin);
    }
  }, [options.column, options.margin]);

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
        gridInstanceRef.current.compact()
      }
    }
  }), [onLayoutChange]);

  return (
    <div
      ref={gridRef}
      className={`grid-stack w-full h-full ${className}`}
      style={{ minHeight: '100vh', width: '100%', height: '100%' }}
    >
      {items.map(item => (
        <div
          key={item.id}
          ref={itemRefs.current[item.id]}
          className='grid-stack-item'
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
          <div className='grid-stack-item-content'>
            {item.content || children}
          </div>
        </div>
      ))}
    </div>
  )
})

GridStackWrapper.displayName = 'GridStackWrapper'

export default GridStackWrapper
