'use client'

import React, { useState } from 'react'
import { Layout, Check, X, Loader2, AlertCircle, Monitor } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { useActiveLayoutTemplates } from '@/hooks/useLayouts'
import { IDisplayWithLayout } from '@/hooks/useDisplaysWithLayouts'

interface LayoutAssignmentProps {
  selectedDisplay?: IDisplayWithLayout
  onAssignmentComplete?: (success: boolean, message?: string) => void
  className?: string
}

const LayoutAssignment: React.FC<LayoutAssignmentProps> = ({
  selectedDisplay,
  onAssignmentComplete,
  className,
}) => {
  const [selectedLayoutId, setSelectedLayoutId] = useState<string>('')
  const [isAssigning, setIsAssigning] = useState(false)
  const [assignmentStatus, setAssignmentStatus] = useState<{
    type: 'success' | 'error' | null
    message: string
  }>({ type: null, message: '' })

  const { data: layoutsData, isLoading: layoutsLoading, error: layoutsError } = useActiveLayoutTemplates()

  const layouts = layoutsData?.layouts || []

  const handleAssignLayout = async () => {
    if (!selectedDisplay || !selectedLayoutId) return

    setIsAssigning(true)
    setAssignmentStatus({ type: null, message: '' })

    try {
      const response = await fetch(`/api/v1/displays/${selectedDisplay._id}/change-layout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          layoutId: selectedLayoutId,
          immediate: true,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to assign layout')
      }

      const result = await response.json()
      
      setAssignmentStatus({
        type: 'success',
        message: `Layout successfully assigned to ${selectedDisplay.name}. The display will update shortly.`,
      })

      onAssignmentComplete?.(true, 'Layout assigned successfully')

      // Clear selection after successful assignment
      setTimeout(() => {
        setSelectedLayoutId('')
        setAssignmentStatus({ type: null, message: '' })
      }, 3000)

    } catch (error: any) {
      console.error('Layout assignment error:', error)
      
      setAssignmentStatus({
        type: 'error',
        message: error.message || 'Failed to assign layout. Please try again.',
      })

      onAssignmentComplete?.(false, error.message)
    } finally {
      setIsAssigning(false)
    }
  }

  const selectedLayout = layouts.find(layout => layout._id === selectedLayoutId)
  const isCurrentLayout = selectedDisplay?.layout === selectedLayoutId

  if (!selectedDisplay) {
    return (
      <Card className={cn('', className)}>
        <CardContent className='pt-6'>
          <div className='text-center text-muted-foreground'>
            <Monitor className='h-12 w-12 mx-auto mb-4 opacity-50' />
            <p>Select a display to assign a layout</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <Layout className='h-5 w-5' />
          Assign Layout to {selectedDisplay.name}
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        {/* Current display info */}
        <div className='p-3 bg-muted rounded-lg'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='font-medium'>{selectedDisplay.name}</p>
              <p className='text-sm text-muted-foreground'>
                Current: {selectedDisplay.layoutName || 'No Layout'}
              </p>
            </div>
            <Badge variant={selectedDisplay.isOnline ? 'default' : 'secondary'}>
              {selectedDisplay.isOnline ? 'Online' : 'Offline'}
            </Badge>
          </div>
        </div>

        {/* Layout selection */}
        <div className='space-y-2'>
          <label className='text-sm font-medium'>Select New Layout</label>
          {layoutsLoading ? (
            <div className='flex items-center gap-2 p-3 border rounded-md'>
              <Loader2 className='h-4 w-4 animate-spin' />
              <span className='text-sm text-muted-foreground'>Loading layouts...</span>
            </div>
          ) : layoutsError ? (
            <Alert variant='destructive'>
              <AlertCircle className='h-4 w-4' />
              <AlertDescription>
                Failed to load layouts. Please refresh the page.
              </AlertDescription>
            </Alert>
          ) : (
            <Select value={selectedLayoutId} onValueChange={setSelectedLayoutId}>
              <SelectTrigger>
                <SelectValue placeholder='Choose a layout...' />
              </SelectTrigger>
              <SelectContent>
                {layouts.map((layout) => (
                  <SelectItem key={layout._id} value={layout._id}>
                    <div className='flex items-center justify-between w-full'>
                      <span>{layout.name}</span>
                      {selectedDisplay.layout === layout._id && (
                        <Badge variant='outline' className='ml-2'>Current</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Selected layout preview */}
        {selectedLayout && (
          <div className='p-3 border rounded-lg'>
            <div className='flex items-center justify-between mb-2'>
              <h4 className='font-medium'>{selectedLayout.name}</h4>
              <Badge variant='outline'>{selectedLayout.orientation}</Badge>
            </div>
            {selectedLayout.description && (
              <p className='text-sm text-muted-foreground'>{selectedLayout.description}</p>
            )}
            {isCurrentLayout && (
              <div className='mt-2'>
                <Badge variant='secondary'>
                  <Check className='h-3 w-3 mr-1' />
                  Currently Active
                </Badge>
              </div>
            )}
          </div>
        )}

        {/* Assignment status */}
        {assignmentStatus.type && (
          <Alert variant={assignmentStatus.type === 'error' ? 'destructive' : 'default'}>
            {assignmentStatus.type === 'success' ? (
              <Check className='h-4 w-4' />
            ) : (
              <AlertCircle className='h-4 w-4' />
            )}
            <AlertDescription>{assignmentStatus.message}</AlertDescription>
          </Alert>
        )}

        {/* Action buttons */}
        <div className='flex gap-2 pt-2'>
          <Button
            onClick={handleAssignLayout}
            disabled={!selectedLayoutId || isAssigning || isCurrentLayout || !selectedDisplay.isOnline}
            className='flex-1'
          >
            {isAssigning ? (
              <>
                <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                Assigning...
              </>
            ) : (
              <>
                <Check className='h-4 w-4 mr-2' />
                Assign Layout
              </>
            )}
          </Button>
          
          {selectedLayoutId && (
            <Button
              variant='outline'
              onClick={() => {
                setSelectedLayoutId('')
                setAssignmentStatus({ type: null, message: '' })
              }}
              disabled={isAssigning}
            >
              <X className='h-4 w-4' />
            </Button>
          )}
        </div>

        {/* Warnings */}
        {!selectedDisplay.isOnline && (
          <Alert>
            <AlertCircle className='h-4 w-4' />
            <AlertDescription>
              This display is offline. Layout changes will be applied when it comes back online.
            </AlertDescription>
          </Alert>
        )}

        {isCurrentLayout && selectedLayoutId && (
          <Alert>
            <AlertCircle className='h-4 w-4' />
            <AlertDescription>
              This layout is already assigned to the selected display.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

export default LayoutAssignment
