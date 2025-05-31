import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import * as z from 'zod';

// Import the schema from the new types.ts file for use in this test file
import { CongratsWidgetContentDataSchema, ICongratsWidgetData } from './types';

// Import the component to be tested
import CongratsOptions, { ICongratsOptionsProps } from './CongratsOptions';


// Mock child components used by CongratsOptions
jest.mock('../../../components/Form', () => ({
  __esModule: true,
  Form: jest.fn(({ children }) => <form data-testid="mock-form">{children}</form>),
  Input: jest.fn(({ label, name, value, onChange, type, placeholder, rows, choices, expand }) => {
    const inputType = type === 'textarea' ? 'textarea' : type === 'color' ? 'color' : type === 'select' ? 'select' : 'text';
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      onChange(name, type === 'number' ? parseFloat(e.target.value) : e.target.value);
    };

    if (inputType === 'textarea') {
      return (
        <div>
          <label htmlFor={name}>{label}</label>
          <textarea data-testid={`mock-input-${name}`} name={name} value={value || ''} onChange={handleChange} placeholder={placeholder} rows={rows} />
        </div>
      );
    }
    if (inputType === 'select') {
        return (
            <div>
                <label htmlFor={name}>{label}</label>
                <select data-testid={`mock-input-${name}`} name={name} value={value || ''} onChange={handleChange}>
                    {choices?.map((choice: {id: string, label: string}) => (
                        <option key={choice.id} value={choice.id}>{choice.label}</option>
                    ))}
                </select>
            </div>
        )
    }
    return (
      <div>
        <label htmlFor={name}>{label}</label>
        <input data-testid={`mock-input-${name}`} type={inputType} name={name} value={value || ''} onChange={handleChange} placeholder={placeholder} />
      </div>
    );
  }),
  InlineInputGroup: jest.fn(({ children }) => <div data-testid="mock-inline-input-group">{children}</div>),
}));

const mockCongratsContentDataForPreview: Partial<ICongratsWidgetData> = {};
jest.mock('./CongratsContent', () => {
    // This is the mock for the CongratsContent component used in the PREVIEW section of CongratsOptions
    const MockCongratsContentPreview = ({ data }: { data: ICongratsWidgetData }) => {
        Object.assign(mockCongratsContentDataForPreview, data);
        return (
            <div data-testid="mock-congrats-content-preview">
            <p data-testid="preview-text">{data.text}</p>
            <p data-testid="preview-animation">{data.animation}</p>
            <p data-testid="preview-color">{data.color}</p>
            <p data-testid="preview-fontSize">{data.fontSize?.toString()}</p>
            </div>
        );
    };
    MockCongratsContentPreview.displayName = "MockCongratsContentPreview";
    return {
        __esModule: true,
        default: MockCongratsContentPreview,
        // The actual CongratsOptions.tsx imports its schema from ./types.ts now,
        // so the mock for CongratsContent doesn't need to provide it.
    };
});


const mockOnChange = jest.fn();

const baseTestData: ICongratsWidgetData = {
  text: 'Initial Text',
  color: '#121212',
  textColor: '#ababab',
  animation: 'confetti',
  fontSize: 24,
  recipient: 'Initial Recipient',
  // title: 'Initial Title',  // Removed title
};

const renderCongratsOptions = (props?: Partial<ICongratsOptionsProps>) => {
  const currentData = props?.data === undefined ? baseTestData : (Object.keys(props.data).length === 0 ? {} : props.data);
  const combinedProps: ICongratsOptionsProps = {
    data: currentData as ICongratsWidgetData,
    onChange: mockOnChange,
    ...props,
  };
  return render(<CongratsOptions {...combinedProps} />);
};

describe('CongratsOptions Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    for (const key in mockCongratsContentDataForPreview) {
        delete (mockCongratsContentDataForPreview as any)[key];
    }
  });

  test('renders input fields with initial values from props.data', () => {
    renderCongratsOptions({ data: baseTestData });
    expect(screen.getByTestId('mock-input-color')).toHaveValue(baseTestData.color);
    expect(screen.getByTestId('mock-input-textColor')).toHaveValue(baseTestData.textColor);
    expect(screen.getByTestId('mock-input-animation')).toHaveValue(baseTestData.animation);
    expect(screen.getByTestId('mock-input-fontSize')).toHaveValue(baseTestData.fontSize?.toString());
    expect(screen.getByTestId('mock-input-text')).toHaveValue(baseTestData.text);
    expect(screen.getByTestId('mock-input-recipient')).toHaveValue(baseTestData.recipient);
    // expect(screen.getByTestId('mock-input-title')).toHaveValue(baseTestData.title); // Removed title
  });

  test('renders input fields with default values if props.data is empty object', () => {
    renderCongratsOptions({ data: {} as any });
    expect(screen.getByTestId('mock-input-color')).toHaveValue('#34495e');
    expect(screen.getByTestId('mock-input-textColor')).toHaveValue('#ffffff');
    expect(screen.getByTestId('mock-input-animation')).toHaveValue('confetti');
    expect(screen.getByTestId('mock-input-fontSize')).toHaveValue('16');
    expect(screen.getByTestId('mock-input-text')).toHaveValue('Congratulations!');
    expect(screen.getByTestId('mock-input-recipient')).toHaveValue('');
    // expect(screen.getByTestId('mock-input-title')).toHaveValue('Announcement'); // Default from component's constructor // Removed title
  });

  test('renders input fields with default values if props.data is undefined', () => {
    renderCongratsOptions({ data: undefined });
    expect(screen.getByTestId('mock-input-color')).toHaveValue('#34495e');
    expect(screen.getByTestId('mock-input-textColor')).toHaveValue('#ffffff');
    expect(screen.getByTestId('mock-input-animation')).toHaveValue('confetti');
    expect(screen.getByTestId('mock-input-fontSize')).toHaveValue('16');
    expect(screen.getByTestId('mock-input-text')).toHaveValue('Congratulations!');
    expect(screen.getByTestId('mock-input-recipient')).toHaveValue('');
    // expect(screen.getByTestId('mock-input-title')).toHaveValue('Announcement'); // Removed title
  });

  const testCases = [
    { name: 'text', testId: 'mock-input-text', value: 'New Congrats Text', expectedStateKey: 'text' },
    { name: 'color', testId: 'mock-input-color', value: '#000000', expectedStateKey: 'color' },
    { name: 'textColor', testId: 'mock-input-textColor', value: '#111111', expectedStateKey: 'textColor' },
    { name: 'animation', testId: 'mock-input-animation', value: 'balloons', expectedStateKey: 'animation' },
    { name: 'fontSize', testId: 'mock-input-fontSize', value: '30', expectedStateKey: 'fontSize', parsedValue: 30 },
    { name: 'recipient', testId: 'mock-input-recipient', value: 'New Recipient', expectedStateKey: 'recipient' },
    // { name: 'title', testId: 'mock-input-title', value: 'Custom Title Here', expectedStateKey: 'title' }, // Removed title
  ];

  testCases.forEach(({ name, testId, value, expectedStateKey, parsedValue }) => {
    test(`calls onChange with updated data when ${name} input changes`, async () => {
      const componentConstructorDefaults = {
        animation: 'confetti', text: 'Congratulations!', color: '#34495e',
        fontSize: 16, textColor: '#ffffff', recipient: '', // Removed title from here
      };
      renderCongratsOptions({data: {} as any});

      const inputElement = screen.getByTestId(testId);
      fireEvent.change(inputElement, { target: { value } });

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledTimes(1);
        const expectedData = {
          ...componentConstructorDefaults,
          [expectedStateKey]: parsedValue !== undefined ? parsedValue : value,
        };
        expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining(expectedData));
      });
    });
  });

  test('updates preview when data changes', async () => {
    renderCongratsOptions({ data: baseTestData });

    const newText = "Updated preview text";
    const newAnimation = "balloons";
    const newFontSize = 40;

    fireEvent.change(screen.getByTestId('mock-input-text'), { target: { value: newText } });
    await waitFor(() => expect(mockCongratsContentDataForPreview.text).toBe(newText));

    fireEvent.change(screen.getByTestId('mock-input-animation'), { target: { value: newAnimation } });
    await waitFor(() => expect(mockCongratsContentDataForPreview.animation).toBe(newAnimation));

    fireEvent.change(screen.getByTestId('mock-input-fontSize'), { target: { value: newFontSize.toString() } });
    await waitFor(() => expect(mockCongratsContentDataForPreview.fontSize).toBe(newFontSize));
  });

  test('componentDidUpdate updates state if props.data changes', () => {
    const initialData = { ...baseTestData, text: "Initial Text For Rerender" };
    const { rerender } = renderCongratsOptions({ data: initialData });

    const newData: ICongratsWidgetData = {
      ...initialData,
      text: "Updated via props",
      animation: "balloons",
      fontSize: 50,
      color: "#987654",
      // title: "Updated Title via Props", // Removed title
    };

    rerender(<CongratsOptions data={newData} onChange={mockOnChange} />);

    expect(screen.getByTestId('mock-input-text')).toHaveValue(newData.text);
    expect(screen.getByTestId('mock-input-animation')).toHaveValue(newData.animation);
    expect(screen.getByTestId('mock-input-fontSize')).toHaveValue(newData.fontSize?.toString());
    expect(screen.getByTestId('mock-input-color')).toHaveValue(newData.color?.toLowerCase());
    // expect(screen.getByTestId('mock-input-title')).toHaveValue(newData.title); // Removed title

    expect(mockCongratsContentDataForPreview.text).toBe(newData.text!);
    expect(mockCongratsContentDataForPreview.animation).toBe(newData.animation!);
    expect(mockCongratsContentDataForPreview.fontSize).toBe(newData.fontSize!);
    expect(mockCongratsContentDataForPreview.color).toBe(newData.color!);
    // expect(mockCongratsContentDataForPreview.title).toBe(newData.title!); // Removed title
  });

  test('animation select has correct choices', () => {
    renderCongratsOptions();
    const animationSelect = screen.getByTestId('mock-input-animation');
    expect(animationSelect.children).toHaveLength(2);
    expect(animationSelect.querySelector('option[value="confetti"]')).toHaveTextContent('Confetti');
    expect(animationSelect.querySelector('option[value="balloons"]')).toHaveTextContent('Balloons');
  });
});
