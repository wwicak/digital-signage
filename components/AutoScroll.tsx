import React, {
  useRef,
  useEffect,
  ReactNode,
  CSSProperties,
  HTMLAttributes,
} from "react";
/*
 * animated-scroll-to doesn't have official TypeScript declarations in DefinitelyTyped.
 * We'll use a simple require or import and type it as `any` or define a minimal interface.
 * For a more robust solution, one might write a custom .d.ts file for it.
 */
const animateScrollTo = require("animated-scroll-to");

// Minimal interface for animateScrollTo options used in this component
interface AnimateScrollToOptions {
  minDuration?: number;
  elementToScroll?: HTMLElement; // Changed from 'element' to 'elementToScroll' as per library docs (though 'element' might also work)
  cancelOnUserAction?: boolean; // Default is true
  maxDuration?: number; // Default is 3000
  speed?: number; // Default is 500
}

// Props for the AutoScroll component
export interface IAutoScrollProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  duration?: number; // Duration for one scroll animation (e.g., top to bottom) in ms
  pauseOnHover?: boolean; // Optional: pause scrolling on mouse hover
  style?: CSSProperties; // Custom styles for the scrollable container
  // Add other props like direction if more complex scrolling is needed
}

const DEFAULT_ANIMATION_DURATION = 3000; // ms

const AutoScroll: React.FC<IAutoScrollProps> = ({
  children,
  duration = DEFAULT_ANIMATION_DURATION,
  pauseOnHover = false, // Default to not pausing on hover
  style = {}, // Default to empty object for styles
  className = "",
  ...restDivProps
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalIdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isHoveringRef = useRef<boolean>(false);
  const currentScrollTargetRef = useRef<"bottom" | "top">("bottom"); // To track next scroll direction

  useEffect(() => {
    const containerNode = containerRef.current;
    if (!containerNode) return;

    const scrollToTarget = (target: number | "bottom" | "top") => {
      if (isHoveringRef.current && pauseOnHover) return; // Don't scroll if hovering and pauseOnHover is true

      let scrollValue: number;
      if (target === "bottom") {
        scrollValue = containerNode.scrollHeight - containerNode.clientHeight;
        currentScrollTargetRef.current = "top"; // Next, scroll to top
      } else if (target === "top") {
        scrollValue = 0;
        currentScrollTargetRef.current = "bottom"; // Next, scroll to bottom
      } else {
        scrollValue = target; // Specific pixel value, not used in current loop
      }

      /*
       * Ensure animateScrollTo is called with the correct options.
       * The library might take a number for vertical scroll or an array [x, y].
       * We are scrolling vertically.
       */
      const options: AnimateScrollToOptions = {
        elementToScroll: containerNode, // Corrected prop name
        minDuration: duration,
        maxDuration: duration, // Ensure animation takes roughly 'duration'
        cancelOnUserAction: true, // Allow user to interrupt
      };
      animateScrollTo(scrollValue, options);
    };

    const startScrollLoop = () => {
      // Immediately scroll to the current target (bottom or top)
      scrollToTarget(currentScrollTargetRef.current);

      // Then set up the interval for subsequent scrolls
      intervalIdRef.current = setInterval(() => {
        scrollToTarget(currentScrollTargetRef.current);
      }, duration * 2); // Interval should be duration to bottom + duration to top
    };

    startScrollLoop();

    /*
     * Cleanup function to clear the interval when the component unmounts
     * or when dependencies (duration) change.
     */
    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
    };
  }, [duration, pauseOnHover]); // Restart effect if duration or pauseOnHover changes

  const handleMouseEnter = () => {
    if (pauseOnHover) {
      isHoveringRef.current = true;
      if (intervalIdRef.current) {
        /*
         * Optional: could also pause animateScrollTo if library supports it,
         * but clearing interval prevents new scrolls from starting.
         * Current scroll will finish.
         */
      }
    }
  };

  const handleMouseLeave = () => {
    if (pauseOnHover) {
      isHoveringRef.current = false;
      /*
       * Optional: could resume scrolling immediately or wait for next interval tick.
       * For simplicity, it will resume on the next interval tick if interval is still running,
       * or if we restart the loop here (more complex if current animation was 'paused').
       * The current logic simply prevents new scrolls if hovered.
       */
    }
  };

  return (
    <div
      className={`autoscroll-container ${className}`}
      ref={containerRef}
      style={{
        display: "flex", // Original style
        width: "100%", // Original style
        height: "100%", // Original style
        overflow: "auto", // Original style, essential for scrolling
        ...style, // Allow overriding with props.style
      }}
      onMouseEnter={pauseOnHover ? handleMouseEnter : undefined}
      onMouseLeave={pauseOnHover ? handleMouseLeave : undefined}
      {...restDivProps}
    >
      {children}
      {/* No local <style jsx> needed if all styles are passed via `style` prop or handled by parent CSS */}
    </div>
  );
};

export default AutoScroll;
