import React, { Component } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import WidgetEditDialog from "./WidgetEditDialog";
import { Form, Input, InlineInputGroup } from "../Form";
import { WidgetType } from "@/lib/models/Widget";
import { CheckCircle, Settings, Monitor, Play } from "lucide-react";

// Mock complex widget options component to test scrolling
interface MockWidgetOptionsProps {
  data: Record<string, any>;
  onChange: (data: Record<string, any>) => void;
}

class MockComplexWidgetOptions extends Component<MockWidgetOptionsProps> {
  state = {
    title: this.props.data?.title || "",
    url: this.props.data?.url || "",
    backgroundColor: this.props.data?.backgroundColor || "#000000",
    autoplay: this.props.data?.autoplay || false,
    loop: this.props.data?.loop || false,
    volume: this.props.data?.volume || 1,
    muted: this.props.data?.muted || false,
    showControls: this.props.data?.showControls || true,
    fit: this.props.data?.fit || "contain",
    enableScheduling: this.props.data?.enableScheduling || false,
    // Add many more fields to test scrolling
    customField1: this.props.data?.customField1 || "",
    customField2: this.props.data?.customField2 || "",
    customField3: this.props.data?.customField3 || "",
    customField4: this.props.data?.customField4 || "",
    customField5: this.props.data?.customField5 || "",
  };

  handleChange = (name: string, value: any) => {
    this.setState({ [name]: value }, () => {
      if (this.props.onChange) {
        this.props.onChange(this.state);
      }
    });
  };

  render() {
    const {
      title,
      url,
      backgroundColor,
      autoplay,
      loop,
      volume,
      muted,
      showControls,
      fit,
      enableScheduling,
      customField1,
      customField2,
      customField3,
      customField4,
      customField5,
    } = this.state;

    return (
      <Form>
        <div className="space-y-6">
          {/* Basic Settings Section */}
          <div className="widget-section">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Basic Settings</h3>
            <div className="space-y-4">
              <Input
                type="text"
                name="title"
                label="Widget Title"
                value={title}
                onChange={this.handleChange}
                placeholder="Enter widget title"
              />
              <Input
                type="url"
                name="url"
                label="Media URL"
                value={url}
                onChange={this.handleChange}
                placeholder="https://example.com/video.mp4"
              />
              <Input
                type="color"
                name="backgroundColor"
                label="Background Color"
                value={backgroundColor}
                onChange={this.handleChange}
              />
            </div>
          </div>

          {/* Playback Settings Section */}
          <div className="widget-section">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Playback Settings</h3>
            <InlineInputGroup>
              <Input
                type="checkbox"
                name="autoplay"
                label="Autoplay"
                checked={autoplay}
                onChange={this.handleChange}
              />
              <Input
                type="checkbox"
                name="loop"
                label="Loop"
                checked={loop}
                onChange={this.handleChange}
              />
              <Input
                type="checkbox"
                name="muted"
                label="Muted"
                checked={muted}
                onChange={this.handleChange}
              />
              <Input
                type="checkbox"
                name="showControls"
                label="Show Controls"
                checked={showControls}
                onChange={this.handleChange}
              />
            </InlineInputGroup>
            <div className="mt-4">
              <Input
                type="number"
                name="volume"
                label={`Volume: ${Math.round(volume * 100)}%`}
                value={volume}
                onChange={this.handleChange}
                min={0}
                max={1}
                step={0.1}
              />
            </div>
          </div>

          {/* Display Settings Section */}
          <div className="widget-section">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Display Settings</h3>
            <Input
              type="select"
              name="fit"
              label="Fit Mode"
              value={fit}
              onChange={this.handleChange}
              choices={[
                { id: "contain", label: "Contain (fit within bounds)" },
                { id: "cover", label: "Cover (fill and crop)" },
                { id: "fill", label: "Fill (stretch to fit)" },
              ]}
            />
          </div>

          {/* Scheduling Section */}
          <div className="widget-section">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Scheduling</h3>
            <Input
              type="checkbox"
              name="enableScheduling"
              label="Enable Scheduling"
              checked={enableScheduling}
              onChange={this.handleChange}
            />
            {enableScheduling && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-4">
                  Configure when this widget should be active
                </p>
                <InlineInputGroup>
                  <Input
                    type="text"
                    name="startTime"
                    label="Start Time"
                    value="09:00"
                    onChange={this.handleChange}
                    placeholder="09:00"
                  />
                  <Input
                    type="text"
                    name="endTime"
                    label="End Time"
                    value="17:00"
                    onChange={this.handleChange}
                    placeholder="17:00"
                  />
                </InlineInputGroup>
              </div>
            )}
          </div>

          {/* Custom Fields Section - To test scrolling */}
          <div className="widget-section">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Custom Configuration</h3>
            <div className="space-y-4">
              <Input
                type="text"
                name="customField1"
                label="Custom Field 1"
                value={customField1}
                onChange={this.handleChange}
                placeholder="Enter custom value 1"
              />
              <Input
                type="text"
                name="customField2"
                label="Custom Field 2"
                value={customField2}
                onChange={this.handleChange}
                placeholder="Enter custom value 2"
              />
              <Input
                type="textarea"
                name="customField3"
                label="Custom Field 3 (Large Text)"
                value={customField3}
                onChange={this.handleChange}
                placeholder="Enter a longer description or configuration..."
                rows={4}
              />
              <Input
                type="text"
                name="customField4"
                label="Custom Field 4"
                value={customField4}
                onChange={this.handleChange}
                placeholder="Enter custom value 4"
              />
              <Input
                type="text"
                name="customField5"
                label="Custom Field 5"
                value={customField5}
                onChange={this.handleChange}
                placeholder="Enter custom value 5"
              />
            </div>
          </div>

          {/* Preview Section */}
          <div className="widget-preview-section">
            <div className="widget-preview-header">
              <h4 className="text-lg font-semibold mb-2 text-gray-900">Live Preview</h4>
              <p className="text-gray-600 mb-4">Preview of your widget configuration</p>
            </div>
            <div className="widget-preview-container p-6 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300">
              <div className="text-center text-gray-500">
                <Monitor className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Widget preview would appear here</p>
                <p className="text-sm mt-1">Title: {title || "Untitled Widget"}</p>
                <p className="text-sm">URL: {url || "No URL specified"}</p>
              </div>
            </div>
          </div>

          {/* Additional Test Content */}
          <div className="widget-section">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Additional Options</h3>
            <p className="text-gray-600 mb-4">
              This section contains additional configuration options to test the scrolling behavior
              of the modal dialog. The content should scroll smoothly while keeping the header and
              footer fixed in place.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h5 className="font-medium text-blue-900 mb-2">Performance Settings</h5>
                <p className="text-sm text-blue-700">
                  Configure performance-related options for optimal playback.
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <h5 className="font-medium text-green-900 mb-2">Accessibility</h5>
                <p className="text-sm text-green-700">
                  Set up accessibility features for better user experience.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Form>
    );
  }
}

/**
 * Test component to demonstrate the improved WidgetEditDialog with viewport constraints
 */
const WidgetEditDialogTest: React.FC = () => {
  const dialogRef = React.useRef<any>(null);

  const openDialog = () => {
    dialogRef.current?.open();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Widget Edit Dialog Test</h1>
        <p className="text-muted-foreground mt-2">
          Test the improved WidgetEditDialog with viewport height constraints and scrolling behavior.
        </p>
      </div>

      {/* Test Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Modal Improvements Implemented
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm">Maximum height constraint (90vh)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm">Scrollable content area</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm">Fixed header and footer</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm">Proper vertical centering</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm">Bottom padding for content</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm">Custom scrollbar styling</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Button */}
      <Card>
        <CardHeader>
          <CardTitle>Test the Modal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Click the button below to open a mock widget edit dialog with extensive configuration options.
              The modal should respect viewport height constraints and provide smooth scrolling.
            </p>
            <Button onClick={openDialog} className="flex items-center gap-2">
              <Play className="w-4 h-4" />
              Open Widget Edit Dialog
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Hidden Dialog */}
      <WidgetEditDialog
        ref={dialogRef}
        widgetId="test-widget-id"
        widgetType={WidgetType.WEB}
        OptionsComponent={MockComplexWidgetOptions as any}
      />

      {/* Testing Notes */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-blue-800 dark:text-blue-200">Testing Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-blue-700 dark:text-blue-300 text-sm">
            <p>• The modal should not exceed 90% of viewport height</p>
            <p>• Header with title should remain fixed at the top</p>
            <p>• Footer with buttons should remain fixed at the bottom</p>
            <p>• Content area should scroll smoothly with custom scrollbar</p>
            <p>• Modal should remain centered even when content is scrollable</p>
            <p>• Bottom padding should prevent content from being cut off</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WidgetEditDialogTest;
