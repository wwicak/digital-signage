'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Monitor, Play, Loader2, MapPin, Settings, Wifi } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

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

interface DisplayRegistration {
   displayName: string
   location: string
   building: string
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
      displayName: '',
      location: '',
      building: ''
   })
   const [step, setStep] = useState<'select' | 'configure' | 'running'>('select')
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
      setStep('configure')
   }

   const handleRunLayout = async () => {
      if (!selectedLayout) return

      try {
         setRegistering(true)
         setError(null)

         // Create or register display
         const displayData = {
            name: displayInfo.displayName || `Display-${Date.now()}`,
            description: `Auto-registered display running ${selectedLayout.name}`,
            location: displayInfo.location || 'Unknown Location',
            building: displayInfo.building || 'Main Building',
            layout: selectedLayout._id,
            orientation: selectedLayout.orientation,
            widgets: [], // Will be populated from layout
            statusBar: {
               enabled: true,
               elements: ['clock', 'wifi']
            },
            settings: {
               allowRemoteControl: true,
               autoRestart: true,
               volume: 70,
               brightness: 100
            }
         }

         const response = await fetch('/api/displays', {
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

         const result = await response.json()
         const displayId = result.display._id

         // Send initial heartbeat to register as online
         await fetch(`/api/v1/displays/${displayId}/heartbeat`, {
            method: 'POST',
            headers: {
               'Content-Type': 'application/json',
            },
            body: JSON.stringify({
               timestamp: new Date().toISOString(),
               clientInfo: getClientInfo(),
               performanceMetrics: {
                  loadTime: performance.now(),
                  renderTime: 0,
                  errorCount: 0
               }
            }),
         })

         setStep('running')

         // Navigate to display after a short delay
         setTimeout(() => {
            router.push(`/display/${displayId}`)
         }, 2000)

      } catch (err) {
         setError(err instanceof Error ? err.message : 'Failed to run layout')
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

   if (loading) {
      return (
         <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
            <div className="text-center space-y-4">
               <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
               <p className="text-lg text-muted-foreground">Loading available layouts...</p>
            </div>
         </div>
      )
   }

   return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
         <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="text-center mb-8">
               <div className="flex items-center justify-center gap-2 mb-4">
                  <Monitor className="h-8 w-8 text-primary" />
                  <h1 className="text-3xl font-bold">Display Setup</h1>
               </div>
               <p className="text-lg text-muted-foreground">
                  Choose a layout to run on this display
               </p>
            </div>

            {error && (
               <Alert className="mb-6 border-destructive/50">
                  <AlertDescription className="text-destructive">
                     {error}
                  </AlertDescription>
               </Alert>
            )}

            {/* Step 1: Layout Selection */}
            {step === 'select' && (
               <div className="space-y-6">
                  {/* Filters */}
                  <div className="flex flex-col sm:flex-row gap-4">
                     <div className="flex-1">
                        <Input
                           placeholder="Search layouts..."
                           value={searchTerm}
                           onChange={(e) => setSearchTerm(e.target.value)}
                        />
                     </div>
                     <Select value={orientationFilter} onValueChange={(value: string) => setOrientationFilter(value as any)}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                           <SelectValue placeholder="Filter by orientation" />
                        </SelectTrigger>
                        <SelectContent>
                           <SelectItem value="all">All Orientations</SelectItem>
                           <SelectItem value="landscape">Landscape</SelectItem>
                           <SelectItem value="portrait">Portrait</SelectItem>
                        </SelectContent>
                     </Select>
                  </div>

                  {/* Layout Grid */}
                  {filteredLayouts.length === 0 ? (
                     <Card>
                        <CardContent className="pt-6">
                           <div className="text-center text-muted-foreground">
                              {searchTerm || orientationFilter !== 'all'
                                 ? 'No layouts match your filters'
                                 : 'No layouts available'
                              }
                           </div>
                        </CardContent>
                     </Card>
                  ) : (
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredLayouts.map((layout) => (
                           <Card
                              key={layout._id}
                              className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1"
                              onClick={() => handleLayoutSelect(layout)}
                           >
                              <CardHeader className="pb-3">
                                 <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg">{layout.name}</CardTitle>
                                    <Badge variant={layout.orientation === 'landscape' ? 'default' : 'secondary'}>
                                       {layout.orientation}
                                    </Badge>
                                 </div>
                                 {layout.description && (
                                    <CardDescription>{layout.description}</CardDescription>
                                 )}
                              </CardHeader>
                              <CardContent className="space-y-3">
                                 <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Settings className="h-4 w-4" />
                                    <span>{layout.widgets.length} widgets</span>
                                    <span>•</span>
                                    <span>{layout.layoutType}</span>
                                 </div>
                                 <Button className="w-full" size="sm">
                                    <Play className="h-4 w-4 mr-2" />
                                    Select Layout
                                 </Button>
                              </CardContent>
                           </Card>
                        ))}
                     </div>
                  )}
               </div>
            )}

            {/* Step 2: Display Configuration */}
            {step === 'configure' && selectedLayout && (
               <div className="max-w-2xl mx-auto space-y-6">
                  <div className="text-center">
                     <h2 className="text-2xl font-bold mb-2">Configure Display</h2>
                     <p className="text-muted-foreground">
                        Set up display information for <strong>{selectedLayout.name}</strong>
                     </p>
                  </div>

                  <Card>
                     <CardHeader>
                        <CardTitle>Display Information</CardTitle>
                        <CardDescription>
                           This information will help administrators identify and manage this display
                        </CardDescription>
                     </CardHeader>
                     <CardContent className="space-y-4">
                        <div>
                           <label className="text-sm font-medium mb-2 block">Display Name</label>
                           <Input
                              placeholder="e.g., Lobby Display 1"
                              value={displayInfo.displayName}
                              onChange={(e) => setDisplayInfo(prev => ({ ...prev, displayName: e.target.value }))}
                           />
                        </div>
                        <div>
                           <label className="text-sm font-medium mb-2 block">Location</label>
                           <Input
                              placeholder="e.g., Main Lobby, Conference Room A"
                              value={displayInfo.location}
                              onChange={(e) => setDisplayInfo(prev => ({ ...prev, location: e.target.value }))}
                           />
                        </div>
                        <div>
                           <label className="text-sm font-medium mb-2 block">Building</label>
                           <Input
                              placeholder="e.g., Main Building, Tower A"
                              value={displayInfo.building}
                              onChange={(e) => setDisplayInfo(prev => ({ ...prev, building: e.target.value }))}
                           />
                        </div>
                     </CardContent>
                  </Card>

                  <div className="flex gap-4">
                     <Button variant="outline" onClick={handleBack} className="flex-1">
                        Back
                     </Button>
                     <Button
                        onClick={handleRunLayout}
                        disabled={registering}
                        className="flex-1"
                     >
                        {registering ? (
                           <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Starting...
                           </>
                        ) : (
                           <>
                              <Play className="h-4 w-4 mr-2" />
                              Run Layout
                           </>
                        )}
                     </Button>
                  </div>
               </div>
            )}

            {/* Step 3: Running */}
            {step === 'running' && selectedLayout && (
               <div className="max-w-md mx-auto text-center space-y-6">
                  <div className="space-y-4">
                     <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                        <Wifi className="h-8 w-8 text-green-600" />
                     </div>
                     <h2 className="text-2xl font-bold text-green-600">Display Online!</h2>
                     <p className="text-muted-foreground">
                        Your display has been registered and is now running <strong>{selectedLayout.name}</strong>
                     </p>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                     <div className="flex justify-between">
                        <span className="text-muted-foreground">Display Name:</span>
                        <span className="font-medium">{displayInfo.displayName || 'Auto-generated'}</span>
                     </div>
                     <div className="flex justify-between">
                        <span className="text-muted-foreground">Location:</span>
                        <span className="font-medium">{displayInfo.location || 'Unknown'}</span>
                     </div>
                     <div className="flex justify-between">
                        <span className="text-muted-foreground">Building:</span>
                        <span className="font-medium">{displayInfo.building || 'Main Building'}</span>
                     </div>
                  </div>

                  <p className="text-sm text-muted-foreground">
                     Redirecting to display view...
                  </p>
               </div>
            )}
         </div>
      </div>
   )
}