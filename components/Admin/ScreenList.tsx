import React, { forwardRef, useImperativeHandle, useState } from "react";
import { Tv } from "lucide-react";

import ScreenCard from "./ScreenCard"; // Assuming ScreenCard.tsx and its props
import DisplayEditDialog from "./DisplayEditDialog";
import { useDisplays } from "../../hooks/useDisplays";
import { useGlobalDisplaySSE } from "../../hooks/useGlobalDisplaySSE";

// This component doesn't seem to receive any specific props from its parent in the current usage.
export interface IScreenListProps {
  /*
   * Add any props if they are passed from a parent component.
   * For example: filterCriteria?: string;
   */
}

export interface IScreenListRef {
  refresh: () => void;
  openCreateDialog: () => void;
}
const ScreenList = forwardRef<IScreenListRef, IScreenListProps>(
  (props, ref) => {
    const { data: screens, isLoading, error, refetch } = useDisplays();
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

    // Enable global SSE for real-time client connection updates
    const { isConnected: sseConnected } = useGlobalDisplaySSE(true);

    // Expose refresh method via ref
    useImperativeHandle(ref, () => ({
      refresh: () => {
        refetch();
      },
      openCreateDialog: () => {
        setIsCreateDialogOpen(true);
      },
    }));
    if (error) {
      return (
        <div className='text-center p-5 font-sans'>
          Failed to load screens. Please try again later.
        </div>
      );
    }

    return (
      <div className='space-y-6'>
        {/* Real-time connection status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${sseConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-muted-foreground">
              {sseConnected ? 'Real-time updates connected' : 'Real-time updates disconnected'}
            </span>
          </div>
        </div>
        
        {!isLoading && screens ? (
          <>
            {screens.length === 0 ? (
              <div className='text-center py-12'>
                <div className='mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4'>
                  <Tv className='w-12 h-12 text-muted-foreground' />
                </div>
                <h3 className='text-lg font-semibold mb-2'>No displays found</h3>
                <p className='text-muted-foreground mb-4'>
                  Get started by creating your first display.
                </p>
              </div>
            ) : (
              <div className='grid gap-6'>
                {screens.map((screen, index) => (
                  <ScreenCard
                    key={screen._id || `item-${index}`}
                    value={screen}
                    refresh={refetch}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className='grid gap-6'>
            {Array(4)
              .fill(0)
              .map((_, index) => (
                <div key={`loader-${index}`} className='animate-pulse'>
                  <div className='bg-card border rounded-lg p-6'>
                    <div className='flex items-center space-x-4'>
                      <div className='h-16 w-16 bg-muted rounded-lg'></div>
                      <div className='flex-1 space-y-2'>
                        <div className='h-4 bg-muted rounded w-3/4'></div>
                        <div className='h-3 bg-muted rounded w-1/2'></div>
                      </div>
                      <div className='h-6 w-16 bg-muted rounded-full'></div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Create Dialog */}
        {isCreateDialogOpen && (
          <DisplayEditDialog
            display={null}
            isCreateMode={true}
            onClose={() => setIsCreateDialogOpen(false)}
            onSave={() => {
              setIsCreateDialogOpen(false);
              refetch();
            }}
          />
        )}
      </div>
    );
  },
);

export default ScreenList;

ScreenList.displayName = "ScreenList";
