import React, { ReactNode, HTMLAttributes, Children } from "react";

// Props for the InlineInputGroup component
export interface IInlineInputGroupProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  spacing?: string | number; // Optional prop to control spacing, defaults to 16px
  // Other layout props like alignment can be added if needed
}

const InlineInputGroup: React.FC<IInlineInputGroupProps> = ({
  children,
  spacing = "16px", // Default spacing
  className = "",
  style, // Allow passing custom style object
  ...restDivProps
}) => {
  const childArray = Children.toArray(children);

  // Convert spacing to CSS gap value
  const gapValue = typeof spacing === 'number' ? `${spacing}px` : spacing;

  return (
    <div
      className={`flex flex-wrap gap-4 md:flex-nowrap ${className}`}
      style={{
        gap: gapValue,
        ...style
      }}
      {...restDivProps}
    >
      {childArray.map((child, index) => {
        return (
          <div
            key={`input-group-child-${index}`}
            className='flex-1 min-w-0'
          >
            {child}
          </div>
        );
      })}
    </div>
  );
};

export default InlineInputGroup;
