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
  const numChildren = childArray.length;

  return (
    <div
      className={`inline-input-group ${className}`}
      style={style} // Pass through custom styles
      {...restDivProps}
    >
      {childArray.map((child, index) => {
        /*
         * We need to wrap each child to apply margin, unless child can accept it directly
         * or if we use CSS gap. For direct migration of margin logic:
         */
        const isLastChild = index === numChildren - 1;

        /*
         * If the child is an Input component that has an 'expand' prop,
         * we might want to apply flex: 1 to its wrapper.
         * This requires checking the child's type and props, which can be complex.
         * For now, a simpler approach is to let Input components manage their own expand behavior.
         * The original JS logic for 'expand' was on the Input itself, not handled by group.
         */

        /*
         * Create a wrapper for each child to apply margin
         * The key should be on the outermost element returned by map
         */
        return (
          <div
            key={`input-group-child-${index}`}
            className="input-group-item-wrapper"
            style={{ marginRight: isLastChild ? 0 : spacing }}
          >
            {child}
          </div>
        );
      })}
    </div>
  );
};

export default InlineInputGroup;
