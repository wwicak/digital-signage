import React, { Component } from 'react'
import { Form, Input, InlineInputGroup, IInputProps } from '../../../components/Form'
import { IWidgetOptionsEditorProps } from '../../../components/Admin/WidgetEditDialog' // This is z.infer<typeof WidgetOptionsEditorPropsSchema>
import * as z from 'zod'

import AnnouncementContent, { AnnouncementWidgetContentDataSchema, IAnnouncementWidgetData } from './AnnouncementContent' // IAnnouncementWidgetData is z.infer<typeof AnnouncementWidgetContentDataSchema>

/*
 * Zod schema for AnnouncementOptions props
 * This needs to align with IWidgetOptionsEditorProps but typed for AnnouncementWidgetContentDataSchema
 */
export const AnnouncementOptionsPropsSchema = z.object({
  data: AnnouncementWidgetContentDataSchema.optional(),
  onChange: z.function().args(AnnouncementWidgetContentDataSchema).returns(z.void()),
})
export type IAnnouncementOptionsProps = z.infer<typeof AnnouncementOptionsPropsSchema>;

// State for AnnouncementOptions will also use IAnnouncementWidgetData (inferred from AnnouncementWidgetContentDataSchema)
type IAnnouncementOptionsState = IAnnouncementWidgetData; // This is already an inferred type

class AnnouncementOptions extends Component<IAnnouncementOptionsProps, IAnnouncementOptionsState> {
  constructor(props: IAnnouncementOptionsProps) {
    super(props)
    // Initialize state from props.data, providing defaults if not present
    const {
      text = '',
      color = '#708090',
      textColor = '#ffffff',
      titleTextColor = '#fff0f0',
      accentColor = '#EDC951',
      title = 'Announcement', // Default title if not in props.data
    } = props.data || {}

    this.state = {
      text,
      color,
      textColor,
      titleTextColor,
      accentColor,
      title,
    }
  }

  // If props.data can change from parent after initial mount, update state here
  componentDidUpdate(prevProps: IAnnouncementOptionsProps) {
    if (this.props.data !== prevProps.data) {
      /*
       * This might lead to an infinite loop if onChange also updates props.data immediately.
       * A common pattern is to only use props.data for initial state or use a key prop on this component.
       * For now, keeping simple update. Consider a deep comparison if props.data is complex.
       */
      this.setState({ ...this.props.data })
    }
  }

  handleChange = (name: string, value: any): void => {
    // Type assertion for name is okay here as we know it's a key of the state.
    this.setState(
      { [name]: value } as Pick<IAnnouncementOptionsState, keyof IAnnouncementOptionsState>,
      () => {
        // Call props.onChange with the full current state
        if (this.props.onChange) {
          this.props.onChange(this.state)
        }
      }
    )
  }

  render() {
    // All state fields are optional in IAnnouncementWidgetData, provide fallbacks for rendering
    const {
      text = '',
      color = '#708090',
      textColor = '#ffffff',
      titleTextColor = '#fff0f0',
      accentColor = '#EDC951',
      title = 'Announcement', // Used for preview, not directly an input here
    } = this.state

    // Data for the preview
    const previewData: IAnnouncementWidgetData = {
        text, color, textColor, titleTextColor, accentColor, title
    }

    return (
      <div className={'options-container'}> {/* Renamed class */}
        <Form>
          <h3>Widget: Announcement</h3>
          <p>Choose your preferences for the announcement widget.</p>
          <InlineInputGroup>
            <Input
              inline={false} // Assuming this means it takes full width in its group item
              label={'Background Color'}
              type={'color'}
              name={'color'}
              value={color}
              onChange={this.handleChange}
            />
            <Input
              inline={false}
              label={'Text Color'}
              type={'color'}
              name={'textColor'}
              value={textColor}
              onChange={this.handleChange}
            />
            <Input
              inline={false}
              label={'Title Text Color'}
              type={'color'}
              name={'titleTextColor'}
              value={titleTextColor}
              onChange={this.handleChange}
            />
            <Input
              inline={false}
              label={'Accent Color'}
              type={'color'}
              name={'accentColor'}
              value={accentColor}
              onChange={this.handleChange}
            />
          </InlineInputGroup>

          <Input
            inline={false}
            label={'Text to be Displayed'}
            placeholder={'Enter an announcement here...'}
            type={'textarea'}
            name={'text'}
            value={text}
            onChange={this.handleChange}
            rows={5} // Example: make textarea larger
          />
           {/* Optional: Input for the title if it should be configurable */}
           <Input
            inline={false}
            label={'Title (for data, not displayed in header)'}
            placeholder={'Enter a title for data...'}
            type={'text'}
            name={'title'}
            value={title}
            onChange={this.handleChange}
          />
        </Form>
        <div className={'preview-section-container'}> {/* Renamed class */}
          <p>Preview</p>
          <div className={'preview-box'}> {/* Renamed class */}
            <AnnouncementContent data={previewData} />
          </div>
        </div>
        <style jsx>
          {`
            h3,
            p {
              font-family: 'Open Sans', sans-serif;
            }
            .options-container { /* Renamed */
              display: flex;
              flex-direction: row;
              width: 100%; /* Ensure it takes available width */
            }
            /* Form takes up available space, Preview has fixed width */
            .options-container > :global(form) { /* Target Form component */
                flex: 1;
                padding-right: 16px; /* Space before preview */
            }
            .preview-box { /* Renamed */
              display: block; /* Was flex, block might be simpler for fixed size */
              width: 240px;
              height: 240px; /* Fixed height for preview */
              border-radius: 6px;
              overflow: hidden;
              border: 1px solid #ccc; /* Added border for better visibility */
            }
            .preview-section-container { /* Renamed */
              margin-left: 16px;
              width: 240px; /* Fixed width for the preview section */
              flex-shrink: 0; /* Prevent preview from shrinking */
            }
          `}
        </style>
      </div>
    )
  }
}

export default AnnouncementOptions
