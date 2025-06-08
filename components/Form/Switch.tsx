import React, { SyntheticEvent } from 'react'
import ReactSwitch, { ReactSwitchProps } from 'react-switch'
import { LucideIcon } from 'lucide-react'

/*
 * Props for the Switch component
 * We can pick necessary props from ReactSwitchProps and add our own.
 */
export interface ISwitchProps {
  name: string; // Name to identify the switch, passed to onValueChange
  checked: boolean; // Current checked state of the switch (controlled)
  onValueChange: (name: string, checked: boolean) => void; // Simplified onChange handler

  label?: string; // Optional main label for the switch group
  checkedLabel?: string; // Label for the 'checked' state side
  uncheckedLabel?: string; // Label for the 'unchecked' state side
  checkedIcon?: LucideIcon; // Icon for the 'checked' state label
  uncheckedIcon?: LucideIcon; // Icon for the 'unchecked' state label
  
  disabled?: boolean;
  color?: string; // Corresponds to onColor in ReactSwitch
  offColor?: string; // New: color when off
  onHandleColor?: string; // New: handle color when on
  offHandleColor?: string; // New: handle color when off

  // Other ReactSwitch props can be added here if needed, e.g., height, width, handleDiameter
  height?: number;
  width?: number;
  handleDiameter?: number;
  
  className?: string; // For custom styling of the wrapper
  style?: React.CSSProperties; // For custom styling of the wrapper

  /*
   * inline and expand props from original JS seem to affect layout of .inputGroup,
   * which is this component's root. We'll keep them for styling the wrapper.
   */
  inline?: boolean; // If true, group lays out more compactly or affects label positioning.
  expand?: boolean; // If true, group might try to expand (e.g. width: 100%)
}

const Switch: React.FC<ISwitchProps> = ({
  name,
  checked,
  onValueChange,
  label,
  checkedLabel,
  uncheckedLabel,
  checkedIcon,
  uncheckedIcon,
  inline = true,
  disabled = false,
  color,
  offColor,
  onHandleColor,
  offHandleColor,
  height,
  width,
  handleDiameter,
  className,
  style,
}) => {
  // handleChange is the direct handler for ReactSwitch's onChange
  const handleChange = (
    newChecked: boolean,
    event: MouseEvent | SyntheticEvent<MouseEvent | KeyboardEvent>,
    id: string // id prop from ReactSwitch, usually related to name or generated
  ): void => {
    if (onValueChange) {
      onValueChange(name, newChecked)
    }
  }

  // Prepare props for ReactSwitch
  const reactSwitchProps: ReactSwitchProps = {
    onChange: handleChange,
    checked: checked,
    disabled: disabled,
    uncheckedIcon: false, // Original JS hardcoded these to false
    checkedIcon: false,   // Original JS hardcoded these to false
    onColor: color || '#7bc043', // Default onColor from original JS
    // Pass through other relevant props if they exist
    ...(offColor && { offColor }),
    ...(onHandleColor && { onHandleColor }),
    ...(offHandleColor && { offHandleColor }),
    ...(height && { height }),
    ...(width && { width }),
    ...(handleDiameter && { handleDiameter }),
  }

  return (
    <div className={`mb-4 flex items-center ${className || ''} ${inline ? 'flex-row' : 'flex-col items-start'}`} style={style}>
      {label && (
        <label className={`text-gray-500 font-sans ${inline ? 'mr-4' : 'pb-2'}`}>
          {label}
        </label>
      )}
      <div className="flex items-center">
          {uncheckedLabel && (
          <label htmlFor={name} className="text-gray-500 font-sans flex items-center cursor-pointer text-sm">
              {uncheckedIcon && (
              <span className="mx-1 inline-flex items-center">
                  <uncheckedIcon className="w-4 h-4 text-gray-500" />
              </span>
              )}
              {uncheckedLabel}
          </label>
          )}
          <div className="mx-2 flex items-center">
              <ReactSwitch {...reactSwitchProps} id={name} />
          </div>
          {checkedLabel && (
          <label htmlFor={name} className="text-gray-500 font-sans flex items-center cursor-pointer text-sm">
              {checkedIcon && (
              <span className="mx-1 inline-flex items-center">
                  <checkedIcon className="w-4 h-4 text-gray-500" />
              </span>
              )}
              {checkedLabel}
          </label>
          )}
      </div>

    </div>
  )
}

export default Switch