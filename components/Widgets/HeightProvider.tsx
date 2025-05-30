import ReactDOM from 'react-dom';
import React, { ComponentType, CSSProperties } from 'react';

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
    private mounted: boolean = false;
    // Ref for the MeasureComponent if it's rendered by this HOC, or assume MeasureComponent is a direct node/instance
    // For this conversion, we stick to the original findDOMNode(MeasureComponent) logic.

    constructor(props: P & HeightProviderProps) {
      super(props);
      this.state = {
        width: 1280,
        height: 720
      };
    }

    componentDidMount() {
      this.mounted = true;
      window.addEventListener('resize', this.onWindowResize);
      this.onWindowResize(); // Initial measurement
    }

    componentWillUnmount() {
      this.mounted = false;
      window.removeEventListener('resize', this.onWindowResize);
    }

    onWindowResize = () => {
      if (!this.mounted) return;

      // The original code uses MeasureComponent directly.
      // This implies MeasureComponent is an instance or a DOM element passed from outside.
      // If MeasureComponent were a component type rendered inside this HOC, a ref would be needed.
      const node = MeasureComponent ? ReactDOM.findDOMNode(MeasureComponent) : null;

      if (node instanceof HTMLElement) {
        this.setState({ width: node.offsetWidth, height: node.offsetHeight });
      }
    };

    render() {
      const { measureBeforeMount = false, layout, ...rest } = this.props;

      if (measureBeforeMount && !this.mounted) {
        // className and style are part of this.props
        return <div className={this.props.className} style={this.props.style} />;
      }

      const rowNum =
        Math.max(
          1, // Ensure at least 1 to avoid division by zero or negative numbers
          ...layout.map(widget => widget.y + widget.h)
        ) || 12; // Default to 12 if layout is empty or map returns nothing

      const colNum =
        Math.max(
          1, // Ensure at least 1
          ...layout.map(widget => widget.x + widget.w)
        ) || 12; // Default to 12

      return (
        <ComposedComponent
          {...(rest as P)} // Spread the rest of the original props
          width={this.state.width}
          rowHeight={this.state.height / rowNum - (layoutSetting === 'spaced' ? 10 : 0)}
          cols={colNum}
        />
      );
    }
  };
}
