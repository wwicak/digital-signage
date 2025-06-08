import * as React from "react"
import { cn } from "@/lib/utils"
import { Label } from "./label"

export interface FormFieldProps {
  label?: string
  error?: string | boolean
  helpText?: string
  required?: boolean
  className?: string
  children: React.ReactNode
}

const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  ({ label, error, helpText, required, className, children, ...props }, ref) => {
    const hasError = typeof error === 'string' ? !!error : !!error
    const errorMessage = typeof error === 'string' ? error : undefined

    return (
      <div ref={ref} className={cn("space-y-2", className)} {...props}>
        {label && (
          <Label className={cn(hasError && "text-destructive")}>
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
        )}
        <div className={cn(hasError && "[&>*]:border-destructive [&>*]:focus-visible:ring-destructive")}>
          {children}
        </div>
        {errorMessage && (
          <p className="text-sm text-destructive">{errorMessage}</p>
        )}
        {helpText && !hasError && (
          <p className="text-sm text-muted-foreground">{helpText}</p>
        )}
      </div>
    )
  }
)
FormField.displayName = "FormField"

export { FormField }
