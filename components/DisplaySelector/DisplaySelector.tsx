'use client'

import React, { useState } from 'react'
import { Monitor, Wifi, WifiOff, MapPin, Clock, Settings, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useDisplaysWithLayouts, IDisplayWithLayout } from '@/hooks/useDisplaysWithLayouts'

interface DisplaySelectorProps {
  onDisplaySelect?: (display: IDisplayWithLayout) => void
  selectedDisplayId?: string
  className?: string
  showLayoutInfo?: boolean
  allowMultiSelect?: boolean
}

const DisplaySelector: React.FC<DisplaySelectorProps> = ({
  onDisplaySelect,
  selectedDisplayId,
  className,
  showLayoutInfo = true,
  allowMultiSelect = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all')
  const [selectedDisplays, setSelectedDisplays] = useState<Set<string>>(new Set())

  const { data, isLoading, error, refetch } = useDisplaysWithLayouts({
    includeOffline: true,
  })

  // Filter displays based on search and status
  const filteredDisplays = React.useMemo(() => {
    if (!data?.displays) return []

    return data.displays.filter((display) => {
      const matchesSearch =
        display.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        display.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        display.building?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'online' && display.isOnline) ||
        (statusFilter === 'offline' && !display.isOnline)

      return matchesSearch && matchesStatus
    })
  }, [data?.displays, searchTerm, statusFilter])

  const handleDisplayClick = (display: IDisplayWithLayout) => {
    if (allowMultiSelect) {
      const newSelected = new Set(selectedDisplays)
      if (newSelected.has(display._id)) {
        newSelected.delete(display._id)
      } else {
        newSelected.add(display._id)
      }
      setSelectedDisplays(newSelected)
    }
    
    onDisplaySelect?.(display)
  }

  const formatLastSeen = (lastUpdate?: string) => {
    if (!lastUpdate) return 'Never'
    
    const now = new Date()
    const lastSeen = new Date(lastUpdate)
    const diffMs = now.getTime() - lastSeen.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className='flex items-center justify-center py-8'>
          <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
          <span className='ml-2 text-muted-foreground'>Loading displays...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn('space-y-4', className)}>
        <Card className='border-destructive/50'>
          <CardContent className='pt-6'>
            <div className='text-center'>
              <p className='text-destructive mb-4'>Failed to load displays</p>
              <Button onClick={() => refetch()} variant='outline' size='sm'>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with filters */}
      <div className='flex flex-col sm:flex-row gap-4'>
        <div className='flex-1'>
          <Input
            placeholder='Search displays by name, location, or building...'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className='w-full'
          />
        </div>
        <Select value={statusFilter} onValueChange={(value: string) => setStatusFilter(value as "all" | "online" | "offline")}>
          <SelectTrigger className='w-full sm:w-[180px]'>
            <SelectValue placeholder='Filter by status' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All Displays</SelectItem>
            <SelectItem value='online'>Online Only</SelectItem>
            <SelectItem value='offline'>Offline Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary stats */}
      {data?.meta && (
        <div className='flex gap-4 text-sm text-muted-foreground'>
          <span>Total: {data.meta.total}</span>
          <span className='text-green-600'>Online: {data.meta.online}</span>
          <span className='text-red-600'>Offline: {data.meta.offline}</span>
        </div>
      )}

      {/* Display grid */}
      {filteredDisplays.length === 0 ? (
        <Card>
          <CardContent className='pt-6'>
            <div className='text-center text-muted-foreground'>
              {searchTerm || statusFilter !== 'all'
                ? 'No displays match your filters'
                : 'No displays found'
              }
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {filteredDisplays.map((display) => {
            const isSelected = selectedDisplayId === display._id || selectedDisplays.has(display._id)
            
            return (
              <Card
                key={display._id}
                className={cn(
                  'cursor-pointer transition-all duration-200 hover:shadow-md',
                  isSelected && 'ring-2 ring-primary ring-offset-2',
                  !display.isOnline && 'opacity-75'
                )}
                onClick={() => handleDisplayClick(display)}
              >
                <CardHeader className='pb-3'>
                  <div className='flex items-center justify-between'>
                    <CardTitle className='text-lg flex items-center gap-2'>
                      <Monitor className='h-5 w-5' />
                      {display.name}
                    </CardTitle>
                    <Badge variant={display.isOnline ? 'default' : 'secondary'}>
                      {display.isOnline ? (
                        <><Wifi className='h-3 w-3 mr-1' />Online</>
                      ) : (
                        <><WifiOff className='h-3 w-3 mr-1' />Offline</>
                      )}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className='space-y-3'>
                  {/* Location info */}
                  {(display.location || display.building) && (
                    <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                      <MapPin className='h-4 w-4' />
                      <span>
                        {[display.building, display.location].filter(Boolean).join(' • ')}
                      </span>
                    </div>
                  )}

                  {/* Layout info */}
                  {showLayoutInfo && (
                    <div className='flex items-center gap-2 text-sm'>
                      <Settings className='h-4 w-4 text-muted-foreground' />
                      <span className='font-medium'>
                        {display.layoutName || 'No Layout'}
                      </span>
                    </div>
                  )}

                  {/* Last seen */}
                  <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                    <Clock className='h-4 w-4' />
                    <span>Last seen: {formatLastSeen(display.last_update)}</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default DisplaySelector
