'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Tv, Layout, Users, Zap, Shield, Palette, Monitor, Settings } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import DropdownButton from '../components/DropdownButton'
import DisplaySelector from '../components/DisplaySelector/DisplaySelector'
import LayoutAssignment from '../components/DisplaySelector/LayoutAssignment'
import { getDisplays } from '../actions/display'
import { useDisplaySelector } from '../hooks/useDisplaySelector'

// Simplified display data for the dropdown
interface IDisplaySummary {
  _id: string;
  name: string;
}

export default function HomePage() {
  const [displays, setDisplays] = useState<IDisplaySummary[]>([])
  const [showDisplaySelector, setShowDisplaySelector] = useState(false)
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | null
    message: string
  }>({ type: null, message: '' })
  const router = useRouter()

  // Use the display selector hook for the new functionality
  const {
    selectedDisplay,
    handleDisplaySelect,
  } = useDisplaySelector()

  useEffect(() => {
    async function fetchDisplays() {
      try {
        const host = process.env.NODE_ENV === 'development'
          ? 'http://localhost:3000'
          : 'https://your-domain.com' // Update this with your production domain

        const fullDisplayList = await getDisplays(host)

        // Ensure fullDisplayList is an array before calling map
        if (!Array.isArray(fullDisplayList)) {
          console.error('getDisplays() did not return an array:', fullDisplayList)
          setDisplays([])
          return
        }

        const displaySummaries = fullDisplayList.map(display => ({
          _id: display._id,
          name: display.name,
        }))

        setDisplays(displaySummaries)
      } catch (error) {
        console.error('Failed to fetch displays:', error)
        setDisplays([])
      } finally {
        // Loading complete
      }
    }

    fetchDisplays()
  }, [])

  // Ensure displays is an array before calling map
  const dropdownChoices = Array.isArray(displays) ? displays.map(display => ({
    key: display._id,
    name: display.name,
  })) : []

  const navigateToDisplay = (id: string) => {
    router.push('/display/' + id)
  }

  const features = [
    {
      icon: Tv,
      title: "Multi-Display Management",
      description: "Manage multiple digital displays from a single, intuitive dashboard with real-time monitoring."
    },
    {
      icon: Layout,
      title: "Flexible Layouts",
      description: "Create custom layouts with drag-and-drop widgets. Support for both portrait and landscape orientations."
    },
    {
      icon: Zap,
      title: "Real-time Updates",
      description: "Push content updates instantly to all connected displays with our real-time synchronization system."
    },
    {
      icon: Shield,
      title: "Secure & Reliable",
      description: "Enterprise-grade security with user authentication and role-based access control."
    },
    {
      icon: Palette,
      title: "Rich Content Types",
      description: "Support for announcements, slideshows, weather, web content, and custom widgets."
    },
    {
      icon: Users,
      title: "User Management",
      description: "Comprehensive user management system with different permission levels and access controls."
    }
  ]

  return (
    <div className='min-h-screen bg-gradient-to-br from-background via-background to-muted/20'>
      {/* Hero Section */}
      <div className='container mx-auto px-4 py-16 sm:py-24'>
        <div className='text-center space-y-8'>
          <div className='space-y-4'>
            <Badge variant='secondary' className='px-4 py-2'>
              <Zap className='w-4 h-4 mr-2' />
              Digital Signage Platform
            </Badge>
            <h1 className='text-4xl sm:text-6xl font-bold tracking-tight'>
              Build your Digital
              <span className='text-primary block'>Signage Network</span>
            </h1>
            <p className='text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed'>
              A powerful, user-friendly platform for managing dynamic digital displays.
              Create stunning layouts, manage content, and monitor your displays in real-time.
            </p>
          </div>

          <div className='flex flex-col sm:flex-row gap-4 justify-center items-center'>
            <Button asChild size='lg' className='text-lg px-8 py-6'>
              <Link href='/screens'>
                Get Started
                <ArrowRight className='ml-2 h-5 w-5' />
              </Link>
            </Button>

            <Button
              variant='outline'
              size='lg'
              onClick={() => setShowDisplaySelector(!showDisplaySelector)}
              className='text-lg px-8 py-6'
            >
              <Monitor className='mr-2 h-5 w-5' />
              {showDisplaySelector ? 'Hide' : 'Show'} Display Manager
            </Button>

            {displays.length > 0 && (
              <div className='flex items-center gap-4'>
                <span className='text-sm text-muted-foreground'>or view a display:</span>
                <DropdownButton
                  text='Select Display'
                  onSelect={navigateToDisplay}
                  choices={dropdownChoices}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: '1px solid hsl(var(--border))',
                    background: 'hsl(var(--background))',
                    fontSize: '16px'
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Display Selector Section */}
        {showDisplaySelector && (
          <div className='mt-16'>
            <Card className='border-0 shadow-xl'>
              <CardHeader className='text-center pb-6'>
                <CardTitle className='text-2xl flex items-center justify-center gap-2'>
                  <Settings className='h-6 w-6' />
                  Display Configuration Center
                </CardTitle>
                <CardDescription className='text-lg'>
                  Select displays and assign layouts directly from here. Perfect for quick configuration and management.
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
        )}

        {/* Features Grid */}
        <div className='mt-24'>
          <div className='text-center mb-16'>
            <h2 className='text-3xl font-bold mb-4'>Everything you need for digital signage</h2>
            <p className='text-lg text-muted-foreground max-w-2xl mx-auto'>
              Powerful features designed to make digital signage management simple and effective.
            </p>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
            {features.map((feature, index) => (
              <Card key={index} className='border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1'>
                <CardHeader className='pb-4'>
                  <div className='w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4'>
                    <feature.icon className='w-6 h-6 text-primary' />
                  </div>
                  <CardTitle className='text-xl'>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className='text-base leading-relaxed'>
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className='mt-24 text-center'>
          <Card className='border-0 bg-primary/5 shadow-lg'>
            <CardContent className='py-16'>
              <div className='space-y-6'>
                <h3 className='text-3xl font-bold'>Ready to get started?</h3>
                <p className='text-lg text-muted-foreground max-w-2xl mx-auto'>
                  Join organizations worldwide who trust our platform for their digital signage needs.
                </p>
                <div className='flex flex-col sm:flex-row gap-4 justify-center'>
                  <Button asChild size='lg' className='text-lg px-8 py-6'>
                    <Link href='/screens'>
                      <Tv className='mr-2 h-5 w-5' />
                      Manage Displays
                    </Link>
                  </Button>
                  <Button asChild variant='outline' size='lg' className='text-lg px-8 py-6'>
                    <Link href='/layouts'>
                      <Layout className='mr-2 h-5 w-5' />
                      Create Layouts
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}