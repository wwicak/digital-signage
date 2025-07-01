import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { ArrowLeft, Monitor, Smartphone, Eye, ExternalLink } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Frame from '../components/Admin/Frame'
import { protect, ProtectProps } from '../helpers/auth'
import { useLayout } from '../hooks/useLayout'

interface LayoutPreviewProps extends ProtectProps { }

const LayoutPreviewComponent: React.FC<LayoutPreviewProps> = ({ loggedIn }) => {
  const router = useRouter()
  const { id } = router.query
  const layoutId = typeof id === 'string' ? id : null

  const { data: layout, isLoading, error } = useLayout(layoutId)
  const [previewScale, setPreviewScale] = useState(0.5)
  const [isClient, setIsClient] = useState(false)

  // Handle client-side hydration
  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    // Only run scaling calculations on client side to avoid hydration mismatch
    if (!isClient) return

    // Adjust preview scale based on screen size
    const updateScale = () => {
      // Account for sidebar (240px) + padding + margins more conservatively
      const sidebarWidth = 240
      const padding = 120 // More generous padding for margins and spacing
      const availableWidth = Math.max(window.innerWidth - sidebarWidth - padding, 300)

      // Use a more conservative max width to prevent overflow
      const containerWidth = Math.min(availableWidth, 800)
      const layoutWidth = layout?.orientation === 'portrait' ? 720 : 1280

      // More conservative scaling with lower maximum
      const scale = Math.min(containerWidth / layoutWidth, 0.6)
      setPreviewScale(Math.max(scale, 0.2)) // Ensure minimum scale
    }

    updateScale()
    window.addEventListener('resize', updateScale)

    // Cleanup function to prevent memory leaks
    return () => {
      window.removeEventListener('resize', updateScale)
    }
  }, [isClient, layout?.orientation]) // Depend on isClient and orientation

  if (isLoading) {
    return (
      <Frame loggedIn={loggedIn}>
        <div className='flex items-center justify-center min-h-[400px]'>
          <div className='text-center'>
            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4'></div>
            <p className='text-muted-foreground'>Loading layout preview...</p>
          </div>
        </div>
      </Frame>
    )
  }

  if (error || !layout) {
    return (
      <Frame loggedIn={loggedIn}>
        <div className='text-center py-12'>
          <h1 className='text-2xl font-bold text-destructive mb-4'>Layout Not Found</h1>
          <p className='text-muted-foreground mb-6'>
            {error?.message || 'The requested layout could not be found.'}
          </p>
          <Link href='/layouts'>
            <Button>
              <ArrowLeft className='mr-2 h-4 w-4' />
              Back to Layouts
            </Button>
          </Link>
        </div>
      </Frame>
    )
  }

  const displayUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/display-selector?layout=${layout._id}`

  return (
    <Frame loggedIn={loggedIn}>
      <div className='space-y-6 overflow-x-hidden max-w-full'>
        {/* Header */}
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-4'>
            <Link href='/layouts'>
              <Button variant='outline' size='sm'>
                <ArrowLeft className='mr-2 h-4 w-4' />
                Back to Layouts
              </Button>
            </Link>
            <div>
              <h1 className='text-3xl font-bold'>{layout.name}</h1>
              <p className='text-muted-foreground'>{layout.description || 'No description'}</p>
            </div>
          </div>

          <div className='flex items-center space-x-2'>
            <Badge variant={layout.isActive ? "default" : "secondary"}>
              {layout.isActive ? "Active" : "Inactive"}
            </Badge>
            <Badge variant='outline'>
              {layout.orientation === 'portrait' ? (
                <><Smartphone className='mr-1 h-3 w-3' /> Portrait</>
              ) : (
                <><Monitor className='mr-1 h-3 w-3' /> Landscape</>
              )}
            </Badge>
          </div>
        </div>

        {/* Layout Info */}
        <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm'>Widgets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{layout.widgets?.length || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm'>Layout Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-lg font-medium capitalize'>{layout.layoutType}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm'>Grid Size</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-lg font-medium'>
                {layout.gridConfig?.cols || 16} × {layout.gridConfig?.rows || 9}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm'>Displays Using</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{layout.displays?.length || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        <Card>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <CardTitle className='flex items-center'>
                <Eye className='mr-2 h-5 w-5' />
                Layout Preview
              </CardTitle>
              <div className='flex items-center space-x-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => window.open(`/layout-admin?id=${layout._id}`, '_blank')}
                >
                  Edit Layout
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => window.open(displayUrl, '_blank')}
                >
                  <ExternalLink className='mr-2 h-4 w-4' />
                  Open Display URL
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className='bg-muted/30 p-4 sm:p-6 rounded-lg overflow-hidden'>
              <div className='text-center mb-4'>
                <p className='text-sm text-muted-foreground'>
                  Preview of how this layout will appear on displays
                </p>
              </div>

              {/* Mock Preview Container */}
              <div className='flex justify-center overflow-hidden'>
                <div
                  className='bg-black rounded-lg shadow-lg overflow-hidden max-w-full'
                  style={{
                    width: !isClient ? '640px' : (layout.orientation === 'portrait' ? `${720 * previewScale}px` : `${1280 * previewScale}px`),
                    height: !isClient ? '360px' : (layout.orientation === 'portrait' ? `${1280 * previewScale}px` : `${720 * previewScale}px`),
                    minHeight: '300px',
                    maxWidth: '100%',
                  }}
                >
                  <div className='w-full h-full bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center'>
                    <div className='text-center text-white px-4'>
                      <Monitor className='mx-auto h-12 w-12 sm:h-16 sm:w-16 mb-4 opacity-50' />
                      <h3 className='text-lg sm:text-xl font-semibold mb-2 break-words'>{layout.name}</h3>
                      <p className='text-xs sm:text-sm opacity-75 break-words'>
                        {layout.widgets?.length || 0} widgets • {layout.orientation} • {layout.layoutType}
                      </p>
                      <p className='text-xs opacity-50 mt-2'>
                        Live preview coming soon
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Display URL */}
        <Card>
          <CardHeader>
            <CardTitle>Display URL</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              <p className='text-sm text-muted-foreground'>
                Use this URL to display this layout on physical devices. The device will automatically register with the admin panel.
              </p>
              <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-2'>
                <code className='flex-1 p-3 bg-muted rounded border text-sm break-all min-w-0 overflow-hidden'>
                  {displayUrl}
                </code>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => navigator.clipboard.writeText(displayUrl)}
                  className='flex-shrink-0'
                >
                  Copy
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Connected Displays */}
        {layout.displays && layout.displays.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Connected Displays</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='space-y-2'>
                {layout.displays.map((display) => (
                  <div key={display._id} className='flex items-center justify-between p-3 border rounded'>
                    <div>
                      <p className='font-medium'>{display.name}</p>
                      <p className='text-sm text-muted-foreground'>
                        {display.location} • {display.building}
                      </p>
                    </div>
                    <Badge variant={display.isOnline ? "default" : "secondary"}>
                      {display.isOnline ? "Online" : "Offline"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Frame>
  )
}

const LayoutPreview = (props: LayoutPreviewProps) => <LayoutPreviewComponent {...props} />

export default protect(LayoutPreview)
