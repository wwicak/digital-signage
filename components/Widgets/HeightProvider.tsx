import React, { ComponentType, CSSProperties } from 'react'
import _ from 'lodash'

interface WidgetLayout {
  x: number;
  y: number;
  w: number;
  h: number;
  // Add other potential properties if known, e.g., i: string;
}

interface HeightProviderProps {
  measureBeforeMount?: boolean;
  className?: string;
  style?: CSSProperties;
  layout: WidgetLayout[];
  // Add any other props passed to the ComposedComponent that are specific to this HOC's usage
  [key: string]: any; // For other props passed down
}

interface HeightProviderState {
  width: number;
  height: number;
}

/*
 * A simple HOC that provides facility for listening to container resizes.
 */
export default function HeightProvider<P extends object>(
  ComposedComponent: ComponentType<P & { width: number; rowHeight: number; cols: number }>,
  MeasureComponent: React.ReactInstance | null | undefined, // Instance of a component or a DOM node
  layoutSetting: 'spaced' | 'compact' | string = 'spaced' // Allow string for flexibility or specific values
) {
  return class HeightProviderComponent extends React.Component<P & HeightProviderProps, HeightProviderState> {
    private mounted: boolean = false
    private debouncedResize: _.DebouncedFunc<() => void> | null = null
    /*
     * Ref for the MeasureComponent if it's rendered by this HOC, or assume MeasureComponent is a direct node/instance
     * For this conversion, we stick to the original findDOMNode(MeasureComponent) logic.
     */

    constructor(props: P & HeightProviderProps) {
      super(props)
      this.state = {
        width: 1280,
        height: 720
      }
    }
    componentDidMount() {
      this.mounted = true
      // Use debounced resize handler to prevent excessive re-renders
      this.debouncedResize = _.debounce(this.onWindowResize, 150)
      window.addEventListener('resize', this.debouncedResize)
      this.onWindowResize() // Initial measurement
    }

    componentWillUnmount() {
      this.mounted = false
      if (this.debouncedResize) {
        window.removeEventListener('resize', this.debouncedResize)
        this.debouncedResize.cancel()
      }
    }

    onWindowResize = () => {
      if (!this.mounted) return

      /*
       * The original code uses MeasureComponent directly.
       * This implies MeasureComponent is an instance or a DOM element passed from outside.
       * If MeasureComponent were a component type rendered inside this HOC, a ref would be needed.
       */
      const node = MeasureComponent as HTMLElement

      if (node instanceof HTMLElement) {
        const newWidth = Math.round(node.offsetWidth)
        const newHeight = Math.round(node.offsetHeight)
        
        // Only update state if dimensions have meaningfully changed
        if (Math.abs(newWidth - this.state.width) > 5 || Math.abs(newHeight - this.state.height) > 5) {
          this.setState({ width: newWidth, height: newHeight })
        }
      }
    }

    render() {
      const { measureBeforeMount = false, layout, ...rest } = this.props

      if (measureBeforeMount && !this.mounted) {
        // className and style are part of this.props
        return <div className={this.props.className} style={this.props.style} />
      }

      // Stabilize calculations to reduce re-renders
      const rowNum = layout.length > 0
        ? Math.max(1, ...layout.map((widget: WidgetLayout) => widget.y + widget.h))
        : 12 // Default to 12 if layout is empty

      const colNum = layout.length > 0
        ? Math.max(1, ...layout.map((widget: WidgetLayout) => widget.x + widget.w))
        : 12 // Default to 12

      // Round values to reduce micro-changes that cause re-renders
      const stableWidth = Math.round(this.state.width)
      const baseRowHeight = Math.round(this.state.height / rowNum)
      const margin = layoutSetting === 'spaced' ? 10 : 0
      const stableRowHeight = Math.max(10, baseRowHeight - margin) // Ensure minimum height

      return (
        <ComposedComponent
          {...(rest as P)} // Spread the rest of the original props
          width={stableWidth}
          rowHeight={stableRowHeight}
          cols={colNum}
        />
      )
    }
  }
}
