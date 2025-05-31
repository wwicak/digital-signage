import React, { ReactNode, CSSProperties, HTMLAttributes } from 'react'

// Define allowed alignment values
export type TButtonGroupAlignment = 'left' | 'center' | 'right';

// Props for the ButtonGroup component
export interface IButtonGroupProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  align?: TButtonGroupAlignment; // How to align buttons within the group
  vertical?: boolean; // If true, stack buttons vertically
  style?: CSSProperties; // Custom styles for the group container
  // No need to explicitly include className, it's part of HTMLAttributes
}

const ButtonGroup: React.FC<IButtonGroupProps> = ({
  children,
  align = 'right', // Default alignment
  vertical = false, // Default to horizontal
  style = {},
  className = '', // Default className to empty string
  ...restDivProps // Capture other standard div attributes
}) => {
  // Determine justifyContent based on align prop
  const justifyContent =
    align === 'center' ? 'center' : align === 'left' ? 'flex-start' : 'flex-end'

  /*
   * Base styles are applied via JSX style tag for dynamic properties like justifyContent.
   * Static parts can be in classes, dynamic parts via inline styles or CSS variables.
   * For simplicity here, dynamic justifyContent is applied via JSX style.
   * The 'flex: 1' from original might be too greedy if ButtonGroup is inside another flex container.
   * It's often better to let the parent control flex sizing. Removed for now, can be added back via `style` prop if needed.
   */

  return (
    <div
      className={`btn-group-container ${className}`} // Combine with any passed className
      style={style} // Pass through custom styles
      {...restDivProps} // Pass through other div attributes
    >
      {children}
      <style jsx>{`
        .btn-group-container {
          display: flex;
          flex-direction: ${vertical ? 'column' : 'row'};
          justify-content: ${justifyContent};
          align-items: ${vertical ? (align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'stretch') : 'center'}; /* Align items for vertical stack */
          width: ${vertical ? 'auto' : '100%'}; /* Full width for horizontal, auto for vertical */
        }
        /* Styling for spacing between buttons could be added here or handled by Button margins */
        /* Example:
        .btn-group-container > :global(button:not(:last-child)) {
          margin-right: ${vertical ? '0' : '8px'};
          margin-bottom: ${vertical ? '8px' : '0'};
        }
        */
      `}</style>
    </div>
  )
}

export default ButtonGroup
