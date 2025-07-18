import React, { Component } from 'react'
import { Form, Input, InlineInputGroup } from '../../../components/Form'
// This is z.infer<typeof WidgetOptionsEditorPropsSchema>
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
      title = 'Important System Maintenance',
      content = 'The network will be temporarily unavailable for scheduled maintenance. Please save your work and log off by 5:00 PM today. Expected downtime is 2 hours.',
      date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
      time = 'All Day',
      priority = 'high' as const,
      category = 'IT Notice',
      type = 'alert' as const,
    } = props.data || {}

    this.state = {
      title,
      content,
      date,
      time,
      priority,
      category,
      type,
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

  handleChange = (name: string, value: unknown): void => {
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
      title = 'Important System Maintenance',
      content = 'The network will be temporarily unavailable for scheduled maintenance. Please save your work and log off by 5:00 PM today. Expected downtime is 2 hours.',
      date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
      time = 'All Day',
      priority = 'high' as const,
      category = 'IT Notice',
      type = 'alert' as const,
    } = this.state

    // Data for the preview
    const previewData: IAnnouncementWidgetData = {
      title, content, date, time, priority, category, type
    }

    return (
      <div className={'options-container'}>
        <Form>
          <h3>Widget: Announcement</h3>
          <p>Create your announcement with enhanced card design.</p>
          
          <InlineInputGroup>
            <Input
              inline={false}
              label={'Title'}
              type={'text'}
              name={'title'}
              value={title}
              onChange={this.handleChange}
              placeholder={'Enter announcement title'}
            />
            <Input
              inline={false}
              label={'Category'}
              type={'text'}
              name={'category'}
              value={category}
              onChange={this.handleChange}
              placeholder={'e.g., IT Notice, HR Update'}
            />
            <Input
              inline={false}
              label={'Date'}
              type={'text'}
              name={'date'}
              value={date}
              onChange={this.handleChange}
              placeholder={'e.g., Today, March 15 or 2024-03-15'}
            />
            <Input
              inline={false}
              label={'Time'}
              type={'text'}
              name={'time'}
              value={time}
              onChange={this.handleChange}
              placeholder={'e.g., 5:00 PM - 7:00 PM or All Day'}
            />
          </InlineInputGroup>

          <div>
            <label className="block text-sm font-medium mb-2">Priority</label>
            <select
              name="priority"
              value={priority}
              onChange={(e) => this.handleChange('priority', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Type</label>
            <select
              name="type"
              value={type}
              onChange={(e) => this.handleChange('type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="general">General</option>
              <option value="alert">Alert</option>
              <option value="info">Info</option>
              <option value="success">Success</option>
            </select>
          </div>

          <Input
            inline={false}
            label={'Content'}
            placeholder={'Enter the announcement content...'}
            type={'textarea'}
            name={'content'}
            value={content}
            onChange={this.handleChange}
            rows={5}
          />
        </Form>
        
        <div className={'preview-section-container'}>
          <p>Preview</p>
          <div className={'preview-box'}>
            <AnnouncementContent data={previewData} />
          </div>
        </div>
      </div>
    )
  }
}

export default AnnouncementOptions