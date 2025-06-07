import React, { useEffect, useRef, memo } from 'react'

import Frame from '../components/Admin/Frame.tsx' // Assuming .tsx
import ScreenListComponent, { IScreenListRef } from '../components/Admin/ScreenList.tsx' // Renamed, Assuming .tsx
import Dialog from '../components/Dialog.tsx' // Assuming .tsx
import { Button } from '../components/Form' // Assuming Form components are in .tsx or have .d.ts

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
    return new Promise((resolve, reject) => {
      createDisplay.mutate({ data: { name: "New Display" } }, {
        onSuccess: () => {
          // Type guard for ref
          if (screenListRef && screenListRef.current) {
            screenListRef.current.refresh()
          }
          resolve()
        },
        onError: (error) => {
          console.error('Failed to create display:', error)
          reject(error)
        }
      })
    })
  }

  return (
    <Frame loggedIn={loggedIn}>
      <h1>Screens</h1>
      <div className='wrapper'>
        <ScreenListComponent ref={screenListRef as any} />
        <Dialog><div></div></Dialog>
        <Button
          text={'+ Add new screen'}
          color={'#8bc34a'}
          onClick={add}
          style={{ marginLeft: 0, width: '100%' }}
        />
      </div>
      <style jsx>
        {`
          h1 {
            font-family: 'Open Sans', sans-serif;
            font-size: 24px;
            color: #4f4f4f;
            margin: 0px;
          }
          .wrapper {
            margin: 40px auto;
            max-width: 640px;
          }
        `}
      </style>
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
