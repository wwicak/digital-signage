'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Settings, Monitor, Layout } from 'lucide-react'
import DisplaySelector from '@/components/DisplaySelector/DisplaySelector'
import LayoutAssignment from '@/components/DisplaySelector/LayoutAssignment'
import DisplayConfigSidebar from '@/components/DisplayConfigSidebar'
import { useDisplaySelector } from '@/hooks/useDisplaySelector'

export default function DisplayConfigPage() {
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | null
    message: string
  }>({ type: null, message: '' })

  // Use the display selector hook for the functionality
  const {
    selectedDisplay,
    handleDisplaySelect,
  } = useDisplaySelector()

  const handlePreviewDisplay = (displayId: string) => {
    window.open(`/preview?display=${displayId}`, '_blank')
  }

  const handleEditLayout = (displayId: string) => {
    window.open(`/layouts?display=${displayId}`, '_blank')
  }

  const handleDisplaySettings = (displayId: string) => {
    window.open(`/screens`, '_blank')
  }

  const handleRefreshDisplay = (displayId: string) => {
    setNotification({
      type: 'success',
      message: `Refresh signal sent to display`,
    })

    setTimeout(() => {
      setNotification({ type: null, message: '' })
    }, 3000)
  }

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold mb-2'>Display Configuration Center</h1>
        <p className='text-muted-foreground'>
          Manage and configure your digital displays from this centralized admin panel.
        </p>
      </div>

      <div className='grid grid-cols-1 xl:grid-cols-4 gap-6'>
        {/* Main Content */}
        <div className='xl:col-span-3'>
          <Card className='border-0 shadow-xl'>
            <CardHeader className='text-center pb-6'>
              <CardTitle className='text-2xl flex items-center justify-center gap-2'>
                <Settings className='h-6 w-6' />
                Display Management
              </CardTitle>
              <CardDescription className='text-lg'>
                Select displays and assign layouts. This is an admin-only interface.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Notification */}
              {notification.type && (
                <Alert variant={notification.type === 'error' ? 'destructive' : 'default'} className='mb-6'>
                  <AlertDescription>{notification.message}</AlertDescription>
                </Alert>
              )}

              <Tabs defaultValue='select' className='w-full'>
                <TabsList className='grid w-full grid-cols-2'>
                  <TabsTrigger value='select' className='flex items-center gap-2'>
                    <Monitor className='h-4 w-4' />
                    Select Display
                  </TabsTrigger>
                  <TabsTrigger value='assign' className='flex items-center gap-2'>
                    <Layout className='h-4 w-4' />
                    Assign Layout
                  </TabsTrigger>
                </TabsList>

                <TabsContent value='select' className='mt-6'>
                  <DisplaySelector
                    onDisplaySelect={handleDisplaySelect}
                    selectedDisplayId={selectedDisplay?._id}
                    showLayoutInfo={true}
                    className='min-h-[400px]'
                  />
                </TabsContent>

                <TabsContent value='assign' className='mt-6'>
                  <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
                    <DisplaySelector
                      onDisplaySelect={handleDisplaySelect}
                      selectedDisplayId={selectedDisplay?._id}
                      showLayoutInfo={true}
                      className='lg:max-h-[500px] lg:overflow-y-auto'
                    />
                    <LayoutAssignment
                      selectedDisplay={selectedDisplay}
                      onAssignmentComplete={(success, message) => {
                        setNotification({
                          type: success ? 'success' : 'error',
                          message: message || (success ? 'Layout assigned successfully!' : 'Failed to assign layout'),
                        })

                        // Clear notification after 5 seconds
                        setTimeout(() => {
                          setNotification({ type: null, message: '' })
                        }, 5000)
                      }}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className='xl:col-span-1'>
          <DisplayConfigSidebar
            selectedDisplay={selectedDisplay}
            onPreviewDisplay={handlePreviewDisplay}
            onEditLayout={handleEditLayout}
            onDisplaySettings={handleDisplaySettings}
            onRefreshDisplay={handleRefreshDisplay}
            className='sticky top-4'
          />
        </div>
      </div>
    </div>
  )
}