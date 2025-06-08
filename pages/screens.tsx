import React, { useEffect, useRef, memo } from 'react'
import { Tv } from 'lucide-react'

import Frame from '../components/Admin/Frame.tsx' // Assuming .tsx
import ScreenListComponent, { IScreenListRef } from '../components/Admin/ScreenList.tsx' // Renamed, Assuming .tsx
import Dialog from '../components/Dialog.tsx' // Assuming .tsx
import { Button } from '@/components/ui/button'

import { useDisplayMutations } from '../hooks/useDisplayMutations'
import { protect, ProtectProps } from '../helpers/auth' // Now .tsx
import { useDisplayContext } from '../contexts/DisplayContext'

interface ScreensProps extends ProtectProps {
  displayId?: string; // displayId might be optional or from router query
}

const ScreensComponent = memo(function ScreensComponent({ loggedIn, displayId }: ScreensProps) {
  const screenListRef = useRef<IScreenListRef>(null)
  const displayContext = useDisplayContext()
  const { createDisplay } = useDisplayMutations()

  useEffect(() => {
    if (displayId) {
      displayContext.setId(displayId)
    } else {
      /*
       * If no displayId is passed (e.g. not in query),
       * the context will handle the default state appropriately
       */
    }
  }, [displayId, displayContext])

  const add = (): Promise<void> => {
    return new Promise((resolve) => {
      // Open the create dialog instead of directly creating a display
      if (screenListRef && screenListRef.current) {
        screenListRef.current.openCreateDialog()
      }
      resolve()
    })
  }

  return (
    <Frame loggedIn={loggedIn}>
      <div className="space-y-8">
        {/* Header Section */}
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Screens</h1>
            <p className="text-muted-foreground">
              Manage your digital displays and monitor their status in real-time.
            </p>
          </div>
          <Button
            onClick={add}
            size="lg"
            className="w-full sm:w-auto"
          >
            <Tv className="mr-2 h-5 w-5" />
            Add New Display
          </Button>
        </div>

        {/* Screens List */}
        <div className="space-y-6">
          <ScreenListComponent ref={screenListRef as any} />
        </div>
        
        <Dialog><div></div></Dialog>
      </div>
    </Frame>
  )
})

// Create a wrapper component for getInitialProps
const Screens = (props: ScreensProps) => <ScreensComponent {...props} />

// Add getInitialProps to the wrapper component
Screens.getInitialProps = async (ctx: any): Promise<{ displayId?: string }> => {
  const displayId = ctx.query.id as string | undefined
  return { displayId }
}

export default protect(Screens)