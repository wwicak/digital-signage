import * as React from "react";
import { Button, ButtonProps } from "./button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ButtonWithLoadingProps extends ButtonProps {
  isLoading?: boolean;
  loadingText?: string;
}

const ButtonWithLoading = React.forwardRef<
  HTMLButtonElement,
  ButtonWithLoadingProps
>(
  (
    { className, children, isLoading, loadingText, disabled, ...props },
    ref,
  ) => {
    return (
      <Button
        className={cn(className)}
        disabled={disabled || isLoading}
        ref={ref}
        {...props}
      >
        {isLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
        {isLoading ? loadingText || "Loading..." : children}
      </Button>
    );
  },
);
ButtonWithLoading.displayName = "ButtonWithLoading";

export { ButtonWithLoading };
