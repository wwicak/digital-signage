import React, { Component, CSSProperties } from 'react'
import { SketchPicker, ColorResult, SketchPickerProps } from 'react-color' // Import types from react-color

// Props for the ColorPicker component
export interface IColorPickerProps {
  color?: string; // Initial color value (hex string)
  onChange?: (color: string) => void; // Callback when color changes
  // Add other props if needed, e.g., label, disabled
}

// State for the ColorPicker component
interface IColorPickerState {
  displayColorPicker: boolean;
  currentColor: string; // Current selected color (hex string)
}

/*
 * Define styles as plain objects of React.CSSProperties
 * This replaces the usage of reactcss
 */
const styles: Record<string, CSSProperties> = {
  color: { // This style is applied to the div showing the selected color
    width: '64px',
    height: '42px',
    borderRadius: '2px',
    // background is set dynamically in render based on state.currentColor
  },
  swatch: {
    padding: '5px',
    background: '#fff',
    borderRadius: '1px',
    boxShadow: '0 0 0 1px rgba(0,0,0,.1)',
    display: 'inline-block',
    cursor: 'pointer',
  },
  popover: {
    position: 'absolute',
    zIndex: 2, // Ensure zIndex is a number or string if that's what CSSProperties expects
    /*
     * Consider positioning relative to the swatch, e.g., bottom, left if needed
     * For example: top: '100%', left: '0' (to position below the swatch)
     */
  },
  cover: {
    position: 'fixed',
    top: '0px',
    right: '0px',
    bottom: '0px',
    left: '0px',
  },
}

class ColorPicker extends Component<IColorPickerProps, IColorPickerState> {
  constructor(props: IColorPickerProps) {
    super(props)
    this.state = {
      displayColorPicker: false,
      currentColor: props.color || '#FFFFFF', // Default to white if no color prop
    }
  }
  
  // Update state if the color prop changes from parent
  componentDidUpdate(prevProps: IColorPickerProps) {
    if (this.props.color !== prevProps.color && this.props.color !== this.state.currentColor) {
      this.setState({ currentColor: this.props.color || '#FFFFFF' })
    }
  }

  handleClick = (): void => {
    this.setState({ displayColorPicker: !this.state.displayColorPicker })
  }

  handleClose = (): void => {
    this.setState({ displayColorPicker: false })
  }

  // handleChange for SketchPicker returns a ColorResult object
  handleColorChange = (colorResult: ColorResult): void => {
    const newColorHex = colorResult.hex
    this.setState({ currentColor: newColorHex })
    if (this.props.onChange) {
      this.props.onChange(newColorHex)
    }
  }

  render() {
    const { displayColorPicker, currentColor } = this.state

    // Dynamic style for the color preview div
    const colorPreviewStyle: CSSProperties = {
      ...styles.color,
      background: currentColor,
    }

    // Props for SketchPicker, can be extended if more customization is needed
    const sketchPickerProps: SketchPickerProps = {
        color: currentColor,
        onChangeComplete: this.handleColorChange, // Or use onChange for live updates
        /*
         * disableAlpha: true, // Example: if you don't want alpha channel
         * presetColors: ['#D0021B', '#F5A623', '#F8E71C', ...], // Example preset colors
         */
    }

    return (
      <div>
        <div style={styles.swatch} onClick={this.handleClick} role='button' tabIndex={0} onKeyPress={(e) => {if(e.key === 'Enter' || e.key === ' ') this.handleClick()}} aria-label='Open color picker'>
          <div style={colorPreviewStyle} />
        </div>
        {displayColorPicker ? (
          <div style={styles.popover}>
            <div style={styles.cover} onClick={this.handleClose} role='button' aria-label='Close color picker' />
            <SketchPicker {...sketchPickerProps} />
          </div>
        ) : null}
      </div>
    )
  }
}

export default ColorPicker
