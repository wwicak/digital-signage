import React, { Component, ButtonHTMLAttributes, ReactNode, CSSProperties } from 'react';
import Lottie, { Options as LottieOptions } from 'react-lottie'; // Import Lottie and its Options type

// Attempt to import the Lottie animation JSON statically
// If this doesn't work due to bundler/TS config, it might need to be loaded via fetch or other means.
import loadingAnimationData from './assets/loading.json';

// Props for the Button component
// Extends standard button attributes for passthrough (e.g., type, disabled from parent)
export interface IButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  text?: string; // Text to display on the button
  color?: string; // Background color for the button
  style?: CSSProperties; // Custom styles for the button element
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => Promise<any> | void; // onClick can be async
  children?: ReactNode; // Allow children to override text prop if needed
  isLoading?: boolean; // Allow parent to control loading state externally (optional)
}

// State for the Button component
interface IButtonState {
  loading: boolean; // Internal loading state, true when onClick promise is pending
}

class Button extends Component<IButtonProps, IButtonState> {
  constructor(props: IButtonProps) {
    super(props);
    this.state = {
      // Initialize loading state from props if provided, otherwise false
      loading: props.isLoading === undefined ? false : props.isLoading,
    };
  }
  
  componentDidUpdate(prevProps: IButtonProps) {
    // If the parent controls isLoading, sync it to local state
    if (this.props.isLoading !== undefined && this.props.isLoading !== prevProps.isLoading) {
      this.setState({ loading: this.props.isLoading });
    }
  }

  // Wrapper for the onClick prop to handle loading state
  onClickWrapper = async (event: React.MouseEvent<HTMLButtonElement>): Promise<void> => {
    const { onClick } = this.props;
    if (onClick) {
      // Only set internal loading state if not controlled by parent
      if (this.props.isLoading === undefined) {
          this.setState({ loading: true });
      }
      try {
        await onClick(event); // Await the promise from the onClick prop
      } catch (error) {
        console.error("Button onClick handler error:", error);
        // Optionally handle error state here
      } finally {
        // Only set internal loading state if not controlled by parent
        if (this.props.isLoading === undefined) {
            this.setState({ loading: false });
        }
      }
    }
  };

  render() {
    // Destructure props with defaults
    const {
      text = 'Submit',
      color = 'gray', // Default color from original JS
      style = { marginLeft: 16 }, // Default style from original JS
      onClick, // We use onClickWrapper
      children, // Custom content for the button
      isLoading: parentIsLoading, // Prop to control loading from parent
      disabled: parentDisabled, // Prop to disable button from parent
      ...restButtonProps // Other standard button attributes
    } = this.props;

    const { loading: internalLoading } = this.state;
    // Determine final loading state: parent prop takes precedence
    const isLoading = parentIsLoading !== undefined ? parentIsLoading : internalLoading;
    // Determine final disabled state
    const isDisabled = parentDisabled || isLoading;

    const lottieOptions: LottieOptions = {
      loop: true,
      autoplay: true,
      animationData: loadingAnimationData, // Use statically imported animation data
      rendererSettings: {
        preserveAspectRatio: 'xMidYMid slice',
      },
    };
    
    const buttonStyle: CSSProperties = {
        ...style, // Original style prop
        background: color, // Apply color prop to background
    };

    return (
      <button
        className={'btn'}
        onClick={!isLoading && onClick ? this.onClickWrapper : undefined} // Only attach onClickWrapper if not loading and onClick exists
        style={buttonStyle}
        disabled={isDisabled}
        {...restButtonProps} // Spread other button attributes like 'type'
      >
        {isLoading && (
          <Lottie
            height={24} // Adjusted size for Lottie animation within button
            width={24}
            style={{ margin: 0, marginRight: text || children ? 8 : 0 }} // Add margin if text is also present
            options={lottieOptions}
          />
        )}
        {children || text} {/* Render children if provided, otherwise text prop */}
        <style jsx>{`
          .btn {
            font-family: 'Open Sans', sans-serif;
            /* background is now set via inline style from 'color' prop */
            text-decoration: none;
            text-transform: uppercase;
            color: white; /* Default text color, can be overridden by style prop */
            font-size: 14px;
            border-radius: 4px;
            border: none;
            display: inline-flex; /* Changed to inline-flex for better alignment of Lottie and text */
            flex-direction: row;
            justify-content: center;
            align-items: center;
            padding: 12px 24px; /* Slightly adjusted padding */
            outline: none;
            cursor: pointer;
            transition: background-color 0.2s ease, opacity 0.2s ease; /* Added transitions */
          }
          .btn:disabled {
            cursor: not-allowed;
            opacity: 0.7; /* Dim button when disabled */
          }
        `}</style>
      </button>
    );
  }
}

export default Button;
