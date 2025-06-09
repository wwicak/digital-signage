import React, { Component } from 'react'
import { Trash2 } from 'lucide-react'
import { Form, Input, InlineInputGroup, Button } from '../../../components/Form'
import * as z from 'zod'

import ListContent from './ListContent' // IListWidgetData (now inferred) is not directly used here.
import { IListItem } from '../index' // IListItem is interface, IListDefaultData is interface
import { ListItemSchema } from './ListContent' // Import Zod schema for IListItem

// Zod schema for IListDefaultData (used for props.data and state)
export const ListOptionsDataSchema = z.object({
  title: z.string().nullable().optional(),
  color: z.string(), // Required
  textColor: z.string(), // Required
  list: z.array(ListItemSchema), // Required array of ListItemSchema
  ordered: z.boolean().optional(),
  fontSize: z.number().optional(),
})
// type IListOptionsState = z.infer<typeof ListOptionsDataSchema>; // This will be the state type

/*
 * Zod schema for ListOptions props
 * IWidgetOptionsEditorProps<T> has data: T | undefined, onChange: (newData: T) => void
 */
export const ListOptionsPropsSchema = z.object({
  data: ListOptionsDataSchema.optional(),
  onChange: z.function().args(ListOptionsDataSchema).returns(z.void()),
})
export type IListOptionsProps = z.infer<typeof ListOptionsPropsSchema>;

// State for ListOptions will use the Zod-inferred type
type IListOptionsState = z.infer<typeof ListOptionsDataSchema>;

class ListOptions extends Component<IListOptionsProps, IListOptionsState> {
  constructor(props: IListOptionsProps) {
    super(props)
    // Initialize state from props.data, providing defaults
    const {
      title = null,
      color = '#34495e',
      textColor = '#ffffff',
      list = [{ text: '', label: null }],
      ordered = false,
      fontSize = 16,
    } = props.data || {}

    this.state = {
      title,
      color,
      textColor,
      list,
      ordered,
      fontSize,
    }
  }

  componentDidUpdate(prevProps: IListOptionsProps) {
    if (this.props.data !== prevProps.data && this.props.data) {
      // This can cause issues if not handled carefully.
      this.setState({ ...this.props.data })
    }
  }

  // Handles changes for top-level properties like title, color, etc.
  handleChange = (name: string, value: any): void => {
    const updatedPartOfState = { [name]: value }
    this.setState(
      updatedPartOfState as Pick<IListOptionsState, keyof IListOptionsState>,
      () => {
        if (this.props.onChange) {
          // Pass a merged object to be certain about the state being passed
          this.props.onChange({ ...this.state, ...updatedPartOfState })
        }
      }
    )
  }

  // Handles changes for the 'text' of a specific list item (immutable update)
  handleItemTextChange = (index: number, newText: string): void => {
    const newList = this.state.list.map((item, i) =>
      i === index ? { ...item, text: newText } : item
    )
    this.setState({ list: newList }, () => {
      if (this.props.onChange) {
        this.props.onChange(this.state)
      }
    })
  }

  // Handles changes for the 'label' of a specific list item (immutable update)
  handleItemLabelChange = (index: number, newLabel: string): void => {
    const newList = this.state.list.map((item, i) =>
      i === index ? { ...item, label: newLabel || null } : item // Allow empty string to become null label
    )
    this.setState({ list: newList }, () => {
      if (this.props.onChange) {
        this.props.onChange(this.state)
      }
    })
  }

  addItem = (): void => {
    const newItem: IListItem = { text: '', label: null }
    this.setState(
      prevState => ({
        list: [...prevState.list, newItem],
      }),
      () => {
        if (this.props.onChange) {
          this.props.onChange(this.state)
        }
      }
    )
  }

  deleteItem = (indexToDelete: number): void => {
    this.setState(
      prevState => ({
        list: prevState.list.filter((_, index) => index !== indexToDelete),
      }),
      () => {
        if (this.props.onChange) {
          this.props.onChange(this.state)
        }
      }
    )
  }

  render() {
    const {
      title,
      color = '#34495e',
      textColor = '#ffffff',
      list = [],
      ordered = false,
      fontSize = 16,
    } = this.state

    const previewData: import('../index').IListDefaultData = { title, color, textColor, list, ordered, fontSize }

    return (
      <div className={'options-container'}>
        <Form>
          <h3>Widget: List</h3>
          <p>Choose your preferences for the list widget.</p>
          <InlineInputGroup>
            <Input
              inline={false}
              label={'Widget Title (Optional)'}
              type={'text'}
              name={'title'}
              value={title || ''}
              placeholder={'Optional list title...'}
              onChange={this.handleChange}
            />
            <Input
              inline={false}
              label={'Font Size (px)'}
              type={'number'}
              name={'fontSize'}
              value={fontSize}
              onChange={this.handleChange}
            />
          </InlineInputGroup>
          <InlineInputGroup>
            <Input
              inline={false}
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
                label='List Type'
                type='select'
                name='ordered'
                value={ordered ? 'ordered' : 'unordered'}
                choices={[
                    { id: 'unordered', label: 'Unordered (Bullets)' },
                    { id: 'ordered', label: 'Ordered (Numbers)' },
                ]}
                onChange={(name, value) => this.handleChange('ordered', value === 'ordered')}
            />
          </InlineInputGroup>
          <hr className='border-0 w-full mt-4' />
          <span className='font-sans font-semibold block pb-2'>List Items</span>
          <div className='flex-col'> {/* Renamed class */}
            {list.map((item, index) => (
              <InlineInputGroup key={`list-item-edit-${index}`}>
                <Input
                  type='text'
                  inline={false}
                  name={`item-text-${index}`} // Unique name for form handling if needed, though direct index used
                  value={item.text}
                  onChange={(_, value) => this.handleItemTextChange(index, value as string)}
                  placeholder={'Item text...'}
                  expand // Allow text input to expand
                />
                <Input
                  type='text'
                  inline={false}
                  name={`item-label-${index}`}
                  value={item.label || ''} // Handle null label for input
                  onChange={(_, value) => this.handleItemLabelChange(index, value as string)}
                  placeholder={'Optional label...'}
                  expand={false}
                />
                <div className={'deleteBtn'} onClick={() => this.deleteItem(index)} role='button' tabIndex={0} onKeyPress={(e) => {if(e.key === 'Enter' || e.key === ' ') this.deleteItem(index)}} aria-label='Delete item'>
                  <Trash2 className='w-4 h-4 text-gray-500' />
                </div>
              </InlineInputGroup>
            ))}
          </div>
          <Button
            text={' + Add Item'} // Changed text
            color={'#8bc34a'}
            onClick={this.addItem} // Changed name
            style={{ marginTop: 10,alignSelf:'flex-start' }} // Added margin and alignment
          />
        </Form>
        <div className={'preview-section-container'}>
          <p>Preview</p>
          <div className={'preview-box'}>
            <ListContent data={previewData} />
          </div>
        </div>
        
      </div>
    )
  }
}

export default ListOptions