import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'; // Import act
import '@testing-library/jest-dom';

import ImageOptions, { IImageOptionsProps } from '../../../widgets/image/src/ImageOptions';
import { IImageDefaultData, TImageFit } from '../../../widgets/image/index';

// Mock Form components
jest.mock('../../../components/Form', () => ({
  Form: jest.fn(({ children }) => <form data-testid="mock-form">{children}</form>),
  Input: jest.fn((props: any) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      // Simulate file input providing a File object or a string for URL
      if (props.type === 'photo' && e.target instanceof HTMLInputElement && e.target.files && e.target.files.length > 0) {
        props.onChange(props.name, e.target.files[0]);
      } else {
        // For other input types or if no file is selected on a photo/file input, pass the value.
        props.onChange(props.name, e.target.value);
      }
    };
    if (props.type === 'select') {
      return (
        <div>
          <label htmlFor={props.name}>{props.label}</label>
          <select data-testid={`mock-input-${props.name}`} name={props.name} value={props.value} onChange={handleChange}>
            {props.choices?.map((choice: { id: string, label: string }) => (
              <option key={choice.id} value={choice.id}>{choice.label}</option>
            ))}
          </select>
        </div>
      );
    }
    return (
      <div>
        <label htmlFor={props.name}>{props.label}</label>
        <input
          data-testid={`mock-input-${props.name}`}
          type={props.type === 'photo' ? 'file' : props.type} // photo input is file type
          name={props.name}
          value={props.type !== 'photo' ? props.value || '' : undefined} // File inputs don't have controlled value like this
          placeholder={props.placeholder}
          onChange={handleChange}
        />
      </div>
    );
  }),
  InlineInputGroup: jest.fn(({ children }) => <div data-testid="mock-inline-input-group">{children}</div>),
})); // Correctly close the jest.mock for Form

// Mock the specific action module and the function
jest.mock('../../../actions/slide', () => {
  const originalModule = jest.requireActual('../../../actions/slide');
  return {
    __esModule: true,
    ...originalModule,
    standaloneUpload: jest.fn(), // standaloneUpload will be a jest.fn()
  };
});

// Import after mocks
import { standaloneUpload } from '../../../actions/slide';

// Cast the imported function to jest.Mock to access mock methods
const mockStandaloneUpload = standaloneUpload as jest.Mock;

describe('ImageOptions', () => {
  const mockOnChange = jest.fn();
  const defaultData: IImageDefaultData = {
    title: 'Initial Title',
    url: 'http://example.com/initial.jpg',
    fit: 'contain',
    color: '#111111',
    altText: 'Initial Alt Text',
  };

  const renderImageOptions = (data?: IImageDefaultData) => {
    return render(<ImageOptions data={data || defaultData} onChange={mockOnChange} />);
  };

  beforeEach(() => {
    mockOnChange.mockClear();
    mockStandaloneUpload.mockReset(); // Reset the new mock
    (jest.requireMock('../../../components/Form').Input as jest.Mock).mockClear();
  });

  test('renders input fields with initial values', () => {
    renderImageOptions();
    expect(screen.getByTestId('mock-input-color')).toHaveValue(defaultData.color);
    expect(screen.getByTestId('mock-input-title')).toHaveValue(defaultData.title);
    // For 'photo' type input, value is not set directly like this. We check if Input mock received it.
    // expect(screen.getByTestId('mock-input-upload')).toHaveValue(defaultData.url);
    expect(jest.requireMock('../../../components/Form').Input).toHaveBeenCalledWith(expect.objectContaining({name: 'upload', value: defaultData.url}), {});
    expect(screen.getByTestId('mock-input-fit')).toHaveValue(defaultData.fit);
    expect(screen.getByTestId('mock-input-altText')).toHaveValue(defaultData.altText);
  });

  test('calls onChange with updated data for title change', () => {
    renderImageOptions();
    const newTitle = 'New Title';
    fireEvent.change(screen.getByTestId('mock-input-title'), { target: { value: newTitle } });
    expect(mockOnChange).toHaveBeenCalledWith({ ...defaultData, title: newTitle });
  });

  test('calls onChange with updated data for color change', () => {
    renderImageOptions();
    const newColor = '#222222';
    fireEvent.change(screen.getByTestId('mock-input-color'), { target: { value: newColor } });
    expect(mockOnChange).toHaveBeenCalledWith({ ...defaultData, color: newColor });
  });

  test('calls onChange with updated data for fit change', () => {
    renderImageOptions();
    const newFit: TImageFit = 'cover';
    fireEvent.change(screen.getByTestId('mock-input-fit'), { target: { value: newFit } });
    expect(mockOnChange).toHaveBeenCalledWith({ ...defaultData, fit: newFit });
  });

  test('calls onChange with updated data for altText change', () => {
    renderImageOptions();
    const newAltText = 'New Alt Text';
    fireEvent.change(screen.getByTestId('mock-input-altText'), { target: { value: newAltText } });
    expect(mockOnChange).toHaveBeenCalledWith({ ...defaultData, altText: newAltText });
  });

  test('calls onChange with new URL if user types/pastes URL into photo input', async () => {
    renderImageOptions();
    const newUrl = 'http://example.com/pasted.jpg';

    const InputMock = jest.requireMock('../../../components/Form').Input as jest.Mock;
    // Find the props passed to the 'upload' input mock instance
    const uploadInputCall = InputMock.mock.calls.find(call => call[0].name === 'upload');
    const uploadInputProps = uploadInputCall?.[0];

    if (uploadInputProps && uploadInputProps.onChange) {
      await act(async () => { // Wrap state-updating call in act
        uploadInputProps.onChange('upload', newUrl);
      });
    } else {
      throw new Error("Could not find the mocked 'upload' Input or its onChange prop.");
    }

    // Wait for the setState callback to trigger mockOnChange
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith({ ...defaultData, url: newUrl });
    });
  });

  test('handles successful image upload', async () => {
    renderImageOptions();
    const mockFile = new File(['dummy'], 'test.jpg', { type: 'image/jpeg' });
    const uploadedUrl = 'http://example.com/uploaded.jpg';
    // Assuming the mockResolvedValue should provide the structure expected by the component
    mockStandaloneUpload.mockResolvedValueOnce({ data: { url: uploadedUrl } });

    fireEvent.change(screen.getByTestId('mock-input-upload'), { target: { files: [mockFile] } });

    await waitFor(() => {
      expect(mockStandaloneUpload).toHaveBeenCalledWith(mockFile);
    });
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith({ ...defaultData, url: uploadedUrl });
    });
  });

  test('handles image upload failure', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    renderImageOptions();
    const mockFile = new File(['dummy'], 'failure.jpg', { type: 'image/jpeg' });
    mockStandaloneUpload.mockRejectedValueOnce(new Error('Upload failed'));

    fireEvent.change(screen.getByTestId('mock-input-upload'), { target: { files: [mockFile] } });

    await waitFor(() => {
      expect(mockStandaloneUpload).toHaveBeenCalledWith(mockFile);
    });
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(defaultData);
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith("Image upload failed:", expect.any(Error));
    consoleErrorSpy.mockRestore();
  });

  test('initializes with default values if props.data is not provided', () => {
    // Render with no data prop (undefined)
    render(<ImageOptions onChange={mockOnChange} />);

    const InputMock = jest.requireMock('../../../components/Form').Input;
    expect(InputMock).toHaveBeenCalledWith(expect.objectContaining({ name: 'color', value: '#2d3436' }), {});
    expect(InputMock).toHaveBeenCalledWith(expect.objectContaining({ name: 'title', value: '' }), {}); // title defaults to null, input gets ''
    expect(InputMock).toHaveBeenCalledWith(expect.objectContaining({ name: 'upload', value: null }), {}); // url defaults to null
    expect(InputMock).toHaveBeenCalledWith(expect.objectContaining({ name: 'fit', value: 'contain' }), {});
    expect(InputMock).toHaveBeenCalledWith(expect.objectContaining({ name: 'altText', value: '' }), {});
  });

});
