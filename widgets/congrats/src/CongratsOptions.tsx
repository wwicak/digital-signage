import React, { Component } from 'react';
import { Form, Input, InlineInputGroup, IInputProps, IChoice } from '../../../components/Form';
import { IWidgetOptionsEditorProps } from '../../../components/Admin/WidgetEditDialog';
// Import the schema from the new types.ts file
import * as z from 'zod'; // z is still needed for CongratsOptionsPropsSchema
import { CongratsWidgetContentDataSchema, ICongratsWidgetData } from './types';
import CongratsContent from './CongratsContent'; // CongratsContent is for preview.

// Zod schema for CongratsOptions props
export const CongratsOptionsPropsSchema = z.object({
  data: CongratsWidgetContentDataSchema.optional(), // Use the imported schema
  onChange: z.function().args(CongratsWidgetContentDataSchema).returns(z.void()), // Use the imported schema
});
export type ICongratsOptionsProps = z.infer<typeof CongratsOptionsPropsSchema>;

// State for CongratsOptions will also use ICongratsWidgetData (inferred from CongratsWidgetContentDataSchema)
type ICongratsOptionsState = ICongratsWidgetData;

// Define available animation choices
const animationChoices: IChoice[] = [
  { id: 'confetti', label: 'Confetti' },
  { id: 'balloons', label: 'Balloons' },
  // Add other animation choices here if they exist in ./animations/
  // e.g. { id: 'fireworks', label: 'Fireworks' },
];

class CongratsOptions extends Component<ICongratsOptionsProps, ICongratsOptionsState> {
  constructor(props: ICongratsOptionsProps) {
    super(props);
    // Initialize state from props.data, providing defaults
    const {
      animation = 'confetti',
      text = 'Congratulations!',
      fontSize = 16,
      color = '#34495e',
      textColor = '#ffffff',
      recipient = '', // From ICongratsWidgetData
    } = props.data || {};

    this.state = {
      animation,
      text,
      color,
      fontSize,
      textColor,
      recipient,
    };
  }

  componentDidUpdate(prevProps: ICongratsOptionsProps) {
    if (this.props.data !== prevProps.data) {
      // This can cause issues if not handled carefully.
      // A common pattern is to only use props.data for initial state,
      // or to use a key prop on this component to force re-mount if data source changes.
      this.setState({ ...this.props.data });
    }
  }

  handleChange = (name: string, value: any): void => {
    this.setState(
      { [name]: value } as Pick<ICongratsOptionsState, keyof ICongratsOptionsState>,
      () => {
        if (this.props.onChange) {
          this.props.onChange(this.state);
        }
      }
    );
  };

  render() {
    // Provide fallbacks for rendering if state values are somehow undefined
    const {
      animation = 'confetti',
      text = 'Congratulations!',
      color = '#34495e',
      fontSize = 16,
      textColor = '#ffffff',
      recipient = '', // Though not used in an input, it's part of the state/data
    } = this.state;
    
    const previewData: ICongratsWidgetData = { animation, text, color, fontSize, textColor, recipient };

    return (
      <div className={'options-container'}>
        <Form>
          <h3>Widget: Congratulations</h3>
          <p>Choose your preferences for the congratulations widget.</p>
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
              label={'Animation'}
              type={'select'}
              name={'animation'}
              value={animation}
              choices={animationChoices}
              onChange={this.handleChange}
              expand={false} // Assuming this prop means the select doesn't take full width in group
            />
            <Input
              inline={false}
              label={'Font Size (px)'}
              type={'number'}
              name={'fontSize'}
              value={fontSize}
              onChange={this.handleChange}
              expand={false} // Assuming this prop means it doesn't take full width
            />
          </InlineInputGroup>

          <Input
            inline={false}
            label={'Text to be Displayed'}
            type={'textarea'}
            name={'text'}
            value={text}
            onChange={this.handleChange}
            rows={3} // Example: make textarea a bit smaller than announcement's
          />
          {/* Optional: Input for recipient if it should be configurable */}
          <Input
            inline={false}
            label={'Recipient (optional)'}
            type={'text'}
            name={'recipient'}
            value={recipient}
            placeholder="Enter recipient's name..."
            onChange={this.handleChange}
          />
        </Form>
        <div className={'preview-section-container'}>
          <p>Preview</p>
          <div className={'preview-box'}>
            <CongratsContent data={previewData} />
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
            .options-container > :global(form) { /* Target Form component */
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
          `}
        </style>
      </div>
    );
  }
}

export default CongratsOptions;
