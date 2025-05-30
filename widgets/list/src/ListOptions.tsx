import React, { Component } from 'react';
import { Form, Input, InlineInputGroup, Button, IInputProps, IChoice } from '../../../components/Form';
import { IWidgetOptionsEditorProps } from '../../../components/Admin/WidgetEditDialog';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { IconProp } from '@fortawesome/fontawesome-svg-core';

import ListContent, { IListWidgetData } from './ListContent'; // IListWidgetData is effectively IListDefaultData
import { IListDefaultData, IListItem } from '../index'; // Actual default data structure and list item type

export interface IListOptionsProps extends IWidgetOptionsEditorProps<IListDefaultData> {}

// State for ListOptions will hold the fields of IListDefaultData
type IListOptionsState = IListDefaultData;

class ListOptions extends Component<IListOptionsProps, IListOptionsState> {
  constructor(props: IListOptionsProps) {
    super(props);
    // Initialize state from props.data, providing defaults
    const {
      title = null,
      color = '#34495e',
      textColor = '#ffffff',
      list = [{ text: '', label: null }],
      ordered = false,
      fontSize = 16,
    } = props.data || {};

    this.state = {
      title,
      color,
      textColor,
      list,
      ordered,
      fontSize,
    };
  }

  componentDidUpdate(prevProps: IListOptionsProps) {
    if (this.props.data !== prevProps.data && this.props.data) {
      // This can cause issues if not handled carefully.
      this.setState({ ...this.props.data });
    }
  }

  // Handles changes for top-level properties like title, color, etc.
  handleChange = (name: keyof Omit<IListOptionsState, 'list'>, value: any): void => {
    this.setState(
      { [name]: value } as Pick<IListOptionsState, keyof IListOptionsState>,
      () => {
        if (this.props.onChange) {
          this.props.onChange(this.state);
        }
      }
    );
  };

  // Handles changes for the 'text' of a specific list item (immutable update)
  handleItemTextChange = (index: number, newText: string): void => {
    const newList = this.state.list.map((item, i) => 
      i === index ? { ...item, text: newText } : item
    );
    this.setState({ list: newList }, () => {
      if (this.props.onChange) {
        this.props.onChange(this.state);
      }
    });
  };

  // Handles changes for the 'label' of a specific list item (immutable update)
  handleItemLabelChange = (index: number, newLabel: string): void => {
    const newList = this.state.list.map((item, i) =>
      i === index ? { ...item, label: newLabel || null } : item // Allow empty string to become null label
    );
    this.setState({ list: newList }, () => {
      if (this.props.onChange) {
        this.props.onChange(this.state);
      }
    });
  };

  addItem = (): void => {
    const newItem: IListItem = { text: '', label: null };
    this.setState(
      prevState => ({
        list: [...prevState.list, newItem],
      }),
      () => {
        if (this.props.onChange) {
          this.props.onChange(this.state);
        }
      }
    );
  };

  deleteItem = (indexToDelete: number): void => {
    this.setState(
      prevState => ({
        list: prevState.list.filter((_, index) => index !== indexToDelete),
      }),
      () => {
        if (this.props.onChange) {
          this.props.onChange(this.state);
        }
      }
    );
  };

  render() {
    const {
      title,
      color = '#34495e',
      textColor = '#ffffff',
      list = [],
      ordered = false,
      fontSize = 16,
    } = this.state;

    const previewData: IListWidgetData = { title, color, textColor, list, ordered, fontSize };

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
                label="List Type"
                type="select"
                name="ordered"
                value={ordered ? 'ordered' : 'unordered'}
                choices={[
                    { id: 'unordered', label: 'Unordered (Bullets)' },
                    { id: 'ordered', label: 'Ordered (Numbers)' },
                ]}
                onChange={(name, value) => this.handleChange('ordered', value === 'ordered')}
            />
          </InlineInputGroup>
          <hr className='separator' />
          <span className='subheader'>List Items</span>
          <div className='list-items-editor'> {/* Renamed class */}
            {list.map((item, index) => (
              <InlineInputGroup key={`list-item-edit-${index}`}>
                <Input
                  inline={false}
                  name={`item-text-${index}`} // Unique name for form handling if needed, though direct index used
                  value={item.text}
                  onChange={(_, value) => this.handleItemTextChange(index, value as string)}
                  placeholder={'Item text...'}
                  expand // Allow text input to expand
                />
                <Input
                  inline={false}
                  name={`item-label-${index}`}
                  value={item.label || ''} // Handle null label for input
                  onChange={(_, value) => this.handleItemLabelChange(index, value as string)}
                  placeholder={'Optional label...'}
                  expand={false}
                />
                <div className={'deleteBtn'} onClick={() => this.deleteItem(index)} role="button" tabIndex={0} onKeyPress={(e) => {if(e.key === 'Enter' || e.key === ' ') this.deleteItem(index);}} aria-label="Delete item">
                  <FontAwesomeIcon
                    icon={faTrash as IconProp}
                    fixedWidth
                    color='#828282'
                  />
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
        <style jsx>
          {`
            h3,
            p {
              font-family: 'Open Sans', sans-serif;
            }
            .options-container {
              display: flex;
              flex-direction: row;
              width: 100%;
            }
            .options-container > :global(form) {
                flex: 1;
                padding-right: 16px;
            }
            .preview-box {
              display: block;
              width: 240px;
              height: 240px;
              border-radius: 6px;
              overflow: hidden;
              border: 1px solid #ccc;
            }
            .preview-section-container {
              margin-left: 16px;
              width: 240px;
              flex-shrink: 0;
            }
            .deleteBtn {
              padding: 8px;
              display: flex;
              /* flex-direction: column; */ /* Not needed for single icon */
              /* min-height: 40px; */ /* Not needed */
              justify-content: center;
              align-items: center;
              cursor: pointer;
              margin-left: 8px; /* Space from input */
            }
            .separator {
              border: none;
              border-bottom: 1px solid #ededed;
              width: 100%;
              margin-top: 16px; /* Space above separator */
            }
            .subheader {
              /* margin-right: 16px; */ /* Not needed if full width */
              color: #666666;
              font-family: 'Open Sans', sans-serif;
              font-weight: 600;
              display: block; /* Make it block for full width */
              padding-top: 16px;
              padding-bottom: 8px; /* Reduced bottom padding */
            }
            .list-items-editor { /* Renamed */
                display: flex;
                flex-direction: column;
                gap: 8px; /* Space between item rows */
            }
          `}
        </style>
      </div>
    );
  }
}

export default ListOptions;
