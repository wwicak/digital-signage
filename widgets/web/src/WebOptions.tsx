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
      <div className={'options-container'}>
        <Form>
          <h3>Widget: Web Page</h3> {/* Updated title */}
          <p>Choose your preferences for the web page widget.</p>
          <Input
            label={'Webpage URL'}
            type={'text'}
            name={'url'}
            value={url}
            placeholder={'https://example.com'}
            onChange={this.handleChange}
          />
          <Input
            label={'Widget Title (Optional)'}
            placeholder={'Optional title for the frame...'}
            type={'text'}
            name={'title'}
            value={title || ''} // Ensure value is not null
            onChange={this.handleChange}
          />
          <InlineInputGroup>
            <Input
              label={'Background Color (Widget Frame)'}
              type={'color'}
              name={'color'}
              value={color}
              onChange={this.handleChange}
              expand={false}
            />
            <Input
              label={'Refresh Interval (seconds, 0 to disable)'}
              type={'number'}
              name={'refreshInterval'}
              value={refreshInterval}
              min={0}
              step={10}
              onChange={this.handleChange}
              expand={true}
            />
          </InlineInputGroup>
          <InlineInputGroup>
            <Input
              label={'Scale (e.g., 0.8 for 80%, 1 for 100%)'}
              type={'number'}
              name={'scale'}
              value={scale}
              min={0.1}
              max={5} // Example max scale
              step={0.05}
              onChange={this.handleChange}
              expand={true}
            />
            <Input
              type='checkbox'
              name='allowInteraction'
              label='Allow User Interaction'
              checked={allowInteraction}
              onChange={(name, checked) => this.handleChange(name as keyof IWebOptionsState, checked)}
              expand={false}
            />
          </InlineInputGroup>
        </Form>
        <div className={'preview-section-container'}>
            <p>Live Preview (scaled & interactive if enabled)</p>
            <div className={'preview-box iframe-preview-box'}>
                <WebContent data={previewData} isPreview={true} />
            </div>
        </div>
        
      </div>
    )
  }
}

export default WebOptions