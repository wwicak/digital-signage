import React, { ReactNode, HTMLAttributes, Children, isValidElement, cloneElement } from 'react';

// Props for the InlineInputGroup component
export interface IInlineInputGroupProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  spacing?: string | number; // Optional prop to control spacing, defaults to 16px
  // Other layout props like alignment can be added if needed
}

const InlineInputGroup: React.FC<IInlineInputGroupProps> = ({
  children,
  spacing = '16px', // Default spacing
  className = '',
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
        // We need to wrap each child to apply margin, unless child can accept it directly
        // or if we use CSS gap. For direct migration of margin logic:
        const isLastChild = index === numChildren - 1;
        
        // If the child is an Input component that has an 'expand' prop,
        // we might want to apply flex: 1 to its wrapper.
        // This requires checking the child's type and props, which can be complex.
        // For now, a simpler approach is to let Input components manage their own expand behavior.
        // The original JS logic for 'expand' was on the Input itself, not handled by group.
        
        // Create a wrapper for each child to apply margin
        // The key should be on the outermost element returned by map
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
      <style jsx>{`
        .inline-input-group {
          display: flex;
          flex-direction: row;
          justify-content: flex-start; /* Default, can be overridden by parent or style prop */
          align-items: flex-start; /* Align items to the top by default, good for varying height inputs */
          /* flex: 1; */ /* Removed from original, can be added via style prop if needed by parent */
          width: 100%; /* Take full width to distribute children */
        }
        .input-group-item-wrapper {
            /* This wrapper handles the margin.
               If children are Input components with an 'expand' prop,
               they might need to have flex: 1. This could be handled by
               the Input component itself or by passing a className. */
            display: flex; /* To allow child Input to expand if it uses flex:1 */
            align-items: flex-start; /* Align content of wrapper (label + input) */
        }
        /* If Input components have an 'expand' prop that makes them flex:1, this wrapper will allow that.
           Alternatively, the Input component itself could manage its flex properties.
           The original JS had 'expand' on Input, not controlled by this group.
           If an Input has 'expand={true}', it needs to be styled with 'flex: 1'.
           We can achieve this by having the Input component itself apply flex:1.
           Or, if we inspect child props (more complex):
           const childElement = child as React.ReactElement<any>;
           const flexGrow = childElement.props && childElement.props.expand ? 1 : 0;
           ... style={{ marginRight: ..., flex: flexGrow }} ...
        */
      `}</style>
    </div>
  );
};

export default InlineInputGroup;
