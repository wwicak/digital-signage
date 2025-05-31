import React, { ReactNode, forwardRef, useImperativeHandle, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './dialog'

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
    const [isOpen, setIsOpen] = useState(false)

    useImperativeHandle(ref, () => ({
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
    }))

    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className={className}>
          {(title || description) && (
            <DialogHeader>
              {title && <DialogTitle>{title}</DialogTitle>}
              {description && <DialogDescription>{description}</DialogDescription>}
            </DialogHeader>
          )}
          {children}
        </DialogContent>
      </Dialog>
    )
  }
)

DialogLegacy.displayName = 'DialogLegacy'

export default DialogLegacy