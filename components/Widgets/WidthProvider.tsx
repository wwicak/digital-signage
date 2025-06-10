import React, { ComponentType, CSSProperties, useEffect, useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

interface WidthProviderProps {
  measureBeforeMount?: boolean;
  className?: string;
  style?: CSSProperties;
  gridConfig: {
    rows: number;
    margin: [number, number];
  };
  [key: string]: any;
}

export default function WidthProvider<P extends object>(
  ComposedComponent: ComponentType<P & { width: number; rowHeight: number }>,
) {
  return function WidthProviderComponent(props: P & WidthProviderProps) {
    const { measureBeforeMount = false, className, style, gridConfig, ...rest } = props;
    const [width, setWidth] = useState(1280);
    const [height, setHeight] = useState(720);
    const [mounted, setMounted] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const updateSize = useCallback(() => {
      if (containerRef.current) {
        const newWidth = containerRef.current.offsetWidth;
        const newHeight = containerRef.current.offsetHeight;
        if (newWidth > 0 && newHeight > 0) {
          if (newWidth !== width) setWidth(newWidth);
          if (newHeight !== height) setHeight(newHeight);
        }
      }
    }, [width, height]);

    useEffect(() => {
      setMounted(true);
      const element = containerRef.current;
      if (!element) return;

      const resizeObserver = new ResizeObserver(() => {
        updateSize();
      });

      resizeObserver.observe(element);
      updateSize(); // Initial measurement

      return () => {
        if (element) {
          resizeObserver.unobserve(element);
        }
      };
    }, [updateSize]);

    if (measureBeforeMount && !mounted) {
      return <div ref={containerRef} className={cn("w-full h-full relative", className)} style={style} />;
    }

    const { rows, margin } = gridConfig || { rows: 9, margin: [12, 12] };
    // FIX: Corrected the rowHeight calculation formula
    const calculatedRowHeight = Math.max(10, (height - (margin[1] * (rows - 1))) / rows);

    return (
      // FIX: Added `relative` and `w-full h-full` to make this div a proper container
      <div ref={containerRef} className={cn("w-full h-full relative", className)} style={style}>
        <ComposedComponent
          {...(rest as P)}
          width={width}
          rowHeight={calculatedRowHeight}
        />
      </div>
    );
  };
}