import React, { useState, useEffect } from "react";
import {
  Layout,
  Tv,
  Eye,
  ExternalLink,
  Edit,
  Trash2,
  Cast,
  Settings,
  ChevronUp,
  RefreshCw,
  Check,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/router";
import * as z from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import OrientationPreview from "./OrientationPreview";
import DisplayEditDialog from "./DisplayEditDialog";

/*
 * Assuming IDisplayData is an interface. We'll define a Zod schema for the 'value' prop
 * that matches the expected structure of IDisplayData used in this component.
 * For a more robust solution, actions/display.ts should export a DisplayActionDataSchema.
 * For now, we define what ScreenCard expects from IDisplayData.
 */
const ScreenCardValueSchema = z.object({
  _id: z.string(),
  name: z.string().optional(), // Based on usage: value.name || 'Untitled Display'
  orientation: z.enum(["landscape", "portrait"]).optional(), // Display orientation
  widgets: z.array(z.union([z.string(), z.object({})])).optional(), // Based on usage: Array.isArray(value.widgets)
  clientCount: z.number(), // Number of clients paired to this display
  isOnline: z.boolean(), // Online status of the display
  layout: z.string().optional(), // Layout ID or legacy layout string
  location: z.string().optional(), // Physical location
  building: z.string().optional(), // Building location
  /*
   * Add other fields from IDisplayData if they were directly used by ScreenCard and need validation.
   * For this component, only _id, name, and widgets structure seem directly accessed.
   */
});

// Import the original IDisplayData to ensure compatibility or use if it becomes a Zod type later.
import { useDisplayMutations } from "../../hooks/useDisplayMutations";
import { getLayouts, ILayoutData } from "@/actions/layouts";

// Zod schema for ScreenCard props
export const ScreenCardPropsSchema = z.object({
  value: ScreenCardValueSchema, // Use the locally defined Zod schema for the 'value' prop
  refresh: z.function(z.tuple([]), z.void()).optional(),
});

// Derive TypeScript type from Zod schema
export type IScreenCardProps = z.infer<typeof ScreenCardPropsSchema>;
const ScreenCard: React.FC<IScreenCardProps> = ({
  value,
  refresh = () => { },
}) => {
  const router = useRouter();
  const { deleteDisplay, updateDisplay } = useDisplayMutations();
  const [isUpdatingOrientation, setIsUpdatingOrientation] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isLayoutSectionExpanded, setIsLayoutSectionExpanded] = useState(false);

  // Layout change state
  const [selectedLayout, setSelectedLayout] = useState<string>(''); // Will be set to current layout
  const [isChangingLayout, setIsChangingLayout] = useState(false);
  const [layoutChangeStatus, setLayoutChangeStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [layoutChangeError, setLayoutChangeError] = useState<string>('');

  // Available layouts state
  const [availableLayouts, setAvailableLayouts] = useState<ILayoutData[]>([]);
  const [loadingLayouts, setLoadingLayouts] = useState(true);

  // Fetch available layouts
  useEffect(() => {
    const fetchLayouts = async () => {
      try {
        setLoadingLayouts(true);
        const response = await getLayouts({ isActive: true });
        setAvailableLayouts(response.layouts || []);
      } catch (error) {
        console.error("Failed to fetch layouts:", error);
        setAvailableLayouts([]);
      } finally {
        setLoadingLayouts(false);
      }
    };

    fetchLayouts();
  }, []);

  // Initialize selected layout when display data or layouts change
  useEffect(() => {
    if (value?.layout && !selectedLayout) {
      setSelectedLayout(value.layout);
    }
  }, [value?.layout, selectedLayout]);

  // Handler for changing display orientation - ready for future UI implementation
  const handleOrientationChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ): void => {
    event.preventDefault();
    event.stopPropagation();

    const newOrientation = event.target.value as "landscape" | "portrait";
    if (value && value._id && newOrientation !== value.orientation) {
      setIsUpdatingOrientation(true);
      updateDisplay.mutate(
        {
          id: value._id,
          data: { orientation: newOrientation },
        },
        {
          onSuccess: () => {
            setIsUpdatingOrientation(false);
            refresh();
          },
          onError: (error: Error) => {
            console.error("Failed to update orientation:", error);
            setIsUpdatingOrientation(false);
          },
        },
      );
    }
  };

  const handleEdit = (event: React.MouseEvent): void => {
    event.preventDefault();
    event.stopPropagation();
    setIsEditDialogOpen(true);
  };

  const handleLayoutSectionToggle = (event: React.MouseEvent): void => {
    event.preventDefault();
    event.stopPropagation();
    setIsLayoutSectionExpanded(!isLayoutSectionExpanded);
  };

  const handleRemoteLayoutChange = async () => {
    if (!value?._id || !selectedLayout || selectedLayout === value?.layout) {
      return;
    }

    setIsChangingLayout(true);
    setLayoutChangeStatus('idle');
    setLayoutChangeError('');

    try {
      const response = await fetch(`/api/v1/displays/${value._id}/change-layout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          layoutId: selectedLayout,
          immediate: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to change layout');
      }

      setLayoutChangeStatus('success');
      refresh(); // Refresh the display list

      // Auto-clear success status after 3 seconds
      setTimeout(() => {
        setLayoutChangeStatus('idle');
      }, 3000);

    } catch (error: unknown) {
      console.error('Error changing layout:', error);
      setLayoutChangeStatus('error');
      setLayoutChangeError(error instanceof Error ? error.message : 'Failed to change layout');
    } finally {
      setIsChangingLayout(false);
    }
  };

  const getCurrentLayoutName = () => {
    const layout = availableLayouts.find(l => l._id?.toString() === value?.layout);
    return layout?.name || (value?.layout === 'spaced' ? 'Spaced Layout' : value?.layout === 'compact' ? 'Compact Layout' : 'Unknown Layout');
  };

  const getSelectedLayoutName = () => {
    const layout = availableLayouts.find(l => l._id?.toString() === selectedLayout);
    return layout?.name || selectedLayout;
  };

  const hasLayoutChanges = selectedLayout !== value?.layout;

  const handleDelete = (event: React.MouseEvent): void => {
    event.preventDefault(); // Prevent Link navigation when clicking delete icon
    event.stopPropagation(); // Stop event from bubbling further

    if (value && value._id) {
      const confirmDelete = window.confirm(
        `Are you sure you want to delete "${value.name || "Untitled Display"}"?`,
      );
      if (!confirmDelete) return;

      deleteDisplay.mutate(
        { id: value._id },
        {
          onSuccess: () => {
            // The mutation automatically updates the global cache,
            // but we still call refresh in case the parent needs to do something
            refresh();
          },
          onError: (error: Error) => {
            console.error("Failed to delete display:", error);
            // Optionally, provide user feedback here
          },
        },
      );
    }
  };

  // Fallback for widgets if undefined (though IDisplayData defines it as optional IWidget[] or string[])
  const widgetCount =
    value && Array.isArray(value.widgets) ? value.widgets.length : 0;

  const handleCardClick = () => {
    // Navigate to layout page when clicking the card
    router.push(`/layouts?display=${value?._id || ""}`);
  };

  return (
    <Card className='group my-6 transition-all duration-200 hover:shadow-lg cursor-pointer' onClick={handleCardClick}>
      <CardContent className='p-6'>
        <div className='flex items-center space-x-4'>
          {/* Display Icon */}
          <div className='flex-shrink-0'>
            <div className='h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20'>
              <Tv className='h-8 w-8 text-primary' />
            </div>
          </div>

          {/* Display Info */}
          <div className='flex-1 min-w-0'>
            <div className='flex items-center justify-between mb-2'>
              <h3 className='text-lg font-semibold text-foreground truncate'>
                {value?.name || "Untitled Display"}
              </h3>
              <Badge
                variant={value?.isOnline ? "success" : "destructive"}
                className='ml-2'
              >
                {value?.isOnline ? "Online" : "Offline"}
              </Badge>
            </div>

            <div className='flex flex-wrap items-center gap-4 text-sm text-muted-foreground'>
              <div className='flex items-center gap-1'>
                <Layout className='h-4 w-4' />
                <span>{widgetCount} widgets</span>
              </div>
              <div className='flex items-center gap-1'>
                <Cast className='h-4 w-4' />
                <span>
                  {value?.clientCount || 0} client
                  {(value?.clientCount || 0) !== 1 ? "s" : ""} paired
                </span>
              </div>
              <div className='flex items-center gap-4'>
                <OrientationPreview
                  orientation={value?.orientation || null}
                />
                <div className='flex items-center gap-2'>
                  <span className='text-xs'>
                    {value?.orientation === "portrait"
                      ? "Portrait"
                      : "Landscape"}
                  </span>
                  {value?.isOnline && (
                    <select
                      value={value?.orientation || "landscape"}
                      onChange={handleOrientationChange}
                      className='text-xs border rounded px-1 py-0.5 bg-background'
                      disabled={isUpdatingOrientation}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value='landscape'>Landscape</option>
                      <option value='portrait'>Portrait</option>
                    </select>
                  )}
                  {isUpdatingOrientation && (
                    <Loader2 className='h-3 w-3 animate-spin text-muted-foreground' />
                  )}
                </div>
              </div>
            </div>
          </div>
          {/* Action Buttons */}
          <div className='flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200'>
            <Button
              variant='ghost'
              size='icon'
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleEdit(e as React.MouseEvent<HTMLButtonElement>);
              }}
              aria-label='Edit Display'
              className='h-8 w-8'
            >
              <Edit className='h-4 w-4' />
            </Button>

            {/* Layout Control Toggle Button - only show for online displays */}
            {value?.isOnline && (
              <Button
                variant='ghost'
                size='icon'
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleLayoutSectionToggle(e as React.MouseEvent<HTMLButtonElement>);
                }}
                aria-label='Toggle Layout Controls'
                className='h-8 w-8'
              >
                {isLayoutSectionExpanded ? (
                  <ChevronUp className='h-4 w-4' />
                ) : (
                  <Settings className='h-4 w-4' />
                )}
              </Button>
            )}

            <Button
              variant='ghost'
              size='icon'
              className='h-8 w-8'
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                router.push(`/layouts?display=${value?._id || ""}`);
              }}
              aria-label='Edit Layout'
            >
              <Eye className='h-4 w-4' />
            </Button>

            <Button
              variant='ghost'
              size='icon'
              className='h-8 w-8'
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.open(`/display/${value?._id || ""}`, '_blank');
              }}
              aria-label='View Display'
            >
              <ExternalLink className='h-4 w-4' />
            </Button>

            <Button
              variant='ghost'
              size='icon'
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDelete(e as React.MouseEvent<HTMLButtonElement>);
              }}
              aria-label='Delete Display'
              className='h-8 w-8 text-destructive hover:text-destructive'
            >
              <Trash2 className='h-4 w-4' />
            </Button>
          </div>
        </div>
      </CardContent>

      {/* Expanded Layout Control Section */}
      {isLayoutSectionExpanded && value?.isOnline && (
        <>
          <Separator />
          <CardContent className='pt-4'>
            <div className='space-y-4'>
              <div className='flex items-center gap-2 mb-3'>
                <Layout className='h-4 w-4 text-primary' />
                <h4 className='font-medium text-sm'>Remote Layout Control</h4>
                <Badge variant='outline' className='text-xs'>
                  Live
                </Badge>
              </div>

              {/* Current Layout Info */}
              <div className='p-3 bg-muted/30 rounded-lg'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-medium'>Current Layout</p>
                    <p className='text-xs text-muted-foreground'>{getCurrentLayoutName()}</p>
                  </div>
                  <Badge variant='outline' className='text-xs'>
                    Active
                  </Badge>
                </div>
              </div>

              {/* Orientation Control */}
              <div className='space-y-2'>
                <label className='text-sm font-medium'>Display Orientation</label>
                <Select
                  value={value?.orientation || "landscape"}
                  onValueChange={(newOrientation: "landscape" | "portrait") => {
                    const event = {
                      target: { value: newOrientation },
                      preventDefault: () => { },
                      stopPropagation: () => { }
                    } as React.ChangeEvent<HTMLSelectElement>;
                    handleOrientationChange(event);
                  }}
                  disabled={isUpdatingOrientation}
                >
                  <SelectTrigger className='h-9'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='landscape'>
                      <div className='flex items-center gap-2'>
                        <div className='w-4 h-3 border rounded bg-muted'></div>
                        <span>Landscape</span>
                      </div>
                    </SelectItem>
                    <SelectItem value='portrait'>
                      <div className='flex items-center gap-2'>
                        <div className='w-3 h-4 border rounded bg-muted'></div>
                        <span>Portrait</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {isUpdatingOrientation && (
                  <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                    <Loader2 className='h-3 w-3 animate-spin' />
                    <span>Updating orientation...</span>
                  </div>
                )}
              </div>

              {/* Layout Selection */}
              <div className='space-y-2'>
                <label className='text-sm font-medium'>Change to Layout</label>
                <Select
                  value={selectedLayout}
                  onValueChange={setSelectedLayout}
                  disabled={isChangingLayout || loadingLayouts}
                >
                  <SelectTrigger className='h-9'>
                    <SelectValue placeholder={loadingLayouts ? 'Loading layouts...' : 'Select a layout'} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableLayouts.map((layout) => (
                      <SelectItem key={layout._id?.toString() || ''} value={layout._id?.toString() || ''}>
                        <div className='flex flex-col'>
                          <span className='font-medium text-sm'>{layout.name}</span>
                          <span className='text-xs text-muted-foreground'>
                            {layout.description || `${layout.orientation} • ${layout.widgets?.length || 0} widgets`}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Messages */}
              {layoutChangeStatus === 'success' && (
                <Alert className='border-green-200 bg-green-50'>
                  <Check className='h-4 w-4 text-green-600' />
                  <AlertDescription className='text-green-800 text-sm'>
                    Layout change sent! The display will update shortly.
                  </AlertDescription>
                </Alert>
              )}

              {layoutChangeStatus === 'error' && (
                <Alert className='border-red-200 bg-red-50'>
                  <AlertTriangle className='h-4 w-4 text-red-600' />
                  <AlertDescription className='text-red-800 text-sm'>
                    {layoutChangeError}
                  </AlertDescription>
                </Alert>
              )}

              {/* Preview Info */}
              {hasLayoutChanges && (
                <div className='p-3 bg-blue-50 border border-blue-200 rounded-lg'>
                  <p className='text-sm font-medium text-blue-900'>Preview Change</p>
                  <p className='text-xs text-blue-700 mt-1'>
                    <span className='font-medium'>{getCurrentLayoutName()}</span>
                    {' → '}
                    <span className='font-medium'>{getSelectedLayoutName()}</span>
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className='flex gap-2'>
                <Button
                  onClick={handleRemoteLayoutChange}
                  disabled={!hasLayoutChanges || isChangingLayout}
                  size='sm'
                  className='flex-1'
                >
                  {isChangingLayout ? (
                    <>
                      <Loader2 className='h-3 w-3 mr-2 animate-spin' />
                      Applying...
                    </>
                  ) : (
                    <>
                      <RefreshCw className='h-3 w-3 mr-2' />
                      Apply Change
                    </>
                  )}
                </Button>

                {hasLayoutChanges && (
                  <Button
                    variant='outline'
                    onClick={() => setSelectedLayout(value?.layout || '')}
                    disabled={isChangingLayout}
                    size='sm'
                  >
                    Reset
                  </Button>
                )}
              </div>

              {/* Instructions */}
              <div className='text-xs text-muted-foreground'>
                <p><strong>Note:</strong> The display will automatically reload with the new layout.</p>
              </div>
            </div>
          </CardContent>
        </>
      )}

      {/* Edit Dialog */}
      {isEditDialogOpen && (
        <DisplayEditDialog
          display={
            value
              ? {
                _id: value._id,
                name: value.name || "",
                orientation: value.orientation,
                layout: value.layout || "", // Use actual layout from display data
                location: value.location || "",
                building: value.building || "",
              }
              : null
          }
          isCreateMode={false}
          onClose={() => setIsEditDialogOpen(false)}
          onSave={() => {
            setIsEditDialogOpen(false);
            refresh();
          }}
        />
      )}


    </Card>
  );
};

export default ScreenCard;
