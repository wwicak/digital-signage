import React, { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, X, Loader2, Keyboard } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface DeleteWidgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  widgetName: string;
  widgetType: string;
  isDeleting?: boolean;
}

const DeleteWidgetModal: React.FC<DeleteWidgetModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  widgetName,
  widgetType,
  isDeleting = false
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  // Define isLoading before it's used in useEffect
  const isLoading = isProcessing || isDeleting;

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Error deleting widget:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (!isProcessing && !isDeleting) {
      onClose();
    }
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen || isLoading) return;

      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        handleConfirm();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isLoading, handleConfirm]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className='sm:max-w-[425px] max-w-[95vw] w-full'
        onPointerDownOutside={(e) => {
          if (isLoading) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (isLoading) e.preventDefault();
        }}
      >
        <DialogHeader>
          <div className='flex items-center space-x-3'>
            <div className='flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center'>
              <AlertTriangle className='w-5 h-5 text-red-600' />
            </div>
            <div>
              <DialogTitle className='text-lg font-semibold text-gray-900'>
                Delete Widget
              </DialogTitle>
              <DialogDescription className='text-sm text-gray-500 mt-1'>
                This action cannot be undone
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className='py-4 space-y-4'>
          <div className='bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200'>
            <div className='flex items-center justify-between mb-3'>
              <span className='text-sm font-medium text-gray-700'>Widget Details</span>
              <Badge variant='secondary' className='text-xs capitalize'>
                {widgetType.replace(/[_-]/g, ' ')}
              </Badge>
            </div>

            <div className='flex items-center space-x-3'>
              <div className='flex-shrink-0 w-10 h-10 bg-gradient-to-br from-red-100 to-red-200 rounded-lg flex items-center justify-center shadow-sm'>
                <Trash2 className='w-5 h-5 text-red-600' />
              </div>
              <div className='flex-1'>
                <p className='font-semibold text-gray-900 text-base'>{widgetName}</p>
                <p className='text-sm text-gray-600 mt-1'>
                  This widget will be permanently removed from your layout
                </p>
              </div>
            </div>
          </div>

          <div className='p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg'>
            <div className='flex items-start space-x-3'>
              <div className='flex-shrink-0 w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center'>
                <AlertTriangle className='w-4 h-4 text-amber-600' />
              </div>
              <div className='flex-1'>
                <div className='text-sm text-amber-900'>
                  <p className='font-semibold mb-1'>⚠️ Permanent Action</p>
                  <p className='leading-relaxed'>
                    All widget data, configuration, and content will be permanently lost.
                    This action cannot be undone or recovered.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Keyboard shortcut hint */}
          <div className='flex items-center justify-center text-xs text-gray-500 bg-gray-50 rounded-md py-2 px-3'>
            <Keyboard className='w-3 h-3 mr-1' />
            <span>Press Ctrl+Enter to confirm deletion</span>
          </div>
        </div>

        <DialogFooter className='flex flex-col sm:flex-row gap-2 sm:gap-0'>
          <Button
            variant='outline'
            onClick={handleClose}
            disabled={isLoading}
            className='w-full sm:w-auto order-2 sm:order-1'
          >
            <X className='w-4 h-4 mr-2' />
            Cancel
          </Button>
          <Button
            variant='destructive'
            onClick={handleConfirm}
            disabled={isLoading}
            className='w-full sm:w-auto order-1 sm:order-2'
          >
            {isLoading ? (
              <>
                <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className='w-4 h-4 mr-2' />
                Delete Widget
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteWidgetModal;
