import React, { ComponentType, CSSProperties, useEffect, useState, useRef, useCallback } from "react";

interface WidthProviderProps {
  measureBeforeMount?: boolean;
  className?: string;
  style?: CSSProperties;
  cols: number; // Assuming cols is a required prop for ComposedComponent's calculation
  // Add any other props passed to the ComposedComponent that are specific to this HOC's usage
  [key: string]: any; // For other props passed down
}

interface WidthProviderState {
  width: number;
}

/*
 * A modern HOC that provides facility for listening to container resizes with improved performance.
 * Uses ResizeObserver when available, falls back to window resize events.
 */
export default function WidthProvider<P extends object>(
  ComposedComponent: ComponentType<P & { width: number; rowHeight: number }>,
) {
  return function WidthProviderComponent(props: P & WidthProviderProps) {
    const { measureBeforeMount = false, cols, className, style, ...rest } = props;
    const [width, setWidth] = useState(1280);
    const [mounted, setMounted] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Debounced resize handler to improve performance
    const debouncedResize = useCallback(
      (() => {
        let timeoutId: NodeJS.Timeout;
        return (newWidth: number) => {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            setWidth(newWidth);
          }, 16); // ~60fps
        };
      })(),
      []
    );

    const updateWidth = useCallback(() => {
      if (containerRef.current) {
        const newWidth = containerRef.current.offsetWidth;
        if (newWidth !== width) {
          debouncedResize(newWidth);
        }
      }
    }, [width, debouncedResize]);

    useEffect(() => {
      setMounted(true);

      // Use ResizeObserver if available for better performance
      if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
        const resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const newWidth = entry.contentRect.width;
            if (newWidth !== width) {
              debouncedResize(newWidth);
            }
          }
        });

        resizeObserver.observe(containerRef.current);
        updateWidth(); // Initial measurement

        return () => {
          resizeObserver.disconnect();
        };
      } else {
        // Fallback to window resize events
        window.addEventListener("resize", updateWidth);
        updateWidth(); // Initial measurement

        return () => {
          window.removeEventListener("resize", updateWidth);
        };
      }
    }, [updateWidth, width, debouncedResize]);

    if (measureBeforeMount && !mounted) {
      return <div ref={containerRef} className={className} style={style} />;
    }

    // Ensure cols is a positive number to avoid division by zero or negative rowHeight
    const validCols = cols > 0 ? cols : 1;

    return (
      <div ref={containerRef} className={className} style={style}>
        <ComposedComponent
          {...(rest as P)}
          width={width}
          rowHeight={Math.max(width / validCols - 10, 60)} // Ensure minimum row height
        />
      </div>
    );
  };
}
