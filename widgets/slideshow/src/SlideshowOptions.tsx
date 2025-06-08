import React, { Component } from 'react'
import { Form, Input, InlineInputGroup } from '../../../components/Form'
import { getSlideshows, ISlideshowData } from '../../../actions/slideshow' // ISlideshowData is z.infer<SlideshowActionDataSchema>
import * as z from 'zod'

import { ISlideshowWidgetDefaultData } from '../index' // This is an interface
import { SlideshowWidgetDefaultDataSchema } from './Slideshow' // Import the Zod schema defined in Slideshow.tsx

// Zod schema for IAvailableSlideshowChoice (used in state)
export const AvailableSlideshowChoiceSchema = z.object({
  id: z.string(),
  label: z.string(),
})
export type IAvailableSlideshowChoice = z.infer<typeof AvailableSlideshowChoiceSchema>;

// Zod schema for SlideshowOptions state
export const SlideshowWidgetOptionsStateSchema = z.object({
  availableSlideshows: z.array(AvailableSlideshowChoiceSchema),
  loadingError: z.string().nullable(),
})
type ISlideshowWidgetOptionsState = z.infer<typeof SlideshowWidgetOptionsStateSchema>;

/*
 * Zod schema for SlideshowOptions props
 * IWidgetOptionsEditorProps<T> has data: T | undefined, onChange: (newData: T) => void
 */
export const SlideshowOptionsPropsSchema = z.object({
  data: SlideshowWidgetDefaultDataSchema.optional(),
  onChange: z.function().args(SlideshowWidgetDefaultDataSchema).returns(z.void()),
})
export type ISlideshowWidgetOptionsProps = z.infer<typeof SlideshowOptionsPropsSchema>;

class SlideshowOptions extends Component<ISlideshowWidgetOptionsProps, ISlideshowWidgetOptionsState> {
  constructor(props: ISlideshowWidgetOptionsProps) {
    super(props)
    this.state = {
      availableSlideshows: [],
      loadingError: null,
    }
  }

  componentDidMount() {
    getSlideshows()
      .then(data => {
        const slideshowChoices: IAvailableSlideshowChoice[] = data.map((slideshow: ISlideshowData) => ({
          id: slideshow._id, // Ensure this matches what the Input select expects for 'id'
          label: slideshow.name || 'Untitled Slideshow',
        }))
        this.setState({ availableSlideshows: slideshowChoices, loadingError: null })
      })
      .catch(error => {
        console.error('Failed to fetch slideshows for options:', error)
        this.setState({ loadingError: 'Could not load slideshow list.' })
      })
  }

  // Handles changes for any field in ISlideshowWidgetDefaultData
  handleChange = (name: string, value: any): void => {
    const { onChange, data: currentWidgetData } = this.props
    if (onChange) {
      // Create a new data object based on current props.data, then update the changed field
      const newData: ISlideshowWidgetDefaultData = {
        slideshow_id: null, // Default structure
        show_progressbar: true,
        transition_time: 1,
        random_order: false,
        ...currentWidgetData, // Spread existing data first
        [name]: value,        // Then apply the change
      }
      onChange(newData)
    }
  }

  render() {
    // Current widget data comes from props, managed by WidgetEditDialog
    const { data: currentWidgetData } = this.props
    const { availableSlideshows, loadingError } = this.state

    /*
     * Provide default values from ISlideshowWidgetDefaultData if currentWidgetData is null/undefined
     * or if specific fields are missing (though a complete object should be passed by WidgetEditDialog)
     */
    const {
        slideshow_id = null,
        show_progressbar = true,
        transition_time = 1,
        random_order = false,
    } = currentWidgetData || {}

    if (loadingError) {
      return <div style={{ color: 'red' }}>Error: {loadingError}</div>
    }

    return (
      <Form>
        <h3>Widget: Slideshow</h3>
        <p>Select which slideshow you would like this widget to display and other preferences.</p>
        <Input
          inline={false}
          type={'select'}
          name={'slideshow_id'}
          label={'Choose Slideshow'}
          value={slideshow_id || ''} // Ensure value is not null for select; empty string if no selection
          onChange={this.handleChange}
          choices={availableSlideshows}
          disabled={availableSlideshows.length === 0} // Disable if no slideshows loaded
        />
        <InlineInputGroup>
            <Input
                type='number'
                name='transition_time'
                label='Transition Time (sec)'
                value={transition_time}
                onChange={this.handleChange}
                min={0} // Example validation
                step={0.1}
            />
            <Input
                type='checkbox'
                name='show_progressbar'
                label='Show Progress Bar'
                checked={show_progressbar}
                onChange={(name, checked) => this.handleChange(name as keyof ISlideshowWidgetDefaultData, checked)}
            />
            <Input
                type='checkbox'
                name='random_order'
                label='Random Slide Order'
                checked={random_order}
                onChange={(name, checked) => this.handleChange(name as keyof ISlideshowWidgetDefaultData, checked)}
            />
        </InlineInputGroup>
        
      </Form>
    )
  }
}

export default SlideshowOptions