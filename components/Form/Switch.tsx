import React, { SyntheticEvent } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import ReactSwitch, { ReactSwitchProps } from 'react-switch';

// Props for the Switch component
// We can pick necessary props from ReactSwitchProps and add our own.
export interface ISwitchProps {
  name: string; // Name to identify the switch, passed to onValueChange
  checked: boolean; // Current checked state of the switch (controlled)
  onValueChange: (name: string, checked: boolean) => void; // Simplified onChange handler

  label?: string; // Optional main label for the switch group
  checkedLabel?: string; // Label for the 'checked' state side
  uncheckedLabel?: string; // Label for the 'unchecked' state side
  checkedIcon?: IconProp; // Icon for the 'checked' state label
  uncheckedIcon?: IconProp; // Icon for the 'unchecked' state label
  
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

  // inline and expand props from original JS seem to affect layout of .inputGroup,
  // which is this component's root. We'll keep them for styling the wrapper.
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
      onValueChange(name, newChecked);
    }
  };

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
  };

  return (
    <div className={`switch-input-group ${className || ''} ${inline ? 'inline' : 'block-layout'}`} style={style}>
      {label && <label className="main-label">{label}</label>}
      <div className='switch-control-area'> {/* Wrapper for labels and switch */}
          {uncheckedLabel && ( /* Display uncheckedLabel first if present (usually on the left) */
          <label htmlFor={name} className="side-label unchecked-label">
              {uncheckedIcon && (
              <span className='icon unchecked-icon'> {/* Changed div to span for inline flow */}
                  <FontAwesomeIcon icon={uncheckedIcon} fixedWidth color='#828282' />
              </span>
              )}
              {uncheckedLabel}
          </label>
          )}
          <div className={'switch-element-container'}> {/* Renamed from switch-container */}
              <ReactSwitch {...reactSwitchProps} id={name} />
          </div>
          {checkedLabel && ( /* Display checkedLabel second if present (usually on the right) */
          <label htmlFor={name} className="side-label checked-label">
              {checkedIcon && (
              <span className='icon checked-icon'> {/* Changed div to span for inline flow */}
                  <FontAwesomeIcon icon={checkedIcon} fixedWidth color='#828282' />
              </span>
              )}
              {checkedLabel}
          </label>
          )}
      </div>
      <style jsx>{`
        .switch-input-group {
          margin-bottom: 16px;
          display: flex; /* Use flex for layout */
          align-items: center; /* Align items vertically */
        }
        .switch-input-group.inline {
          /* Default: label, switch, labels are in a row */
          flex-direction: row;
        }
        .switch-input-group.block-layout {
          /* Label on top, switch control area below */
          flex-direction: column;
          align-items: flex-start; /* Align label to the left */
        }
        
        .main-label {
          margin-right: 16px; /* Space between main label and switch area */
          color: #878787;
          font-family: 'Open Sans', sans-serif;
          padding-bottom: ${inline ? '0px' : '8px'}; /* Space below label in block mode */
          /* Add other styling for main label if needed */
        }

        .switch-control-area {
          display: flex;
          align-items: center; /* Vertically center labels and switch */
        }

        .switch-element-container { /* Renamed */
          margin-right: 8px;
          margin-left: 8px;
          display: flex; /* Necessary for ReactSwitch to align well sometimes */
          align-items: center;
        }

        .side-label { /* Class for checkedLabel and uncheckedLabel */
          color: #878787;
          font-family: 'Open Sans', sans-serif;
          display: flex;
          align-items: center;
          cursor: pointer; /* Make labels clickable to toggle switch */
          font-size: 0.9em;
        }
        .checked-label {
          /* Specific style for checked label if needed */
        }
        .unchecked-label {
          /* Specific style for unchecked label if needed */
        }

        .side-label .icon {
          margin-right: 4px; /* Space between icon and text in side-label */
          margin-left: 4px;
          display: inline-flex; /* Align icon properly */
          align-items: center;
        }
        
        /* Original .input styles are not applicable here as this is not a text input */
      `}</style>
    </div>
  );
};

export default Switch;
