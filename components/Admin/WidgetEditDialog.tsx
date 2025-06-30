import React, { Component, ComponentType } from "react";
import Dialog, { DialogMethods } from "../Dialog";
import { Form, Button } from "../Form";
import { getWidget, updateWidget, IWidgetData } from "../../actions/widgets"; // Removed unused IUpdateWidgetData
import { updateWidgetPositions } from "../../actions/layouts";

// GridStack types
interface GridStackNode {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface GridStackEngine {
  nodes: GridStackNode[];
}

interface GridStack {
  engine: GridStackEngine;
}

interface GridStackElement extends Element {
  gridstack?: GridStack;
}
import * as z from "zod";
import { WidgetDataZod, WidgetTypeZod } from "@/lib/models/Widget"; // Import Zod schema for widget's 'data' field and type
import { Loader2, AlertCircle } from "lucide-react";

// Widget data cache to avoid repeated API calls
const widgetDataCache = new Map<string, { data: IWidgetData; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Helper function to get cached widget data
const getCachedWidgetData = (widgetId: string): IWidgetData | null => {
  const cached = widgetDataCache.get(widgetId);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  if (cached) {
    widgetDataCache.delete(widgetId); // Remove expired cache
  }
  return null;
};

// Helper function to cache widget data
const setCachedWidgetData = (widgetId: string, data: IWidgetData): void => {
  widgetDataCache.set(widgetId, { data, timestamp: Date.now() });
};

// Interface for methods exposed via ref - Zod not directly applicable
export interface IWidgetEditDialog {
  open: (e?: React.MouseEvent) => void;
  close: (e?: React.MouseEvent) => Promise<void>;
}

/*
 * Zod schema for props of the generic OptionsComponent
 * TData is effectively Record<string, any> based on original usage
 */
export const WidgetOptionsEditorPropsSchema = z.object({
  data: z.record(z.string(), z.unknown()).optional(),
  onChange: z.function().args(z.record(z.string(), z.unknown())).returns(z.void()),
});
export type IWidgetOptionsEditorProps = z.infer<
  typeof WidgetOptionsEditorPropsSchema
>;

// Zod schema for WidgetEditDialog props
export const WidgetEditDialogPropsSchema = z.object({
  widgetId: z.string(),
  widgetType: WidgetTypeZod.optional(), // Use WidgetTypeZod if type consistency is desired
  OptionsComponent: z
    .custom<ComponentType<IWidgetOptionsEditorProps>>()
    .optional(),
});
export type IWidgetEditDialogProps = z.infer<
  typeof WidgetEditDialogPropsSchema
>;

// Local Zod schema for the expected structure of IWidgetData (full widget)
const LocalFullWidgetDataSchema = z.object({
  _id: z.string(),
  name: z.string().optional(),
  type: WidgetTypeZod.optional(),
  data: WidgetDataZod.optional(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
});
// Removed unused LocalFullWidgetDataType - no references found in codebase

// Zod schema for WidgetEditDialog state
const WidgetEditDialogStateSchema = z.object({
  /*
   * widgetConfigData should ideally conform to a part of WidgetDataZod based on widgetType
   * For flexibility with generic OptionsComponent, using record(string, any)
   */
  widgetConfigData: z.record(z.string(), z.unknown()).optional(),
  initialWidgetData: LocalFullWidgetDataSchema.nullable().optional(),
  error: z.string().nullable().optional(),
});
type IWidgetEditDialogState = z.infer<typeof WidgetEditDialogStateSchema>;

class WidgetEditDialog
  extends Component<IWidgetEditDialogProps, IWidgetEditDialogState>
  implements IWidgetEditDialog
{
  private dialogRef = React.createRef<DialogMethods>(); // Ref to Dialog.tsx component instance

  constructor(props: IWidgetEditDialogProps) {
    super(props);
    this.state = {
      widgetConfigData: undefined,
      initialWidgetData: undefined,
      error: null,
    };
  }

  // This method is called by EditableWidget via ref to open the dialog
  public open = (e?: React.MouseEvent): void => {
    if (e) e.stopPropagation();
    this.fetchWidgetData(); // Fetch/refresh data when opening
    this.dialogRef.current?.open();
  };

  // This method can be called by parent or by buttons inside
  public close = async (e?: React.MouseEvent): Promise<void> => {
    if (e) e.stopPropagation();
    this.dialogRef.current?.close();
    /*
     * const { refresh } = this.props;
     * if (refresh) refresh(); // Call refresh if provided
     */
    return Promise.resolve();
  };

  fetchWidgetData = (): void => {
    const { widgetId } = this.props;

    if (!widgetId) {
      this.setState({
        error: "Widget ID is missing.",
        widgetConfigData: undefined,
        initialWidgetData: null,
      });
      return;
    }

    // More flexible widget ID validation - accept both string and ObjectId formats
    const trimmedId = widgetId.toString().trim();
    if (!trimmedId || (trimmedId.length !== 24 && !/^[0-9a-fA-F]{24}$/.test(trimmedId))) {
      console.warn(`Widget ID format may be non-standard: ${widgetId}, attempting to fetch anyway...`);
      // Don't return here - try to fetch the widget anyway as the server might handle it
    }

    // Check cache first
    const cachedData = getCachedWidgetData(widgetId);
    if (cachedData) {
      console.log(`Using cached widget data for ${widgetId}`);
      const parsedFullData = LocalFullWidgetDataSchema.safeParse(cachedData);
      if (parsedFullData.success) {
        this.setState({
          widgetConfigData:
            typeof parsedFullData.data.data === "object"
              ? parsedFullData.data.data
              : {},
          initialWidgetData: parsedFullData.data,
          error: null,
        });
        return;
      }
    }

    this.setState({
      error: null,
      widgetConfigData: undefined,
      initialWidgetData: undefined,
    });

    getWidget(trimmedId)
      .then((widgetFullData: IWidgetData) => {
        console.log('Fetched raw widget data:', widgetFullData);
        console.log('Widget data field:', widgetFullData.data);
        
        // Cache the successful response
        setCachedWidgetData(widgetId, widgetFullData);

        // Create default data structure based on widget type
        let defaultData = {};
        if (widgetFullData.type === 'image') {
          defaultData = {
            title: null,
            url: null,
            fit: 'contain',
            color: '#2d3436',
            altText: ''
          };
        }

        // Merge default data with widget data
        const mergedData = {
          ...defaultData,
          ...(widgetFullData.data || {})
        };

        console.log('Merged widget data:', mergedData);
        
        const parsedFullData =
          LocalFullWidgetDataSchema.safeParse(widgetFullData);
        
        if (parsedFullData.success) {
          this.setState({
            widgetConfigData: mergedData,
            initialWidgetData: parsedFullData.data,
            error: null,
          });
        } else {
          console.error(
            `Fetched widget data for ${widgetId} does not match schema:`,
            parsedFullData.error,
          );
          this.setState({
            error: "Fetched widget configuration is invalid.",
            initialWidgetData: null,
          });
        }
      })
      .catch((error) => {
        console.error(`Failed to fetch widget data for ${widgetId}:`, error);

        // Provide more specific error messages based on error type
        let errorMessage = "Failed to load widget configuration.";

        if (error.response) {
          // Server responded with error status
          const status = error.response.status;
          if (status === 404) {
            errorMessage = "Widget not found. This widget may have been deleted, moved, or you may not have permission to access it. You can delete this widget from the layout to remove this error.";
          } else if (status === 403) {
            errorMessage = "You don't have permission to access this widget.";
          } else if (status >= 500) {
            errorMessage = "Server error occurred while loading widget configuration.";
          }
        } else if (error.request) {
          // Network error
          errorMessage = "Network error occurred while loading widget configuration. Please check your connection.";
        } else {
          // Other error
          errorMessage = `Unexpected error: ${error.message || 'Unknown error occurred'}`;
        }

        if (error.message?.includes('404') || error.message?.includes('not found')) {
          errorMessage = "Widget not found. This widget may have been deleted or you may not have permission to access it.";
        } else if (error.message?.includes('401') || error.message?.includes('unauthorized')) {
          errorMessage = "You don't have permission to access this widget.";
        } else if (error.message?.includes('403') || error.message?.includes('forbidden')) {
          errorMessage = "Access denied. You don't have permission to view this widget.";
        } else if (error.message?.includes('500')) {
          errorMessage = "Server error occurred while loading widget configuration. Please try again.";
        } else if (error.message?.includes('Network Error') || error.message?.includes('fetch')) {
          errorMessage = "Network error. Please check your connection and try again.";
        } else if (error.message) {
          errorMessage = `Error: ${error.message}`;
        }

        this.setState({
          error: errorMessage,
          initialWidgetData: null,
        });
      });
  };

  /*
   * This handleChange is for the widget-specific OptionsComponent
   * It expects the OptionsComponent to call it with the complete, new data object
   */
  handleOptionsChange = (newConfigData: Record<string, unknown>): void => {
    // newConfigData is generic object
    this.setState((_prevState) => { // prevState parameter required by setState API but unused
      /*
       * We could try to parse newConfigData against the specific part of WidgetDataZod
       * if props.widgetType is known, to ensure type safety before setting state.
       * For now, direct update as OptionsComponent is generic.
       */
      return { widgetConfigData: newConfigData };
    });
  };

  handleSave = async (): Promise<void> => {
    const { widgetId } = this.props;
    const { widgetConfigData } = this.state;

    if (!widgetId) {
      console.error("Cannot save, widgetId is missing.");
      return;
    }

    try {
      // Only update the widget's data field, not its position
      await updateWidget(widgetId, {
        data: widgetConfigData || {}
      });

      // Get GridStack instance and trigger a layout update
      // This ensures grid positions are synchronized after saving
      const gridStackEl = document.querySelector('.grid-stack') as GridStackElement;
      const gridStack = gridStackEl?.gridstack;
      if (gridStack) {
        const items = gridStack.engine.nodes.map((node: GridStackNode) => ({
          widget_id: node.id,
          x: node.x,
          y: node.y,
          w: node.w,
          h: node.h
        }));
        
        // Get layout ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        const layoutId = urlParams.get('id');
        if (layoutId) {
          await updateWidgetPositions(layoutId, items);
        }
      }

      // Invalidate cache for this widget
      widgetDataCache.delete(widgetId);

      this.close(); // Close the dialog on successful save
    } catch (error) {
      console.error("Failed to save widget data:", error);
      // Optionally set an error state to inform user
      this.setState({ error: "Failed to save widget configuration." });
    }
  };

  /*
   * componentDidMount() {
   *   // Data fetching is now typically done when 'open' is called to ensure fresh data.
   *   // If dialog is controlled and opened by prop, then fetch here or in componentDidUpdate.
   *   // this.fetchWidgetData(); // Original logic: fetch on mount.
   * }
   */

  render() {
    /*
     * Default to a simple Form if no OptionsComponent is provided, though this might not be very useful.
     * Usually, OptionsComponent should always be provided for meaningful editing.
     */
    const {
      OptionsComponent = Form as unknown as ComponentType<IWidgetOptionsEditorProps>,
    } = this.props;
    const { widgetConfigData, error, initialWidgetData } = this.state;

    const isLoading = initialWidgetData === undefined && !error; // Still loading initial data

    // Get widget type name for dialog title
    const { widgetType } = this.props;
    const dialogTitle = widgetType
      ? `Configure ${widgetType.charAt(0).toUpperCase() + widgetType.slice(1).replace(/-/g, ' ')} Widget`
      : 'Configure Widget';

    return (
      <Dialog
        ref={this.dialogRef}
        title={dialogTitle}
        description="Configure widget settings and properties"
        className='widget-settings-modal'
      >
        <div className='flex flex-col h-full max-h-[calc(90vh-8rem)]'>
          {/* Error Display - Fixed at top */}
          {error && (
            <div className='flex-shrink-0 mb-4'>
              <div className='flex items-start gap-4 p-4 text-red-800 bg-red-50 border border-red-200 rounded-lg'>
                <AlertCircle className='w-5 h-5 flex-shrink-0 mt-0.5' />
                <div className='flex-1'>
                  <h4 className='font-medium'>Configuration Error</h4>
                  <p className='text-sm mt-1'>{error}</p>
                  {error.includes('Widget not found') && (
                    <div className='mt-3 text-sm'>
                      <p className='font-medium'>Suggested actions:</p>
                      <ul className='list-disc list-inside mt-1 space-y-1'>
                        <li>Close this dialog and delete the widget from the layout</li>
                        <li>Check if the widget was moved to a different layout</li>
                        <li>Contact your administrator if this persists</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Scrollable Content Area */}
          <div className='flex-1 overflow-y-auto min-h-0 pr-2 -mr-2'>
            <div className='widget-settings-body pb-6'>
              {isLoading ? (
                <div className='flex items-center justify-center py-12'>
                  <div className='flex items-center gap-3 text-gray-600'>
                    <Loader2 className='w-6 h-6 animate-spin' />
                    <div className='flex flex-col'>
                      <span className='text-lg'>Loading widget configuration...</span>
                      <span className='text-sm text-gray-500 mt-1'>This should only take a moment</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className='space-y-6'>
                  <OptionsComponent
                    data={widgetConfigData || {}}
                    onChange={this.handleOptionsChange}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Fixed Footer */}
          <div className='flex-shrink-0 mt-4 pt-4 border-t border-gray-200 bg-white'>
            <div className='flex gap-3 justify-end w-full'>
              <Button
                text='Cancel'
                color='#6b7280'
                onClick={this.close}
                className='px-6 py-2 text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors shadow-sm'
              />
              <Button
                text={isLoading ? "Saving..." : "Save Changes"}
                color='#10b981'
                onClick={this.handleSave}
                disabled={isLoading || !!error}
                className='px-6 py-2 text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors shadow-sm'
              />
            </div>
          </div>
        </div>
      </Dialog>
    );
  }
}

export default WidgetEditDialog;
