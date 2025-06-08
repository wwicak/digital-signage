import React from "react";
import { IWidgetOptionsEditorProps } from "../../widgets/base_widget";

// Define prop types to match the expected interface
interface EmptyWidgetOptionsProps
  extends IWidgetOptionsEditorProps<Record<string, any>> {}

// Define state types, even if empty
interface EmptyWidgetOptionsState {}

class EmptyWidgetOptions extends React.Component<
  EmptyWidgetOptionsProps,
  EmptyWidgetOptionsState
> {
  render() {
    return <div className={"widget"}>This widget has no options.</div>;
  }
}

export default EmptyWidgetOptions;
