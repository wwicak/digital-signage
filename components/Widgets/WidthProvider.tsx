import React, { ComponentType, CSSProperties } from 'react';

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
 * A simple HOC that provides facility for listening to container resizes.
 */
export default function WidthProvider<P extends object>(
  ComposedComponent: ComponentType<P & { width: number; rowHeight: number }>
) {
  return class WidthProviderComponent extends React.Component<P & WidthProviderProps, WidthProviderState> {
    private mounted: boolean = false;

    constructor(props: P & WidthProviderProps) {
      super(props);
      this.state = {
        width: 1280
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
      
      const node = this as any; // Cast to avoid ReactDOM.findDOMNode deprecation
      if (node instanceof HTMLElement) {
        this.setState({ width: node.offsetWidth });
      }
    };

    render() {
      const { measureBeforeMount = false, cols, ...rest } = this.props;

      if (measureBeforeMount && !this.mounted) {
        return <div className={this.props.className} style={this.props.style} />;
      }

      // Ensure cols is a positive number to avoid division by zero or negative rowHeight
      const validCols = cols > 0 ? cols : 1;

      return (
        <ComposedComponent
          {...(rest as P)} // Spread the rest of the original props
          width={this.state.width}
          rowHeight={this.state.width / validCols - 10} // Original logic: this.state.width / rest.cols - 10
        />
      );
    }
  };
}
