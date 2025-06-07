import React, { Component, ComponentType } from 'react'
import Dialog, { DialogMethods } from '../Dialog'
import { Form, Button, ButtonGroup } from '../Form'
import { getWidget, updateWidget, IWidgetData } from '../../actions/widgets' // IWidgetData is likely an interface
import * as z from 'zod'
import { WidgetDataZod, WidgetTypeZod } from '@/lib/models/Widget' // Import Zod schema for widget's 'data' field and type

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
  data: z.record(z.string(), z.any()).optional(),
  onChange: z.function().args(z.record(z.string(), z.any())).returns(z.void()),
})
export type IWidgetOptionsEditorProps = z.infer<typeof WidgetOptionsEditorPropsSchema>;

// Zod schema for WidgetEditDialog props
export const WidgetEditDialogPropsSchema = z.object({
  widgetId: z.string(),
  widgetType: WidgetTypeZod.optional(), // Use WidgetTypeZod if type consistency is desired
  OptionsComponent: z.custom<ComponentType<IWidgetOptionsEditorProps>>().optional(),
})
export type IWidgetEditDialogProps = z.infer<typeof WidgetEditDialogPropsSchema>;

// Local Zod schema for the expected structure of IWidgetData (full widget)
const LocalFullWidgetDataSchema = z.object({
  _id: z.string(), // Assuming IWidgetData has _id
  name: z.string().optional(), // And other fields if used by the dialog
  type: WidgetTypeZod.optional(),
  data: WidgetDataZod.optional(), // This is the specific config object, matching api/models/Widget.WidgetDataZod
})
type LocalFullWidgetDataType = z.infer<typeof LocalFullWidgetDataSchema>;

// Zod schema for WidgetEditDialog state
const WidgetEditDialogStateSchema = z.object({
  /*
   * widgetConfigData should ideally conform to a part of WidgetDataZod based on widgetType
   * For flexibility with generic OptionsComponent, using record(string, any)
   */
  widgetConfigData: z.record(z.string(), z.any()).optional(),
  initialWidgetData: LocalFullWidgetDataSchema.nullable().optional(),
  error: z.string().nullable().optional(),
})
type IWidgetEditDialogState = z.infer<typeof WidgetEditDialogStateSchema>;

class WidgetEditDialog extends Component<IWidgetEditDialogProps, IWidgetEditDialogState> implements IWidgetEditDialog {
  private dialogRef = React.createRef<DialogMethods>() // Ref to Dialog.tsx component instance

  constructor(props: IWidgetEditDialogProps) {
    super(props)
    this.state = {
      widgetConfigData: undefined,
      initialWidgetData: undefined,
      error: null,
    }
  }

  // This method is called by EditableWidget via ref to open the dialog
  public open = (e?: React.MouseEvent): void => {
    if (e) e.stopPropagation()
    this.fetchWidgetData() // Fetch/refresh data when opening
    this.dialogRef.current?.open()
  }

  // This method can be called by parent or by buttons inside
  public close = async (e?: React.MouseEvent): Promise<void> => {
    if (e) e.stopPropagation()
    this.dialogRef.current?.close()
    /*
     * const { refresh } = this.props;
     * if (refresh) refresh(); // Call refresh if provided
     */
    return Promise.resolve()
  }

  fetchWidgetData = (): void => {
    const { widgetId } = this.props
    if (!widgetId) {
        this.setState({ error: 'Widget ID is missing.', widgetConfigData: undefined, initialWidgetData: null })
        return
    }
    this.setState({ error: null, widgetConfigData: undefined, initialWidgetData: undefined })

    getWidget(widgetId)
      .then((widgetFullData: IWidgetData) => { // IWidgetData is from actions, potentially an interface
        // Attempt to parse with our local Zod schema for safety before setting state
        const parsedFullData = LocalFullWidgetDataSchema.safeParse(widgetFullData)
        if (parsedFullData.success) {
            this.setState({
                /*
                 * widgetConfigData should be the 'data' field of the widget.
                 * It could be a specific type from WidgetDataZod union.
                 * For generic OptionsComponent, we pass it as is if it's an object.
                 */
                widgetConfigData: typeof parsedFullData.data.data === 'object' ? parsedFullData.data.data : {},
                initialWidgetData: parsedFullData.data,
            })
        } else {
            console.error(`Fetched widget data for ${widgetId} does not match schema:`, parsedFullData.error)
            this.setState({ error: 'Fetched widget configuration is invalid.', initialWidgetData: null })
        }
      })
      .catch(error => {
        console.error(`Failed to fetch widget data for ${widgetId}:`, error)
        this.setState({ error: 'Failed to load widget configuration.', initialWidgetData: null })
      })
  }

  /*
   * This handleChange is for the widget-specific OptionsComponent
   * It expects the OptionsComponent to call it with the complete, new data object
   */
  handleOptionsChange = (newConfigData: Record<string, any>): void => { // newConfigData is generic object
    this.setState(prevState => {
        /*
         * We could try to parse newConfigData against the specific part of WidgetDataZod
         * if props.widgetType is known, to ensure type safety before setting state.
         * For now, direct update as OptionsComponent is generic.
         */
        return { widgetConfigData: newConfigData }
    })
  }

  handleSave = async (): Promise<void> => {
    const { widgetId } = this.props
    const { widgetConfigData } = this.state

    if (!widgetId) {
      console.error('Cannot save, widgetId is missing.')
      // Optionally set an error state to inform user
      return
    }

    try {
      // We only update the 'data' field (widget-specific config) of the widget
      await updateWidget(widgetId, { data: widgetConfigData || {} })
      this.close() // Close the dialog on successful save
    } catch (error) {
      console.error('Failed to save widget data:', error)
      // Optionally set an error state to inform user
      this.setState({error: 'Failed to save widget configuration.'})
    }
  }
  
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
    const { OptionsComponent = Form as unknown as ComponentType<IWidgetOptionsEditorProps> } = this.props
    const { widgetConfigData, error, initialWidgetData } = this.state

    const isLoading = initialWidgetData === undefined && !error // Still loading initial data

    return (
      <Dialog ref={this.dialogRef}>
        {error && <div style={{ color: 'red', marginBottom: '10px' }}>Error: {error}</div>}
        {isLoading ? (
            <div>Loading widget configuration...</div>
        ) : (
            /*
             * Ensure OptionsComponent is only rendered if widgetConfigData is available (not undefined)
             * or if it can handle undefined data (e.g. for creating new data from scratch)
             * For simplicity, assuming OptionsComponent can handle widgetConfigData being an empty object.
             */
            <OptionsComponent
                data={widgetConfigData || {}}
                onChange={this.handleOptionsChange}
            />
        )}
        <ButtonGroup style={{ marginTop: 20 }}>
          <Button text={'Save'} color={'#8bc34a'} onClick={this.handleSave} disabled={isLoading || !!error} />
          <Button text={'Cancel'} color={'#e85454'} onClick={this.close} />
        </ButtonGroup>
      </Dialog>
    )
  }
}

export default WidgetEditDialog
