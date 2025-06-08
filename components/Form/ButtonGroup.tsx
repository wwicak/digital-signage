import React, { ReactNode, CSSProperties, HTMLAttributes } from "react";

// Define allowed alignment values
export type TButtonGroupAlignment = "left" | "center" | "right";

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
  align = "right", // Default alignment
  vertical = false, // Default to horizontal
  style = {},
  className = "", // Default className to empty string
  ...restDivProps // Capture other standard div attributes
}) => {
  // Determine justifyContent based on align prop
  const justifyContent =
    align === "center"
      ? "center"
      : align === "left"
        ? "flex-start"
        : "flex-end";

  /*
   * Base styles are applied via JSX style tag for dynamic properties like justifyContent.
   * Static parts can be in classes, dynamic parts via inline styles or CSS variables.
   * For simplicity here, dynamic justifyContent is applied via JSX style.
   * The 'flex: 1' from original might be too greedy if ButtonGroup is inside another flex container.
   * It's often better to let the parent control flex sizing. Removed for now, can be added back via `style` prop if needed.
   */

  // Create dynamic classes based on props
  const flexDirection = vertical ? "flex-col" : "flex-row";
  const justifyClass =
    align === "center"
      ? "justify-center"
      : align === "left"
        ? "justify-start"
        : "justify-end";
  const alignItems = vertical
    ? align === "left"
      ? "items-start"
      : align === "right"
        ? "items-end"
        : "items-stretch"
    : "items-center";
  const width = vertical ? "w-auto" : "w-full";

  return (
    <div
      className={`flex ${flexDirection} ${justifyClass} ${alignItems} ${width} gap-2 ${className}`}
      style={style}
      {...restDivProps}
    >
      {children}
    </div>
  );
};

export default ButtonGroup;
