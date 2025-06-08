import React, { Component } from 'react'
import { Form, Input, InlineInputGroup } from '../../../components/Form' // Assuming Form components are/will be typed
import * as z from 'zod'

import { IWebDefaultData } from '../index' // This is an interface
import WebContent, { WebWidgetDataSchema } from './WebContent' // Import Zod schema

/*
 * Zod schema for WebOptions props
 * IWidgetOptionsEditorProps<T> has data: T | undefined, onChange: (newData: T) => void
 */
export const WebOptionsPropsSchema = z.object({
  data: WebWidgetDataSchema.optional(),
  onChange: z.function().args(WebWidgetDataSchema).returns(z.void()),
})
export type IWebOptionsProps = z.infer<typeof WebOptionsPropsSchema>;

// State for WebOptions will use the Zod-inferred type
type IWebOptionsState = z.infer<typeof WebWidgetDataSchema>;

class WebOptions extends Component<IWebOptionsProps, IWebOptionsState> {
  constructor(props: IWebOptionsProps) {
    super(props)
    // Initialize state from props.data, providing defaults from IWebDefaultData
    const {
      title = null,
      url = 'https://compsci.lafayette.edu/',
      color = '#FFFFFF',
      refreshInterval = 0,
      scale = 1.0,
      allowInteraction = false,
    } = props.data || {}

    this.state = {
      title,
      url,
      color,
      refreshInterval,
      scale,
      allowInteraction,
    }
  }

  componentDidUpdate(prevProps: IWebOptionsProps) {
    if (this.props.data !== prevProps.data && this.props.data) {
      /*
       * This can cause issues if not handled carefully.
       * Update state if props.data changes, ensuring defaults are still applied if new data is partial.
       */
      const {
        title = this.state.title,
        url = this.state.url,
        color = this.state.color,
        refreshInterval = this.state.refreshInterval,
        scale = this.state.scale,
        allowInteraction = this.state.allowInteraction,
      } = this.props.data
      this.setState({ title, url, color, refreshInterval, scale, allowInteraction })
    }
  }

  handleChange = (name: string, value: any): void => {
    const { onChange } = this.props
    // Ensure numeric fields are stored as numbers
    let processedValue = value
    if (name === 'refreshInterval' || name === 'scale') {
      processedValue = parseFloat(value as string) || 0
      if (name === 'scale' && (processedValue < 0.1 || processedValue > 5)) { // Example range for scale
        processedValue = Math.max(0.1, Math.min(5, processedValue))
      }
    }

    this.setState(
      { [name]: processedValue } as Pick<IWebOptionsState, keyof IWebOptionsState>,
      () => {
        if (onChange) {
          onChange(this.state) // Pass the entire current state upwards
        }
      }
    )
  }

  render() {
    // Provide fallbacks for rendering if state values are somehow undefined/null
    const {
      title = '', // Default to empty string for input value
      url = 'https://compsci.lafayette.edu/',
      color = '#FFFFFF',
      refreshInterval = 0,
      scale = 1.0,
      allowInteraction = false,
    } = this.state
    
    const previewData: IWebDefaultData = { title, url, color, refreshInterval, scale, allowInteraction }

    return (
      <div className="space-y-8">
        {/* Configuration Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Web Page Widget Configuration</h3>
            <p className="text-gray-600">Configure how your web page will be displayed in the widget.</p>
          </div>

          <Form>
            <div className="space-y-6">
              {/* URL Input */}
              <div>
                <Input
                  label="Webpage URL"
                  type="text"
                  name="url"
                  value={url}
                  placeholder="https://example.com"
                  onChange={this.handleChange}
                />
                <p className="text-sm text-gray-500 mt-1">Enter the full URL of the webpage you want to display</p>
              </div>

              {/* Title Input */}
              <div>
                <Input
                  label="Widget Title (Optional)"
                  placeholder="Optional title for the frame..."
                  type="text"
                  name="title"
                  value={title || ''}
                  onChange={this.handleChange}
                />
              </div>

              {/* Color and Refresh Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Input
                    label="Background Color"
                    type="color"
                    name="color"
                    value={color}
                    onChange={this.handleChange}
                    expand={false}
                  />
                  <p className="text-sm text-gray-500 mt-1">Frame background color</p>
                </div>
                <div>
                  <Input
                    label="Refresh Interval (seconds)"
                    type="number"
                    name="refreshInterval"
                    value={refreshInterval}
                    min={0}
                    step={10}
                    onChange={this.handleChange}
                    expand={true}
                  />
                  <p className="text-sm text-gray-500 mt-1">Set to 0 to disable auto-refresh</p>
                </div>
              </div>

              {/* Scale and Interaction Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Input
                    label="Scale Factor"
                    type="number"
                    name="scale"
                    value={scale}
                    min={0.1}
                    max={5}
                    step={0.05}
                    onChange={this.handleChange}
                    expand={true}
                  />
                  <p className="text-sm text-gray-500 mt-1">1.0 = 100%, 0.8 = 80%, etc.</p>
                </div>
                <div className="flex items-center pt-6">
                  <Input
                    type="checkbox"
                    name="allowInteraction"
                    label="Allow User Interaction"
                    checked={allowInteraction}
                    onChange={(name, checked) => this.handleChange(name as keyof IWebOptionsState, checked)}
                    expand={false}
                  />
                </div>
              </div>
            </div>
          </Form>
        </div>

        {/* Preview Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="mb-4">
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Live Preview</h4>
            <p className="text-gray-600">See how your web page widget will appear</p>
          </div>
          <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-50 min-h-[300px]">
            <WebContent data={previewData} isPreview={true} />
          </div>
        </div>
      </div>
    )
  }
}

export default WebOptions