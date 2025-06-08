import React, { Component } from 'react'
import { Form, Input, InlineInputGroup, IChoice } from '../../../components/Form'
import { standaloneUpload } from '../../../actions/slide'
import * as z from 'zod'

// TImageFit is string union, IImageDefaultData is interface
import { TImageFitSchema } from './ImageContent' // Import the Zod schema for TImageFit

// Zod schema for IImageDefaultData (used for props.data and state)
export const ImageOptionsDataSchema = z.object({
  title: z.string().nullable().optional(),
  url: z.string().url().nullable(), // If it's a URL or null. If it can be any string, use z.string().nullable()
  fit: TImageFitSchema, // Required, as per IImageDefaultData
  color: z.string(), // Required, as per IImageDefaultData
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
    // Initialize state from props.data, providing defaults
    const {
      title = null,
      color = '#2d3436',
      fit = 'contain',
      url = null,
      altText = '',
    } = props.data || {}

    this.state = {
      title,
      color,
      fit,
      url,
      altText,
    }
  }

  componentDidUpdate(prevProps: IImageOptionsProps) {
    if (this.props.data !== prevProps.data && this.props.data) {
      /*
       * This can cause issues if not handled carefully.
       * Consider deep comparison or using a key prop on this component.
       */
      this.setState({ ...this.props.data })
    }
  }

  handleChange = async (name: string, value: any): Promise<void> => {
    const { onChange } = this.props
    let finalName: keyof IImageOptionsState = name as keyof IImageOptionsState
    let finalValue = value

    if (name === 'upload') {
      finalName = 'url' // The state field to update is 'url'
      if (value instanceof File) { // Ensure 'value' is a File object
        try {
          const resp = await standaloneUpload(value) // Assuming standaloneUpload returns { data: { url: string } }
          finalValue = resp.url
        } catch (error) {
          console.error('Image upload failed:', error)
          // Optionally, set an error state or provide user feedback
          finalValue = this.state.url // Revert to previous URL or keep as is
        }
      } else if (typeof value === 'string') {
        // If the photo input itself returns a URL string (e.g. user pasted a URL)
        finalValue = value
      } else {
        // If value is null or unexpected type (e.g. photo removed)
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
        {/* No preview was in the original JS for ImageOptions, so not adding one here.
            If a preview is desired, ImageContent component could be used. */}
        
      </div>
    )
  }
}

export default ImageOptions