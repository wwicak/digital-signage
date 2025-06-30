'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Monitor, Play, Loader2, Settings, Wifi, Eye, X, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import LayoutPreviewRenderer from '@/components/LayoutPreview/LayoutPreviewRenderer'
import { detectIPAddress } from '@/lib/utils/ipDetection'

interface Layout {
   _id: string
   name: string
   description?: string
   orientation: 'landscape' | 'portrait'
   layoutType: 'spaced' | 'compact'
   isActive: boolean
   thumbnail?: string
   widgets: Array<{
      widget_id: {
         _id: string
         type: string
         name?: string
      }
      x: number
      y: number
      w: number
      h: number
   }>
}

interface DisplayWithStatus {
   _id: string
   name: string
   description?: string
   location?: string
   building?: string
   orientation: 'landscape' | 'portrait'
   layout?: Layout | string
   isOnline?: boolean
   lastSeen?: Date | null
   ipAddress?: string | null
   registrationStatus?: 'pending' | 'configured'
}

interface DisplayRegistration {
   displayName: string
}

interface DisplayRegistrationResponse {
   success: boolean
   status: 'configured'
   message: string
   display: {
      _id: string
      name: string
      registrationStatus?: string
      location?: string
      building?: string
      layout?: string
      orientation?: string
   }
}

export default function DisplaySelectorPage() {
   const [layouts, setLayouts] = useState<Layout[]>([])
   const [selectedLayout, setSelectedLayout] = useState<Layout | null>(null)
   const [loading, setLoading] = useState(true)
   const [registering, setRegistering] = useState(false)
   const [error, setError] = useState<string | null>(null)
   const [searchTerm, setSearchTerm] = useState('')
   const [orientationFilter, setOrientationFilter] = useState<'all' | 'landscape' | 'portrait'>('all')
   const [displayInfo, setDisplayInfo] = useState<DisplayRegistration>({
      displayName: ''
   })
   const [step, setStep] = useState<'check' | 'select' | 'configure' | 'running'>('check')
   const [previewLayout, setPreviewLayout] = useState<Layout | null>(null)
   const [existingDisplay, setExistingDisplay] = useState<DisplayWithStatus | null>(null)
   const [availableDisplays, setAvailableDisplays] = useState<DisplayWithStatus[]>([])
   const [checkingExisting, setCheckingExisting] = useState(true)
   const [selectedExistingDisplay, setSelectedExistingDisplay] = useState<string>('')
   const [ipAddress, setIpAddress] = useState<string>('')
   const router = useRouter()

   // Get client info for registration
   const getClientInfo = () => {
      return {
         screenResolution: `${window.screen.width}x${window.screen.height}`,
         browserVersion: navigator.userAgent,
         platform: navigator.platform,
         ipAddress: 'auto-detect', // Will be detected server-side
      }
   }

   // Check for existing display by IP on mount
   useEffect(() => {
      const checkExistingDisplay = async () => {
         try {
            setCheckingExisting(true)
            
            // Detect client IP
            const ipResult = await detectIPAddress()
            if (ipResult.ip) {
               setIpAddress(ipResult.ip)
            }
            
            // Check if display exists with this IP
            const response = await fetch('/api/displays/check-ip')
            if (response.ok) {
               const data = await response.json()
               
               if (data.exists && data.display) {
                  setExistingDisplay(data.display)
                  // If display exists, show configuration to confirm or change
                  setStep('select')
               } else {
                  // No existing display, proceed to layout selection
                  setStep('select')
               }
            } else {
               // API error, proceed to layout selection
               setStep('select')
            }
         } catch (error) {
            console.error('Error checking existing display:', error)
            setStep('select')
         } finally {
            setCheckingExisting(false)
         }
      }

      checkExistingDisplay()
   }, [])

   // Fetch available layouts
   useEffect(() => {
      const fetchLayouts = async () => {
         try {
            setLoading(true)
            const response = await fetch('/api/layouts?isActive=true&isTemplate=true')

            if (!response.ok) {
               throw new Error('Failed to fetch layouts')
            }

            const data = await response.json()
            setLayouts(data.layouts || [])
         } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load layouts')
         } finally {
            setLoading(false)
         }
      }

      fetchLayouts()
   }, [])

   // Fetch available displays for selection
   useEffect(() => {
      const fetchAvailableDisplays = async () => {
         try {
            const response = await fetch('/api/displays/check-ip', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ includeOffline: true })
            })

            if (response.ok) {
               const data = await response.json()
               setAvailableDisplays(data.displays || [])
            }
         } catch (error) {
            console.error('Error fetching available displays:', error)
         }
      }

      if (step === 'select' && !existingDisplay) {
         fetchAvailableDisplays()
      }
   }, [step, existingDisplay])

   // Filter layouts based on search and orientation
   const filteredLayouts = React.useMemo(() => {
      return layouts.filter((layout) => {
         const matchesSearch =
            layout.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            layout.description?.toLowerCase().includes(searchTerm.toLowerCase())

         const matchesOrientation =
            orientationFilter === 'all' || layout.orientation === orientationFilter

         return matchesSearch && matchesOrientation
      })
   }, [layouts, searchTerm, orientationFilter])

   const handleLayoutSelect = (layout: Layout) => {
      setSelectedLayout(layout)
      if (existingDisplay) {
         // If using existing display, skip configuration
         handleRunLayout()
      } else {
         setStep('configure')
      }
   }

   const handleUseExistingDisplay = async () => {
      if (!selectedExistingDisplay) return

      try {
         setRegistering(true)
         setError(null)

         // Get the selected display data
         const display = availableDisplays.find(d => d._id === selectedExistingDisplay)
         if (!display) {
            throw new Error('Selected display not found')
         }

         // Update display IP address and mark as online
         const heartbeatResponse = await fetch(`/api/v1/displays/${display._id}/heartbeat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
               timestamp: new Date().toISOString(),
               clientInfo: getClientInfo(),
               performanceMetrics: {
                  loadTime: performance.now(),
                  renderTime: 0,
                  errorCount: 0
               }
            })
         })

         if (!heartbeatResponse.ok) {
            throw new Error('Failed to update display status')
         }

         setStep('running')
         
         // Navigate to display after a short delay
         setTimeout(() => {
            router.push(`/display/${display._id}`)
         }, 2000)

      } catch (err) {
         setError(err instanceof Error ? err.message : 'Failed to use existing display')
      } finally {
         setRegistering(false)
      }
   }

   const handlePreviewLayout = (layout: Layout, event: React.MouseEvent) => {
      event.stopPropagation()
      setPreviewLayout(layout)
   }

   const closePreview = () => {
      setPreviewLayout(null)
   }

   // Handle escape key to close preview
   useEffect(() => {
      const handleEscapeKey = (event: KeyboardEvent) => {
         if (event.key === 'Escape' && previewLayout) {
            closePreview()
         }
      }

      if (previewLayout) {
         document.addEventListener('keydown', handleEscapeKey)
         return () => document.removeEventListener('keydown', handleEscapeKey)
      }
   }, [previewLayout])

   const handleRunLayout = async () => {
      if (existingDisplay && existingDisplay.registrationStatus === 'configured') {
         // Using existing configured display
         try {
            setRegistering(true)
            setError(null)

            // Send heartbeat to mark as online
            await fetch(`/api/v1/displays/${existingDisplay._id}/heartbeat`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({
                  timestamp: new Date().toISOString(),
                  clientInfo: getClientInfo(),
                  performanceMetrics: {
                     loadTime: performance.now(),
                     renderTime: 0,
                     errorCount: 0
                  }
               })
            })

            setStep('running')
            setTimeout(() => {
               router.push(`/display/${existingDisplay._id}`)
            }, 2000)

         } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to connect to display')
         } finally {
            setRegistering(false)
         }
         return
      }

      // Register new display with name and selected layout
      try {
         setRegistering(true)
         setError(null)

         const displayData = {
            name: displayInfo.displayName || `Display-${Date.now()}`,
            layout: selectedLayout?._id
         }

         const response = await fetch('/api/displays/register', {
            method: 'POST',
            headers: {
               'Content-Type': 'application/json',
            },
            body: JSON.stringify(displayData),
         })

         if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Failed to register display')
         }

         const result: DisplayRegistrationResponse = await response.json()
         
         if (result.status === 'configured') {
            // Display is configured and ready to use
            setStep('running')
            
            // Send initial heartbeat to register as online
            await fetch(`/api/v1/displays/${result.display._id}/heartbeat`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({
                  timestamp: new Date().toISOString(),
                  clientInfo: getClientInfo(),
                  performanceMetrics: {
                     loadTime: performance.now(),
                     renderTime: 0,
                     errorCount: 0
                  }
               })
            })
            
            setTimeout(() => {
               router.push(`/display/${result.display._id}`)
            }, 2000)
         }

      } catch (err) {
         setError(err instanceof Error ? err.message : 'Failed to register display')
      } finally {
         setRegistering(false)
      }
   }

   const handleBack = () => {
      if (step === 'configure') {
         setStep('select')
         setSelectedLayout(null)
      } else if (step === 'running') {
         setStep('select')
         setSelectedLayout(null)
      }
   }

   if (checkingExisting || loading) {
      return (
         <div className='min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center'>
            <div className='text-center space-y-4'>
               <Loader2 className='h-12 w-12 animate-spin mx-auto text-primary' />
               <p className='text-lg text-muted-foreground'>
                  {checkingExisting ? 'Checking for existing display configuration...' : 'Loading available layouts...'}
               </p>
            </div>
         </div>
      )
   }

   return (
      <div className='min-h-screen bg-gradient-to-br from-background via-background to-muted/20'>
         <div className='container mx-auto px-4 py-8'>
            {/* Header */}
            <div className='text-center mb-8'>
               <div className='flex items-center justify-center gap-2 mb-4'>
                  <Monitor className='h-8 w-8 text-primary' />
                  <h1 className='text-3xl font-bold'>Display Setup</h1>
               </div>
               <p className='text-lg text-muted-foreground'>
                  Choose a layout to run on this display
               </p>
            </div>

            {error && (
               <Alert className='mb-6 border-destructive/50'>
                  <AlertDescription className='text-destructive'>
                     {error}
                  </AlertDescription>
               </Alert>
            )}

            {/* Existing Display Notice */}
            {existingDisplay && step === 'select' && (
               <Alert className='mb-6 border-blue-500/50 bg-blue-50/10'>
                  <CheckCircle className='h-4 w-4 text-blue-500' />
                  <AlertDescription className='text-blue-700 dark:text-blue-300'>
                     <strong>Welcome back!</strong> This display was previously configured as &quot;{existingDisplay.name}&quot;
                     at {existingDisplay.location}. You can continue with the same configuration or set up a new one.
                  </AlertDescription>
               </Alert>
            )}

            {/* Option to use existing display */}
            {step === 'select' && availableDisplays.length > 0 && !existingDisplay && (
               <Card className='mb-6'>
                  <CardHeader>
                     <CardTitle>Use Existing Display Configuration</CardTitle>
                     <CardDescription>
                        If this physical display was previously configured, you can select it from the list below
                     </CardDescription>
                  </CardHeader>
                  <CardContent className='space-y-4'>
                     <Select value={selectedExistingDisplay} onValueChange={setSelectedExistingDisplay}>
                        <SelectTrigger>
                           <SelectValue placeholder='Select an existing display' />
                        </SelectTrigger>
                        <SelectContent>
                           {availableDisplays.map((display) => (
                              <SelectItem key={display._id} value={display._id}>
                                 <div className='flex items-center justify-between w-full'>
                                    <span>{display.name}</span>
                                    <span className='text-sm text-muted-foreground ml-2'>
                                       {display.location} • {display.isOnline ? 'Online' : 'Offline'}
                                    </span>
                                 </div>
                              </SelectItem>
                           ))}
                        </SelectContent>
                     </Select>
                     
                     <Button
                        onClick={handleUseExistingDisplay}
                        disabled={!selectedExistingDisplay || registering}
                        className='w-full'
                     >
                        {registering ? (
                           <>
                              <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                              Connecting...
                           </>
                        ) : (
                           <>
                              <CheckCircle className='h-4 w-4 mr-2' />
                              Use Selected Display
                           </>
                        )}
                     </Button>
                     
                     <div className='relative'>
                        <div className='absolute inset-0 flex items-center'>
                           <span className='w-full border-t' />
                        </div>
                        <div className='relative flex justify-center text-xs uppercase'>
                           <span className='bg-background px-2 text-muted-foreground'>Or create new</span>
                        </div>
                     </div>
                  </CardContent>
               </Card>
            )}

            {/* Step 1: Layout Selection */}
            {step === 'select' && (
               <div className='space-y-6'>
                  {/* Filters */}
                  <div className='flex flex-col sm:flex-row gap-4'>
                     <div className='flex-1'>
                        <Input
                           placeholder='Search layouts...'
                           value={searchTerm}
                           onChange={(e) => setSearchTerm(e.target.value)}
                        />
                     </div>
                     <Select value={orientationFilter} onValueChange={(value: 'all' | 'landscape' | 'portrait') => setOrientationFilter(value)}>
                        <SelectTrigger className='w-full sm:w-[180px]'>
                           <SelectValue placeholder='Filter by orientation' />
                        </SelectTrigger>
                        <SelectContent>
                           <SelectItem value='all'>All Orientations</SelectItem>
                           <SelectItem value='landscape'>Landscape</SelectItem>
                           <SelectItem value='portrait'>Portrait</SelectItem>
                        </SelectContent>
                     </Select>
                  </div>

                  {/* Layout Grid */}
                  {filteredLayouts.length === 0 ? (
                     <Card>
                        <CardContent className='pt-6'>
                           <div className='text-center text-muted-foreground'>
                              {searchTerm || orientationFilter !== 'all'
                                 ? 'No layouts match your filters'
                                 : 'No layouts available'
                              }
                           </div>
                        </CardContent>
                     </Card>
                  ) : (
                     <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                        {filteredLayouts.map((layout) => (
                           <Card
                              key={layout._id}
                              className='cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1'
                              onClick={() => handleLayoutSelect(layout)}
                           >
                              <CardHeader className='pb-3'>
                                 <div className='flex items-center justify-between'>
                                    <CardTitle className='text-lg'>{layout.name}</CardTitle>
                                    <Badge variant={layout.orientation === 'landscape' ? 'default' : 'secondary'}>
                                       {layout.orientation}
                                    </Badge>
                                 </div>
                                 {layout.description && (
                                    <CardDescription>{layout.description}</CardDescription>
                                 )}
                                 {existingDisplay && typeof existingDisplay.layout === 'object' && existingDisplay.layout?._id === layout._id && (
                                    <Badge variant='outline' className='mt-1'>
                                       Current Layout
                                    </Badge>
                                 )}
                              </CardHeader>
                              <CardContent className='space-y-3'>
                                 {/* Layout Thumbnail Preview */}
                                 <div className='relative bg-muted/30 rounded-lg overflow-hidden aspect-video'>
                                    <div className='w-full h-full bg-gradient-to-br from-blue-900/20 to-purple-900/20 flex items-center justify-center'>
                                       <div className='text-center text-muted-foreground'>
                                          <Monitor className={cn(
                                             'mx-auto mb-2',
                                             layout.orientation === 'portrait' ? 'h-6 w-6 rotate-90' : 'h-6 w-6'
                                          )} />
                                          <p className='text-xs'>
                                             {layout.widgets.length} widgets
                                          </p>
                                       </div>
                                    </div>
                                    {/* Preview button overlay */}
                                    <Button
                                       variant='secondary'
                                       size='sm'
                                       className='absolute top-2 right-2 h-8 w-8 p-0 opacity-0 hover:opacity-100 transition-opacity'
                                       onClick={(e) => handlePreviewLayout(layout, e)}
                                    >
                                       <Eye className='h-4 w-4' />
                                    </Button>
                                 </div>
                                 
                                 <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                                    <Settings className='h-4 w-4' />
                                    <span>{layout.widgets.length} widgets</span>
                                    <span>•</span>
                                    <span>{layout.layoutType}</span>
                                 </div>
                                 
                                 <div className='flex gap-2'>
                                    <Button
                                       variant='outline'
                                       size='sm'
                                       className='flex-1'
                                       onClick={(e) => handlePreviewLayout(layout, e)}
                                    >
                                       <Eye className='h-4 w-4 mr-2' />
                                       Preview
                                    </Button>
                                    <Button className='flex-1' size='sm'>
                                       <Play className='h-4 w-4 mr-2' />
                                       Select
                                    </Button>
                                 </div>
                              </CardContent>
                           </Card>
                        ))}
                     </div>
                  )}
               </div>
            )}

            {/* Step 2: Display Configuration */}
            {step === 'configure' && selectedLayout && (
               <div className='max-w-2xl mx-auto space-y-6'>
                  <div className='text-center'>
                     <h2 className='text-2xl font-bold mb-2'>Register Display</h2>
                     <p className='text-muted-foreground'>
                        Give your display a name to run <strong>{selectedLayout.name}</strong>
                     </p>
                  </div>

                  <Card>
                     <CardHeader>
                        <CardTitle>Display Name</CardTitle>
                        <CardDescription>
                           Choose a name to identify this display. You can start using it immediately after registration.
                        </CardDescription>
                     </CardHeader>
                     <CardContent className='space-y-4'>
                        <div>
                           <label className='text-sm font-medium mb-2 block'>Display Name</label>
                           <Input
                              placeholder='e.g., Lobby Display 1'
                              value={displayInfo.displayName}
                              onChange={(e) => setDisplayInfo(prev => ({ ...prev, displayName: e.target.value }))}
                           />
                           <p className='text-xs text-muted-foreground mt-1'>
                              This display will start running immediately. Administrators can update location and other settings later.
                           </p>
                        </div>
                     </CardContent>
                  </Card>

                  <div className='flex gap-4'>
                     <Button variant='outline' onClick={handleBack} className='flex-1'>
                        Back
                     </Button>
                     <Button
                        onClick={handleRunLayout}
                        disabled={registering || !displayInfo.displayName.trim()}
                        className='flex-1'
                     >
                        {registering ? (
                           <>
                              <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                              Registering...
                           </>
                        ) : (
                           <>
                              <Play className='h-4 w-4 mr-2' />
                              Start Display
                           </>
                        )}
                     </Button>
                  </div>
               </div>
            )}

            {/* Step 3: Running */}
            {step === 'running' && (selectedLayout || selectedExistingDisplay) && (
               <div className='max-w-md mx-auto text-center space-y-6'>
                  <div className='space-y-4'>
                     <div className='w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto'>
                        <Wifi className='h-8 w-8 text-green-600' />
                     </div>
                     <h2 className='text-2xl font-bold text-green-600'>Display Online!</h2>
                     <p className='text-muted-foreground'>
                        {selectedExistingDisplay ? (
                           <>Your display has been reconnected successfully</>
                        ) : (
                           <>Your display has been registered and is ready to run <strong>{selectedLayout?.name}</strong></>
                        )}
                     </p>
                  </div>

                  <div className='bg-muted/50 rounded-lg p-4 space-y-2 text-sm'>
                     <div className='flex justify-between'>
                        <span className='text-muted-foreground'>Display Name:</span>
                        <span className='font-medium'>{displayInfo.displayName || existingDisplay?.name || 'Auto-generated'}</span>
                     </div>
                     {existingDisplay?.location && (
                        <div className='flex justify-between'>
                           <span className='text-muted-foreground'>Location:</span>
                           <span className='font-medium'>{existingDisplay.location}</span>
                        </div>
                     )}
                     {existingDisplay?.building && (
                        <div className='flex justify-between'>
                           <span className='text-muted-foreground'>Building:</span>
                           <span className='font-medium'>{existingDisplay.building}</span>
                        </div>
                     )}
                  </div>

                  <p className='text-sm text-muted-foreground'>
                     Redirecting to display view...
                  </p>
               </div>
            )}

            {/* Full-screen Layout Preview Modal */}
            {previewLayout && (
               <div
                  className='fixed inset-0 bg-black z-50 flex flex-col'
                  style={{ width: '100vw', height: '100vh' }}
               >
                  {/* Header bar with layout info and close button */}
                  <div className='flex items-center justify-between p-4 bg-black/80 backdrop-blur-sm border-b border-white/10'>
                     <div className='flex items-center gap-4 text-white'>
                        <div>
                           <h2 className='text-xl font-bold'>{previewLayout.name}</h2>
                           {previewLayout.description && (
                              <p className='text-sm text-white/70'>{previewLayout.description}</p>
                           )}
                        </div>
                        <div className='flex gap-2'>
                           <Badge variant={previewLayout.orientation === 'landscape' ? 'default' : 'secondary'}>
                              {previewLayout.orientation}
                           </Badge>
                           <Badge variant='outline' className='text-white border-white/30'>
                              {previewLayout.widgets.length} widgets
                           </Badge>
                        </div>
                     </div>
                     
                     <div className='flex items-center gap-2'>
                        <Button
                           onClick={() => {
                              closePreview()
                              handleLayoutSelect(previewLayout)
                           }}
                           className='bg-blue-600 hover:bg-blue-700 text-white'
                        >
                           <Play className='h-4 w-4 mr-2' />
                           Select Layout
                        </Button>
                        <Button
                           variant='ghost'
                           size='sm'
                           onClick={closePreview}
                           className='text-white hover:bg-white/10'
                        >
                           <X className='h-5 w-5' />
                        </Button>
                     </div>
                  </div>

                  {/* Full-screen preview container */}
                  <div className='flex-1 bg-gray-100 overflow-hidden'>
                     <LayoutPreviewRenderer
                        layout={previewLayout}
                        className='w-full h-full'
                     />
                  </div>

                  {/* Status bar showing escape hint */}
                  <div className='bg-black/80 backdrop-blur-sm border-t border-white/10 px-4 py-2'>
                     <p className='text-xs text-white/60 text-center'>
                        Press ESC to close preview
                     </p>
                  </div>
               </div>
            )}
         </div>
      </div>
   )
}