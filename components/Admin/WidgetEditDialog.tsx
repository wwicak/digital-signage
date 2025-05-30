import React, { Component, ComponentType } from 'react';
import Dialog, { DialogMethods } from '../Dialog'; // Assuming Dialog.tsx
import { Form, Button, ButtonGroup } from '../Form'; // Assuming Form components are/will be typed
import { getWidget, updateWidget, IWidgetData } from '../../actions/widgets'; // Widget actions are typed

// Interface for methods exposed via ref (e.g., to be called by EditableWidget)
export interface IWidgetEditDialog {
  open: (e?: React.MouseEvent) => void;
  close: (e?: React.MouseEvent) => Promise<void>; // Matches original return type
}

// Props for the OptionsComponent that will be passed dynamically
export interface IWidgetOptionsEditorProps<TData = Record<string, any>> {
  data: TData | undefined; // The widget-specific data object
  onChange: (newData: TData) => void; // Callback to update this data object
}

export interface IWidgetEditDialogProps {
  widgetId: string; // ID of the widget to edit
  widgetType?: string; // Type of the widget, for context or fetching specific options definition
  OptionsComponent?: ComponentType<IWidgetOptionsEditorProps>; // The dynamic component for widget-specific options
  // refresh?: () => void; // Optional callback after saving, if needed by parent
}

interface IWidgetEditDialogState {
  // This state will hold the 'data' field of the widget (the widget-specific configuration)
  widgetConfigData: Record<string, any> | undefined;
  initialWidgetData?: IWidgetData | null; // To store the full widget data if needed for context
  error?: string | null;
}

class WidgetEditDialog extends Component<IWidgetEditDialogProps, IWidgetEditDialogState> implements IWidgetEditDialog {
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
    // const { refresh } = this.props;
    // if (refresh) refresh(); // Call refresh if provided
    return Promise.resolve();
  };

  fetchWidgetData = (): void => {
    const { widgetId } = this.props;
    if (!widgetId) {
        this.setState({ error: "Widget ID is missing.", widgetConfigData: undefined, initialWidgetData: null });
        return;
    }
    this.setState({ error: null, widgetConfigData: undefined, initialWidgetData: undefined }); // Reset/loading state

    getWidget(widgetId)
      .then((widgetFullData: IWidgetData) => {
        this.setState({
          widgetConfigData: widgetFullData.data || {}, // Initialize with empty object if no data
          initialWidgetData: widgetFullData,
        });
      })
      .catch(error => {
        console.error(`Failed to fetch widget data for ${widgetId}:`, error);
        this.setState({ error: "Failed to load widget configuration.", initialWidgetData: null });
      });
  };

  // This handleChange is for the widget-specific OptionsComponent
  // It expects the OptionsComponent to call it with the complete, new data object
  handleOptionsChange = (newConfigData: Record<string, any>): void => {
    this.setState({
      widgetConfigData: newConfigData,
    });
  };

  handleSave = async (): Promise<void> => {
    const { widgetId } = this.props;
    const { widgetConfigData } = this.state;

    if (!widgetId) {
      console.error("Cannot save, widgetId is missing.");
      // Optionally set an error state to inform user
      return;
    }

    try {
      // We only update the 'data' field (widget-specific config) of the widget
      await updateWidget(widgetId, { data: widgetConfigData || {} });
      this.close(); // Close the dialog on successful save
    } catch (error) {
      console.error('Failed to save widget data:', error);
      // Optionally set an error state to inform user
      this.setState({error: "Failed to save widget configuration."});
    }
  };
  
  // componentDidMount() {
  //   // Data fetching is now typically done when 'open' is called to ensure fresh data.
  //   // If dialog is controlled and opened by prop, then fetch here or in componentDidUpdate.
  //   // this.fetchWidgetData(); // Original logic: fetch on mount.
  // }

  render() {
    // Default to a simple Form if no OptionsComponent is provided, though this might not be very useful.
    // Usually, OptionsComponent should always be provided for meaningful editing.
    const { OptionsComponent = Form as unknown as ComponentType<IWidgetOptionsEditorProps> } = this.props;
    const { widgetConfigData, error, initialWidgetData } = this.state;

    const isLoading = initialWidgetData === undefined && !error; // Still loading initial data

    return (
      <Dialog ref={this.dialogRef}>
        {error && <div style={{ color: 'red', marginBottom: '10px' }}>Error: {error}</div>}
        {isLoading ? (
            <div>Loading widget configuration...</div>
        ) : (
            // Ensure OptionsComponent is only rendered if widgetConfigData is available (not undefined)
            // or if it can handle undefined data (e.g. for creating new data from scratch)
            // For simplicity, assuming OptionsComponent can handle widgetConfigData being an empty object.
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
    );
  }
}

export default WidgetEditDialog;
