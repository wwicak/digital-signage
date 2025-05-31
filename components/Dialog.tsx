import React, { ReactNode, forwardRef, useImperativeHandle, useState, memo } from 'react'
import DialogLegacy, { DialogRef } from './ui/dialog-legacy'

export interface IDialogProps {
  children: ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

export interface DialogMethods {
  open: (e?: React.MouseEvent | React.KeyboardEvent) => void;
  close: (e?: React.MouseEvent | React.KeyboardEvent) => void;
}

const Dialog = memo(forwardRef<DialogMethods, IDialogProps>((props, ref) => {
  const dialogRef = React.useRef<DialogRef>(null)

  useImperativeHandle(ref, () => ({
    open: (e?: React.MouseEvent | React.KeyboardEvent) => {
      if (e) e.stopPropagation()
      dialogRef.current?.open()
    },
    close: (e?: React.MouseEvent | React.KeyboardEvent) => {
      if (e) e.stopPropagation()
      dialogRef.current?.close()
    },
  }))

  return <DialogLegacy ref={dialogRef} {...props} />
}))

Dialog.displayName = 'Dialog'

export default Dialog
export type { DialogMethods as Dialog }
