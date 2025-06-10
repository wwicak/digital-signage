import React, { ComponentType, CSSProperties, useEffect, useState, useRef, useCallback } from "react";

interface WidthProviderProps {
  measureBeforeMount?: boolean;
  className?: string;
  style?: CSSProperties;
  // Add gridConfig to props for rowHeight calculation
  gridConfig: {
    rows: number;
    margin: [number, number];
  };
  // Other props for ComposedComponent
  [key: string]: any;
}

/*
 * A modern HOC that provides container dimensions for its children.
 * It measures both width and height and calculates a dynamic rowHeight for react-grid-layout.
 */
export default function WidthProvider<P extends object>(
  ComposedComponent: ComponentType<P & { width: number; rowHeight: number }>,
) {
  return function WidthProviderComponent(props: P & WidthProviderProps) {
    const { measureBeforeMount = false, className, style, gridConfig, ...rest } = props;
    const [width, setWidth] = useState(1280);
    const [height, setHeight] = useState(720); // Default height
    const [mounted, setMounted] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Debounced resize handler to improve performance
    const debouncedResize = useCallback(
      (() => {
        let timeoutId: NodeJS.Timeout;
        return (newWidth: number, newHeight: number) => {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            setWidth(newWidth);
            setHeight(newHeight);
          }, 16); // ~60fps
        };
      })(),
      []
    );

    const updateSize = useCallback(() => {
      if (containerRef.current) {
        const newWidth = containerRef.current.offsetWidth;
        const newHeight = containerRef.current.offsetHeight;
        if (newWidth > 0 && newHeight > 0 && (newWidth !== width || newHeight !== height)) {
          debouncedResize(newWidth, newHeight);
        }
      }
    }, [width, height, debouncedResize]);

    useEffect(() => {
      setMounted(true);

      const element = containerRef.current;
      if (!element) return;

      // Use ResizeObserver for efficient dimension tracking
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const newWidth = entry.contentRect.width;
          const newHeight = entry.contentRect.height;
          if (newWidth > 0 && newHeight > 0 && (newWidth !== width || newHeight !== height)) {
            debouncedResize(newWidth, newHeight);
          }
        }
      });

      resizeObserver.observe(element);
      updateSize(); // Initial measurement

      return () => {
        resizeObserver.disconnect();
      };
    }, [updateSize, width, height, debouncedResize]);

    if (measureBeforeMount && !mounted) {
      return <div ref={containerRef} className={className} style={style} />;
    }

    // Calculate rowHeight dynamically based on container height and grid configuration
    const { rows, margin } = gridConfig || { rows: 9, margin: [12, 12] };
    const calculatedRowHeight = Math.max(10, (height - (rows - 1) * margin[1]) / rows);

    return (
      <div ref={containerRef} className={className} style={style}>
        <ComposedComponent
          {...(rest as P)}
          width={width}
          rowHeight={calculatedRowHeight}
        />
      </div>
    );
  };
}