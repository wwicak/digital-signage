import React, { useState, ButtonHTMLAttributes, ReactNode, CSSProperties } from 'react'
import { Button as ShadcnButton } from '../ui/button'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

/*
 * Props for the Button component
 * Extends standard button attributes for passthrough (e.g., type, disabled from parent)
 */
export interface IButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  text?: string; // Text to display on the button
  color?: string; // Background color for the button (legacy support)
  style?: CSSProperties; // Custom styles for the button element
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => Promise<any> | void; // onClick can be async
  children?: ReactNode; // Allow children to override text prop if needed
  isLoading?: boolean; // Allow parent to control loading state externally (optional)
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'; // Shadcn/UI variants
  size?: 'default' | 'sm' | 'lg' | 'icon'; // Shadcn/UI sizes
}

const Button: React.FC<IButtonProps> = ({
  text = 'Submit',
  color,
  style,
  onClick,
  children,
  isLoading: parentIsLoading,
  disabled: parentDisabled,
  variant = 'default',
  size = 'default',
  className,
  ...restButtonProps
}) => {
  const [internalLoading, setInternalLoading] = useState(false)

  // Wrapper for the onClick prop to handle loading state
  const onClickWrapper = async (event: React.MouseEvent<HTMLButtonElement>): Promise<void> => {
    if (onClick) {
      // Only set internal loading state if not controlled by parent
      if (parentIsLoading === undefined) {
        setInternalLoading(true)
      }
      try {
        await onClick(event) // Await the promise from the onClick prop
      } catch (error) {
        console.error('Button onClick handler error:', error)
        // Optionally handle error state here
      } finally {
        // Only set internal loading state if not controlled by parent
        if (parentIsLoading === undefined) {
          setInternalLoading(false)
        }
      }
    }
  }

  // Determine final loading state: parent prop takes precedence
  const isLoading = parentIsLoading !== undefined ? parentIsLoading : internalLoading
  // Determine final disabled state
  const isDisabled = parentDisabled || isLoading

  // Handle legacy color prop by converting to CSS custom properties or inline styles
  const legacyStyle: CSSProperties = {
    ...style,
    ...(color && { backgroundColor: color }),
  }

  return (
    <ShadcnButton
      variant={variant}
      size={size}
      className={cn(className)}
      style={legacyStyle}
      {...restButtonProps} // Spread rest props first
      onClick={!isLoading && onClick ? onClickWrapper : undefined}
      disabled={isDisabled} // Explicit props later to ensure they override
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children || text}
    </ShadcnButton>
  )
}

export default Button
