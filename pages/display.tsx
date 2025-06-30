import React, { memo, useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { NextPageContext } from 'next'

import DisplayComponent from '../components/Display/Display' // Renamed to DisplayComponent to avoid conflict

interface IDisplayPageProps {
  host: string;
  displayId: string | undefined; // displayId can be undefined if not in query
  layoutId: string | undefined; // layoutId for layout-based display
  autostart: boolean; // whether to auto-start the display
}

const DisplayPageComponent = memo(function DisplayPageComponent({
  host,
  displayId,
  layoutId,
  autostart
}: IDisplayPageProps) {
  const router = useRouter();
  const [actualDisplayId, setActualDisplayId] = useState<string | undefined>(displayId);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Handle client-side hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Only run registration on client side to avoid hydration mismatch
    if (!isClient) return;

    // If we have a layoutId but no displayId, we need to auto-register this display
    if (layoutId && !displayId && autostart) {
      registerDisplay();
    }
  }, [isClient, layoutId, displayId, autostart]);

  const registerDisplay = async () => {
    // Only register on client side
    if (!isClient) return;

    setIsRegistering(true);

    try {
      // Get device information (safe to use browser APIs here since we're on client)
      const deviceInfo = {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
        screenResolution: typeof screen !== 'undefined' ? `${screen.width}x${screen.height}` : 'Unknown',
        orientation: typeof screen !== 'undefined' ? (screen.width > screen.height ? 'landscape' : 'portrait') : 'landscape',
      };

      // Auto-register this display with the selected layout
      const response = await fetch('/api/displays', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `Auto Display ${Date.now()}`,
          layout: layoutId,
          location: 'Auto-detected Location',
          building: 'Main Building',
          orientation: deviceInfo.orientation,
          autoRegistered: true,
          deviceInfo,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const newDisplayId = data.display?._id || data._id;
        setActualDisplayId(newDisplayId);

        // Update URL to include the display ID for future reference
        router.replace(`/display?display=${newDisplayId}&layout=${layoutId}`, undefined, { shallow: true });
      } else {
        console.error('Failed to register display:', response.statusText);
      }
    } catch (error) {
      console.error('Error registering display:', error);
    } finally {
      setIsRegistering(false);
    }
  };

  // Show loading state while hydrating
  if (!isClient) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-100'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4'></div>
          <h2 className='text-xl font-semibold text-gray-900 mb-2'>Loading Display...</h2>
          <p className='text-gray-600'>Initializing display system</p>
        </div>
      </div>
    );
  }

  // Show registration loading state
  if (isRegistering) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-100'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4'></div>
          <h2 className='text-xl font-semibold text-gray-900 mb-2'>Registering Display...</h2>
          <p className='text-gray-600'>Setting up your display with the selected layout</p>
        </div>
      </div>
    );
  }

  // Show layout selection if no display ID and no layout ID
  if (!actualDisplayId && !layoutId) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-100'>
        <div className='text-center'>
          <h2 className='text-2xl font-semibold text-gray-900 mb-4'>Display Setup Required</h2>
          <p className='text-gray-600 mb-6'>Please select a layout for this display</p>
          <button
            onClick={() => router.push('/display-selector')}
            className='bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors'
          >
            Choose Layout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='w-full h-screen overflow-hidden'>
      {/* Pass the displayId obtained from props directly to the Display component */}
      {/* The Display component uses this ID to fetch its own data and setup SSE */}
      {actualDisplayId ? (
        <DisplayComponent display={actualDisplayId} />
      ) : (
        <div className='min-h-screen flex items-center justify-center'>
          <div>Loading display information...</div>
        </div>
      )}
    </div>
  )
})

// Create a wrapper component for getInitialProps
const DisplayPage = (props: IDisplayPageProps) => <DisplayPageComponent {...props} />

DisplayPage.getInitialProps = async (ctx: NextPageContext): Promise<IDisplayPageProps> => {
  const displayId = ctx.query && typeof ctx.query.display === 'string' ? ctx.query.display : undefined
  const layoutId = ctx.query && typeof ctx.query.layout === 'string' ? ctx.query.layout : undefined
  const autostart = ctx.query && ctx.query.autostart === 'true'
  const host =
    ctx.req && ctx.req.headers && ctx.req.headers.host
      ? 'http://' + ctx.req.headers.host
      : typeof window !== 'undefined' ? window.location.origin : '' // Handle server/client side host

  return { host, displayId, layoutId, autostart }
}

export default DisplayPage