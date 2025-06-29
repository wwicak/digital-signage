import React, { Component } from 'react'
import { Form, Input, InlineInputGroup } from '../../../components/Form'
import * as z from 'zod'

import { IWebDefaultData } from '../index'
import WebContentWithFallback, { WebWidgetDataSchema } from './WebContentWithFallback'

// Enhanced Zod schema for WebOptions props with new options
export const WebOptionsPropsSchema = z.object({
  data: WebWidgetDataSchema.optional(),
  onChange: z.function().args(WebWidgetDataSchema).returns(z.void()),
})
export type IWebOptionsProps = z.infer<typeof WebOptionsPropsSchema>;

// Enhanced state for WebOptions
type IWebOptionsState = z.infer<typeof WebWidgetDataSchema>;

class WebOptionsEnhanced extends Component<IWebOptionsProps, IWebOptionsState> {
  constructor(props: IWebOptionsProps) {
    super(props)
    
    const {
      title = null,
      url = 'https://compsci.lafayette.edu/',
      color = '#FFFFFF',
      refreshInterval = 0,
      scale = 1.0,
      allowInteraction = false,
      useProxy = false,
      showErrorMessage = true,
    } = props.data || {}

    this.state = {
      title,
      url,
      color,
      refreshInterval,
      scale,
      allowInteraction,
      useProxy,
      showErrorMessage,
    }
  }

  componentDidUpdate(prevProps: IWebOptionsProps) {
    if (this.props.data !== prevProps.data && this.props.data) {
      const {
        title = this.state.title,
        url = this.state.url,
        color = this.state.color,
        refreshInterval = this.state.refreshInterval,
        scale = this.state.scale,
        allowInteraction = this.state.allowInteraction,
        useProxy = this.state.useProxy,
        showErrorMessage = this.state.showErrorMessage,
      } = this.props.data
      this.setState({
        title,
        url,
        color,
        refreshInterval,
        scale,
        allowInteraction,
        useProxy,
        showErrorMessage
      })
    }
  }

  handleChange = (name: string, value: unknown): void => {
    const { onChange } = this.props
    
    let processedValue = value
    if (name === 'refreshInterval' || name === 'scale') {
      processedValue = parseFloat(value as string) || 0
      if (name === 'scale' && (processedValue < 0.1 || processedValue > 5)) {
        processedValue = Math.max(0.1, Math.min(5, processedValue))
      }
    }

    this.setState(
      { [name]: processedValue } as Pick<IWebOptionsState, keyof IWebOptionsState>,
      () => {
        if (onChange) {
          onChange(this.state)
        }
      }
    )
  }

  render() {
    const {
      title = '',
      url = 'https://compsci.lafayette.edu/',
      color = '#FFFFFF',
      refreshInterval = 0,
      scale = 1.0,
      allowInteraction = false,
      useProxy = false,
      showErrorMessage = true,
    } = this.state
    
    const previewData: IWebDefaultData = {
      title,
      url,
      color,
      refreshInterval,
      scale,
      allowInteraction,
      useProxy,
      showErrorMessage,
    }

    return (
      <div className={'options-container'}>
        <Form>
          <h3>Widget: Web Page (Enhanced)</h3>
          <p>Choose your preferences for the web page widget with enhanced error handling.</p>
          
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
            value={title || ''}
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
              max={5}
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

          {/* Enhanced Options Section */}
          <div className='border-t border-gray-200 pt-4 mt-4'>
            <h4 className='text-sm font-semibold text-gray-700 mb-3'>Advanced Error Handling</h4>
            
            <InlineInputGroup>
              <Input
                type='checkbox'
                name='showErrorMessage'
                label='Show Error Messages'
                checked={showErrorMessage}
                onChange={(name, checked) => this.handleChange(name as keyof IWebOptionsState, checked)}
                expand={false}
              />
              <Input
                type='checkbox'
                name='useProxy'
                label='Use Proxy for Blocked Sites'
                checked={useProxy}
                onChange={(name, checked) => this.handleChange(name as keyof IWebOptionsState, checked)}
                expand={false}
              />
            </InlineInputGroup>

            <div className='mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg'>
              <h5 className='text-sm font-medium text-blue-800 mb-2'>About X-Frame-Options Issues:</h5>
              <ul className='text-xs text-blue-700 space-y-1 list-disc list-inside'>
                <li><strong>Show Error Messages:</strong> Display user-friendly error messages when websites cannot be embedded</li>
                <li><strong>Use Proxy:</strong> Attempt to load blocked websites through a proxy service (requires backend support)</li>
                <li>Some websites (like {url.includes('plnindonesiapower.co.id') ? 'PLN Indonesia Power' : 'banks, government sites'}) block iframe embedding for security</li>
                <li>Consider using screenshots or alternative content for blocked sites</li>
              </ul>
            </div>
          </div>
        </Form>
        
        <div className={'preview-section-container'}>
          <p>Live Preview (with Enhanced Error Handling)</p>
          <div className={'preview-box iframe-preview-box'}>
            <WebContentWithFallback data={previewData} isPreview={true} />
          </div>
        </div>
      </div>
    )
  }
}

export default WebOptionsEnhanced