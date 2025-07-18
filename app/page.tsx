'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Tv, Layout, Users, Zap, Shield, Palette } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import DropdownButton from '../components/DropdownButton'
import { getDisplays } from '../actions/display'
import Spinner from '@/components/ui/spinner'

// Simplified display data for the dropdown
interface IDisplaySummary {
  _id: string;
  name: string;
}

function HomePage() {
  const [displays, setDisplays] = useState<IDisplaySummary[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

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
          setLoading(false)
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
        setLoading(false)
      }
    }

    fetchDisplays()
  }, [])

  // Limit to first 10 displays for performance
  const dropdownChoices = useMemo(() =>
    Array.isArray(displays)
      ? displays.slice(0, 10).map(display => ({
          key: display._id,
          name: display.name,
        }))
      : []
  , [displays])

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

  // Memoize DropdownButton for performance
  const MemoDropdownButton = useMemo(() => React.memo(DropdownButton), [])

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

            <Button asChild variant='outline' size='lg' className='text-lg px-8 py-6'>
              <Link href='/display-selector'>
                <Tv className='mr-2 h-5 w-5' />
                Setup Display
              </Link>
            </Button>

            {loading ? (
              <div className='flex items-center gap-4'>
                <Spinner />
                <span className='text-sm text-muted-foreground'>Loading displays...</span>
              </div>
            ) : (
              displays.length > 0 && (
                <div className='flex items-center gap-4'>
                  <span className='text-sm text-muted-foreground'>or view a display:</span>
                  <MemoDropdownButton
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
              )
            )}
          </div>
        </div>

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

HomePage.auth = false

export default HomePage