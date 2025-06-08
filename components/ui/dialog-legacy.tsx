import React, {
  ReactNode,
  forwardRef,
  useImperativeHandle,
  useState,
} from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./dialog";

export interface IDialogProps {
  children: ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

export interface DialogRef {
  open: () => void;
  close: () => void;
}

const DialogLegacy = forwardRef<DialogRef, IDialogProps>(
  ({ children, title, description, className }, ref) => {
    const [isOpen, setIsOpen] = useState(false);

    useImperativeHandle(ref, () => ({
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
    }));

    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className={className}>
          <div className="flex flex-col h-full">
            {(title || description) && (
              <DialogHeader className="flex-shrink-0">
                {title && <DialogTitle className="text-xl font-semibold text-gray-900">{title}</DialogTitle>}
                {description && (
                  <DialogDescription className="text-gray-600 mt-1">{description}</DialogDescription>
                )}
              </DialogHeader>
            )}
            <div className="flex-1 overflow-hidden">
              {children}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  },
);

DialogLegacy.displayName = "DialogLegacy";

export default DialogLegacy;
