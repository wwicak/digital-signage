import React, { useEffect } from 'react'
import { useRouter } from 'next/router'

import Frame from '../components/Admin/Frame.tsx' // Assuming .tsx
import DisplayComponent from '../components/Display/Display.tsx' // Renamed to avoid conflict, assuming .tsx
import { protect, ProtectProps } from '../helpers/auth' // Now .tsx
import { useDisplayContext } from '../contexts/DisplayContext'

interface PreviewProps extends ProtectProps {
  displayId: string;
  host: string;
}

const PreviewPage = ({ host, loggedIn, displayId: initialDisplayId }: PreviewProps) => {
  const router = useRouter()
  const { setId } = useDisplayContext()
  
  // Get displayId from router query if not provided via props
  const displayId = initialDisplayId || (router.query.id as string)

  useEffect(() => {
    if (displayId) {
      setId(displayId)
    }
  }, [displayId, setId])

  return (
    <Frame loggedIn={loggedIn}>
      <h1>Preview</h1>
      <p>Below is a preview of the display as it will appear on the TV.</p>
      <div className='preview'>
        <div className='content'>
          <DisplayComponent display={displayId} />
        </div>
      </div>
      <style jsx>
        {`
          h1 {
            font-family: 'Open Sans', sans-serif;
            font-size: 24px;
            color: #4f4f4f;
            margin: 0px;
          }
          p {
            font-family: 'Open Sans', sans-serif;
          }
          .preview {
            margin-top: 20px;
            border-radius: 4px;
            overflow: hidden;
            padding-top: 56.25%; /* 16:9 Aspect Ratio */
            position: relative;
          }
          .preview .content {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
          }
        `}
      </style>
    </Frame>
  )
}

// Static method for getting initial props
PreviewPage.getInitialProps = async (ctx: any): Promise<{ displayId: string; host: string }> => {
  const displayId = ctx.query.id as string // Example: get id from query
  const host =
    ctx.req && ctx.req.headers && ctx.req.headers.host
      ? (ctx.req.socket?.encrypted ? 'https://' : 'http://') + ctx.req.headers.host
      : (typeof window !== 'undefined' ? window.location.origin : '')
  return { displayId: displayId || 'defaultDisplayId', host } // Ensure displayId has a fallback or handle if undefined
}

// The protect HOC should be typed to correctly pass/modify props.
export default protect(PreviewPage)
