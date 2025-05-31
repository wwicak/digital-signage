import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import SlideshowOptions, { ISlideshowWidgetOptionsProps } from '../../../widgets/slideshow/src/SlideshowOptions';
import { ISlideshowWidgetDefaultData } from '../../../widgets/slideshow/index';
import { ISlideshowData } from '../../../actions/slideshow';

// Mock Form components
jest.mock('../../../components/Form', () => ({
  Form: jest.fn(({ children }) => <form data-testid="mock-form">{children}</form>),
  Input: jest.fn((props: any) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      if (props.onChange) {
        if (props.type === 'checkbox') {
          props.onChange(props.name, (e.target as HTMLInputElement).checked);
        } else {
          props.onChange(props.name, e.target.value);
        }
      }
    };
    if (props.type === 'select') {
      return (
        <div>
          <label htmlFor={props.name}>{props.label}</label>
          <select data-testid={`mock-input-${props.name}`} name={props.name} value={props.value || ''} onChange={handleChange} disabled={props.disabled}>
            {props.choices?.map((choice: { id: string, label: string }) => (
              <option key={choice.id} value={choice.id}>{choice.label}</option>
            ))}
          </select>
        </div>
      );
    }
    if (props.type === 'checkbox') {
        return (
            <div>
                <label htmlFor={props.name}>{props.label}</label>
                <input
                    data-testid={`mock-input-${props.name}`}
                    type="checkbox"
                    name={props.name}
                    checked={!!props.checked}
                    onChange={handleChange}
                />
            </div>
        )
    }
    return (
      <div>
        <label htmlFor={props.name}>{props.label}</label>
        <input
          data-testid={`mock-input-${props.name}`}
          type={props.type}
          name={props.name}
          value={(props.type === 'number' && props.value !== undefined) ? String(props.value) : (props.value || '')}
          onChange={handleChange}
          min={props.min}
          step={props.step}
        />
      </div>
    );
  }),
  InlineInputGroup: jest.fn(({ children }) => <div data-testid="mock-inline-input-group">{children}</div>),
}));

// Mock getSlideshows action
const actualMockGetSlideshows = jest.fn();
jest.mock('../../../actions/slideshow', () => ({
  ...jest.requireActual('../../../actions/slideshow'),
  getSlideshows: (...args: any[]) => actualMockGetSlideshows(...args),
}));

describe('SlideshowOptions', () => {
  const mockOnChange = jest.fn();
  const mockAvailableSlideshows: ISlideshowData[] = [
    { _id: 'ss1', name: 'Summer Collection', slides: [], is_enabled: true },
    { _id: 'ss2', name: 'Winter Sale', slides: [], is_enabled: true },
  ];

  const defaultWidgetData: ISlideshowWidgetDefaultData = {
    slideshow_id: 'ss1',
    show_progressbar: true,
    transition_time: 2,
    random_order: false,
  };

  const renderSlideshowOptions = (data?: Partial<ISlideshowWidgetDefaultData>) => {
    const mergedData = { ...defaultWidgetData, ...data };
    return render(<SlideshowOptions data={mergedData} onChange={mockOnChange} />);
  };

  beforeEach(() => {
    mockOnChange.mockClear();
    actualMockGetSlideshows.mockClear();
    (jest.requireMock('../../../components/Form').Input as jest.Mock).mockClear();
  });

  test('fetches and displays available slideshows', async () => {
    actualMockGetSlideshows.mockResolvedValueOnce(mockAvailableSlideshows);
    renderSlideshowOptions();

    expect(actualMockGetSlideshows).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.getByTestId('mock-input-slideshow_id').querySelector('option[value="ss1"]')).toBeInTheDocument();
      expect(screen.getByTestId('mock-input-slideshow_id').querySelector('option[value="ss2"]')).toBeInTheDocument();
    });
    // Check that the current slideshow_id is selected
    expect(screen.getByTestId('mock-input-slideshow_id')).toHaveValue('ss1');
  });

  test('handles error when fetching slideshows', async () => {
    actualMockGetSlideshows.mockRejectedValueOnce(new Error('Failed to fetch'));
    renderSlideshowOptions();
    await waitFor(() => {
        expect(screen.getByText('Error: Could not load slideshow list.')).toBeInTheDocument();
    });
  });

  test('renders all configuration fields with initial values', async () => {
    actualMockGetSlideshows.mockResolvedValueOnce(mockAvailableSlideshows);
    renderSlideshowOptions();
    await waitFor(() => expect(screen.getByTestId('mock-input-slideshow_id')).toBeInTheDocument());

    expect(screen.getByTestId('mock-input-slideshow_id')).toHaveValue(defaultWidgetData.slideshow_id!);
    // input.value is always a string, so compare with string version of the number.
    expect((screen.getByTestId('mock-input-transition_time') as HTMLInputElement).value).toBe(defaultWidgetData.transition_time!.toString());
    expect(screen.getByTestId('mock-input-show_progressbar')).toBeChecked();
    expect(screen.getByTestId('mock-input-random_order')).not.toBeChecked();
  });

  test('calls onChange when slideshow_id is changed', async () => {
    actualMockGetSlideshows.mockResolvedValueOnce(mockAvailableSlideshows);
    renderSlideshowOptions();
    await waitFor(() => expect(screen.getByTestId('mock-input-slideshow_id')).toBeInTheDocument());

    fireEvent.change(screen.getByTestId('mock-input-slideshow_id'), { target: { value: 'ss2' } });
    expect(mockOnChange).toHaveBeenCalledWith({ ...defaultWidgetData, slideshow_id: 'ss2' });
  });

  test('calls onChange when transition_time is changed', async () => {
    actualMockGetSlideshows.mockResolvedValueOnce(mockAvailableSlideshows);
    renderSlideshowOptions();
    await waitFor(() => expect(screen.getByTestId('mock-input-slideshow_id')).toBeInTheDocument());

    fireEvent.change(screen.getByTestId('mock-input-transition_time'), { target: { value: '3.5' } });
    expect(mockOnChange).toHaveBeenCalledWith({ ...defaultWidgetData, transition_time: '3.5' }); // Input value is string
  });

  test('calls onChange when show_progressbar is changed', async () => {
    actualMockGetSlideshows.mockResolvedValueOnce(mockAvailableSlideshows);
    renderSlideshowOptions();
    await waitFor(() => expect(screen.getByTestId('mock-input-slideshow_id')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('mock-input-show_progressbar')); // Current value is true, click makes it false
    expect(mockOnChange).toHaveBeenCalledWith({ ...defaultWidgetData, show_progressbar: false });
  });

  test('calls onChange when random_order is changed', async () => {
    actualMockGetSlideshows.mockResolvedValueOnce(mockAvailableSlideshows);
    renderSlideshowOptions();
    await waitFor(() => expect(screen.getByTestId('mock-input-slideshow_id')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('mock-input-random_order')); // Current value is false, click makes it true
    expect(mockOnChange).toHaveBeenCalledWith({ ...defaultWidgetData, random_order: true });
  });

  test('initializes with default values if props.data is not provided or partial', async () => {
    actualMockGetSlideshows.mockResolvedValueOnce(mockAvailableSlideshows);
    render(<SlideshowOptions onChange={mockOnChange} />); // No data prop
    await waitFor(() => expect(screen.getByTestId('mock-input-slideshow_id')).toBeInTheDocument());

    const InputMock = jest.requireMock('../../../components/Form').Input;
    // Check that inputs are called with component's internal defaults or empty/null for missing fields
    expect(InputMock).toHaveBeenCalledWith(expect.objectContaining({ name: 'slideshow_id', value: '' }), {}); // slideshow_id defaults to null, select value becomes ''
    expect(InputMock).toHaveBeenCalledWith(expect.objectContaining({ name: 'transition_time', value: 1 }), {});
    expect(InputMock).toHaveBeenCalledWith(expect.objectContaining({ name: 'show_progressbar', checked: true }), {});
    expect(InputMock).toHaveBeenCalledWith(expect.objectContaining({ name: 'random_order', checked: false }), {});
  });

});
