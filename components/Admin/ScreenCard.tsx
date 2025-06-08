import React, { useState } from 'react'
import {
  Layout,
  Tv,
  Eye,
  ExternalLink,
  Edit,
  Trash2,
  Cast
} from 'lucide-react'
import Link from 'next/link'
import * as z from 'zod'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import OrientationPreview from './OrientationPreview'
import DisplayEditDialog from './DisplayEditDialog'

/*
 * Assuming IDisplayData is an interface. We'll define a Zod schema for the 'value' prop
 * that matches the expected structure of IDisplayData used in this component.
 * For a more robust solution, actions/display.ts should export a DisplayActionDataSchema.
 * For now, we define what ScreenCard expects from IDisplayData.
 */
const ScreenCardValueSchema = z.object({
  _id: z.string(),
  name: z.string().optional(), // Based on usage: value.name || 'Untitled Display'
  orientation: z.enum(['landscape', 'portrait']).optional(), // Display orientation
  widgets: z.array(z.union([z.string(), z.object({})])).optional(), // Based on usage: Array.isArray(value.widgets)
  clientCount: z.number(), // Number of clients paired to this display
  isOnline: z.boolean(), // Online status of the display
  /*
   * Add other fields from IDisplayData if they were directly used by ScreenCard and need validation.
   * For this component, only _id, name, and widgets structure seem directly accessed.
   */
})

// Import the original IDisplayData to ensure compatibility or use if it becomes a Zod type later.
import { useDisplayMutations } from '../../hooks/useDisplayMutations'

// Zod schema for ScreenCard props
export const ScreenCardPropsSchema = z.object({
  value: ScreenCardValueSchema, // Use the locally defined Zod schema for the 'value' prop
  refresh: z.function(z.tuple([]), z.void()).optional(),
})

// Derive TypeScript type from Zod schema
export type IScreenCardProps = z.infer<typeof ScreenCardPropsSchema>;
const ScreenCard: React.FC<IScreenCardProps> = ({ value, refresh = () => {} }) => {
  const { deleteDisplay, updateDisplay } = useDisplayMutations()
  const [isUpdatingOrientation, setIsUpdatingOrientation] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  const handleOrientationChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    event.preventDefault()
    event.stopPropagation()
    
    const newOrientation = event.target.value as 'landscape' | 'portrait'
    if (value && value._id && newOrientation !== value.orientation) {
      setIsUpdatingOrientation(true)
      updateDisplay.mutate(
        {
          id: value._id,
          data: { orientation: newOrientation }
        },
        {
          onSuccess: () => {
            setIsUpdatingOrientation(false)
            refresh()
          },
          onError: (error: any) => {
            console.error('Failed to update orientation:', error)
            setIsUpdatingOrientation(false)
          }
        }
      )
    }
  }

  const handleEdit = (event: React.MouseEvent): void => {
    event.preventDefault()
    event.stopPropagation()
    setIsEditDialogOpen(true)
  }

  const handleDelete = (event: React.MouseEvent): void => {
    event.preventDefault() // Prevent Link navigation when clicking delete icon
    event.stopPropagation() // Stop event from bubbling further

    if (value && value._id) {
      const confirmDelete = window.confirm(`Are you sure you want to delete "${value.name || 'Untitled Display'}"?`)
      if (!confirmDelete) return

      deleteDisplay.mutate(
        { id: value._id },
        {
          onSuccess: () => {
            // The mutation automatically updates the global cache,
            // but we still call refresh in case the parent needs to do something
            refresh()
          },
          onError: (error: any) => {
            console.error('Failed to delete display:', error)
            // Optionally, provide user feedback here
          }
        }
      )
    }
  }

  // Fallback for widgets if undefined (though IDisplayData defines it as optional IWidget[] or string[])
  const widgetCount = value && Array.isArray(value.widgets) ? value.widgets.length : 0

  return (
    <Card className="group my-6 transition-all duration-200 hover:shadow-lg cursor-pointer">
      <Link href={`/layout?display=${value?._id || ''}` className="block">
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            {/* Display Icon */}
            <div className="flex-shrink-0">
              <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                <Tv className="h-8 w-8 text-primary" />
              </div>
            </div>

            {/* Display Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-foreground truncate">
                  {value?.name || 'Untitled Display'}
                </h3>
                <Badge
                  variant={value?.isOnline ? 'success' : 'destructive'}
                  className="ml-2"
                >
                  {value?.isOnline ? 'Online' : 'Offline'}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Layout className="h-4 w-4" />
                  <span>{widgetCount} widgets</span>
                </div>
                <div className="flex items-center gap-1">
                  <Cast className="h-4 w-4" />
                  <span>
                    {value?.clientCount || 0} client{(value?.clientCount || 0) !== 1 ? 's' : ''} paired
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <OrientationPreview orientation={value?.orientation || null} />
                  <span className="text-xs">
                    {value?.orientation === 'portrait' ? 'Portrait' : 'Landscape'}
                  </span>
                </div>
              </div>
            </div>
            {/* Action Buttons */}
            <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleEdit(e as any)
                }}
                aria-label="Edit Display"
                className="h-8 w-8"
              >
                <Edit className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                asChild
                className="h-8 w-8"
              >
                <Link
                  href={`/layout?display=${value?._id || ''}`}
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Edit Layout"
                >
                  <Eye className="h-4 w-4" />
                </Link>
              </Button>

              <Button
                variant="ghost"
                size="icon"
                asChild
                className="h-8 w-8"
              >
                <Link
                  href={`/display/${value?._id || ''}`}
                  onClick={(e) => e.stopPropagation()}
                  aria-label="View Display"
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleDelete(e as any)
                }}
                aria-label="Delete Display"
                className="h-8 w-8 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

        </CardContent>
      </Link>

      {/* Edit Dialog */}
      {isEditDialogOpen && (
        <DisplayEditDialog
          display={value ? {
            _id: value._id,
            name: value.name || '',
            orientation: value.orientation,
            layout: 'spaced' // Default layout, could be enhanced to get from display data
          } : null}
          isCreateMode={false}
          onClose={() => setIsEditDialogOpen(false)}
          onSave={() => {
            setIsEditDialogOpen(false);
            refresh();
          }}
        />
      )}
    </Card>
  )
}

export default ScreenCard
