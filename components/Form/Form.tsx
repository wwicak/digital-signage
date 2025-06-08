import React, { ReactNode, FormHTMLAttributes, FormEvent } from 'react'

/*
 * Props for the Form component
 * Extends standard form attributes to allow passthrough (e.g., onSubmit, method, action)
 */
export interface IFormProps extends FormHTMLAttributes<HTMLFormElement> {
  children: ReactNode;
  /*
   * No custom props beyond standard HTMLFormElement attributes are in the original JS.
   * If a title prop or custom submit handling (beyond native onSubmit) were needed, they'd be added here.
   * For example:
   * title?: string;
   * onCustomSubmit?: (formData: Record<string, any>) => void;
   */
}

const Form: React.FC<IFormProps> = ({
  children,
  className = '', // Default className to empty string
  onSubmit, // Native onSubmit handler
  ...restFormProps // Capture other standard form attributes
}) => {
  
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    /*
     * If the original component had custom logic to prevent default or process data,
     * it would go here. The original JS was just a div, so no submit logic existed.
     * For a true <form> wrapper, we often let the parent component handle preventDefault
     * in its own onSubmit handler passed to this component.
     */
    if (onSubmit) {
      onSubmit(event) // Call the passed onSubmit handler
    } else {
      /*
       * Default behavior if no onSubmit is provided (though typically one would be for React forms)
       * event.preventDefault(); // Example: could prevent default if that's desired behavior
       */
    }
  }

  return (
    // Render an actual <form> element instead of a div
    <form
      className={`custom-form-wrapper ${className}`} // Combine with any passed className
      onSubmit={handleSubmit} // Use the potentially wrapped or direct onSubmit
      {...restFormProps} // Pass through other form attributes like 'method', 'action', etc.
    >
      {children}
      
    </form>
  )
}

export default Form