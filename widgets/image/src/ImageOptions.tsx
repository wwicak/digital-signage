import React, { Component } from 'react'
import { Form, Input, InlineInputGroup, IChoice } from '../../../components/Form'
import { standaloneUpload } from '../../../actions/slide'
import * as z from 'zod'

// TImageFit is string union, IImageDefaultData is interface
import ImageContent from './ImageContent'
import { TImageFitSchema } from './ImageContent' // Import the Zod schema for TImageFit

// Zod schema for IImageDefaultData (used for props.data and state)
export const ImageOptionsDataSchema = z.object({
  title: z.string().nullable().optional(),
  url: z.string()
    .nullable()
    .refine((val) => {
      if (!val) return true // Allow null
      try {
        const url = new URL(val)
        return url.protocol === 'http:' || url.protocol === 'https:'
      } catch {
        return false
      }
    }, "URL must be a valid HTTP/HTTPS URL"),
  fit: TImageFitSchema,
  color: z.string(),
  altText: z.string().optional(),
})
// type IImageOptionsState = z.infer<typeof ImageOptionsDataSchema>; // This will be the state type

/*
 * Zod schema for ImageOptions props
 * IWidgetOptionsEditorProps<T> has data: T | undefined, onChange: (newData: T) => void
 */
export const ImageOptionsPropsSchema = z.object({
  data: ImageOptionsDataSchema.optional(), // data is T | undefined
  onChange: z.function().args(ImageOptionsDataSchema).returns(z.void()), // onChange is (newData: T) => void
})
export type IImageOptionsProps = z.infer<typeof ImageOptionsPropsSchema>;

// State for ImageOptions will use the Zod-inferred type
type IImageOptionsState = z.infer<typeof ImageOptionsDataSchema>;

// Define available 'fit' choices
const fitChoices: IChoice[] = [
  { id: 'cover', label: 'Zoom-in (Cover)' },
  { id: 'contain', label: 'Fit to Container (Contain)' },
  { id: 'fill', label: 'Stretch to Fill' },
  { id: 'none', label: 'Actual Size (None)' },
  { id: 'scale-down', label: 'Scale Down (If larger)' },
]

class ImageOptions extends Component<IImageOptionsProps, IImageOptionsState> {
  constructor(props: IImageOptionsProps) {
    super(props)
    console.log('ImageOptions constructor props:', props)
    
    // Initialize state from props.data, providing defaults
    const {
      title = null,
      color = '#2d3436',
      fit = 'contain',
      url = null,
      altText = '',
    } = props.data || {}

    console.log('ImageOptions parsed data:', {
      title, color, fit, url, altText
    })

    this.state = {
      title,
      color,
      fit,
      url,
      altText,
    }
  }

  componentDidMount() {
    console.log('ImageOptions componentDidMount props:', this.props)
    
    // Initialize with props data if available
    if (this.props.data) {
      console.log('ImageOptions mounting with data:', this.props.data)
      const { title, url, fit, color, altText } = this.props.data
      const newState = {
        title: title ?? null,
        url: url ?? null,
        fit: fit ?? 'contain',
        color: color ?? '#2d3436',
        altText: altText ?? ''
      }
      console.log('ImageOptions setting state:', newState)
      this.setState(newState)
    }
  }

  componentDidUpdate(prevProps: IImageOptionsProps) {
    // Check if data has changed and ensure we have valid data
    if (this.props.data !== prevProps.data) {
      console.log('ImageOptions componentDidUpdate new props:', this.props)
      console.log('ImageOptions prev props:', prevProps)
      
      if (this.props.data) {
        const { title, url, fit, color, altText } = this.props.data
        const newState = {
          title: title ?? this.state.title,
          url: url ?? this.state.url,
          fit: fit ?? this.state.fit,
          color: color ?? this.state.color,
          altText: altText ?? this.state.altText
        }
        console.log('ImageOptions updating state:', newState)
        this.setState(newState)
      }
    }
  }

  handleChange = async (name: string, value: any): Promise<void> => {
    const { onChange } = this.props
    let finalName: keyof IImageOptionsState = name as keyof IImageOptionsState
    let finalValue = value

    if (name === 'upload') {
      finalName = 'url'
      if (value instanceof File) {
        try {
          const resp = await standaloneUpload(value)
          console.log('Upload response:', resp)
          
          // Ensure URL is absolute HTTP/HTTPS
          let uploadUrl = resp.url
          if (!uploadUrl.match(/^https?:\/\//)) {
            uploadUrl = new URL(uploadUrl, window.location.origin).toString()
          }
          
          console.log('Processed URL:', uploadUrl)
          finalValue = uploadUrl
        } catch (error) {
          console.error('Image upload failed:', error)
          const err = error as { response?: { data?: { message?: string } }; message?: string }
          const errorMessage = err.response?.data?.message || err.message || 'Failed to upload image'
          alert(`Upload failed: ${errorMessage}`)
          finalValue = this.state.url
        }
      } else if (typeof value === 'string') {
        // For pasted/entered URLs, ensure they are absolute HTTP/HTTPS
        try {
          const url = value.match(/^https?:\/\//) ? value : `https://${value}`
          new URL(url) // Validate URL format
          finalValue = url
        } catch (e) {
          alert('Please enter a valid URL')
          finalValue = null
        }
      } else {
        finalValue = null
      }
    }

    this.setState(
      { [finalName]: finalValue } as Pick<IImageOptionsState, keyof IImageOptionsState>,
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
      color = '#2d3436',
      fit = 'contain',
      url = '', // Default to empty string for input value if null
      altText = '', // Default to empty string
    } = this.state

    return (
      <div className={'options-container'}>
        <Form>
          <h3>Widget: Standalone Image</h3>
          <p>Choose your preferences for the image widget.</p>
          <InlineInputGroup>
            <Input
              inline={false}
              label={'Background Color'}
              type={'color'}
              name={'color'}
              value={color}
              onChange={this.handleChange}
              expand={false}
            />
            <Input
              inline={false}
              label={'Title (Optional)'}
              type={'text'}
              name={'title'}
              placeholder={'Optional image title...'}
              value={title || ''} // Ensure value is not null
              onChange={this.handleChange}
              expand={true}
            />
          </InlineInputGroup>
          <InlineInputGroup>
            {/* 'photo' type input should handle File object or string URL for display */}
            {/* Its 'name' prop is 'upload' to trigger the special handling in handleChange */}
            <Input
              inline={false}
              label={'Image (Upload or URL)'}
              type={'photo'}
              name={'upload'} // Triggers upload logic in handleChange
              value={url} // Display current URL; input component handles File preview
              onChange={this.handleChange}
              accept={{
                'image/jpeg': ['.jpg', '.jpeg'],
                'image/png': ['.png'],
                'image/gif': ['.gif'],
                'image/webp': ['.webp'],
                'image/svg+xml': ['.svg'],
                'image/bmp': ['.bmp'],
                'image/tiff': ['.tiff', '.tif']
              }}
            />
            <Input
              inline={false}
              label={'Image Fit'}
              type={'select'}
              name={'fit'}
              value={fit}
              choices={fitChoices}
              onChange={this.handleChange}
              expand={false}
            />
          </InlineInputGroup>
          <Input
            inline={false}
            label={'Alt Text (Accessibility)'}
            type={'text'}
            name={'altText'}
            placeholder={'Descriptive text for the image...'}
            value={altText}
            onChange={this.handleChange}
          />
        </Form>
        <div className='preview-section-container mt-8 border-t border-gray-200 pt-6'>
          <h4 className='text-sm font-medium text-gray-700 mb-4'>Preview</h4>
          <div className='preview-box bg-gray-50 rounded-lg overflow-hidden' style={{ height: '200px' }}>
            <ImageContent data={this.state} />
          </div>
        </div>
      </div>
    )
  }
}

export default ImageOptions