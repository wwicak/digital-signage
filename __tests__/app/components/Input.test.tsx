import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import Input, { IChoice } from '../../../components/Form/Input'

// Mock ColorPicker
jest.mock('../../../components/Form/ColorPicker', () => {
  const MockColorPicker = jest.fn(({ color, onChange }) => (
    <input
      type='color'
      data-testid='mock-color-picker'
      value={color}
      onChange={(e) => onChange(e.target.value)}
    />
  ))
  return { __esModule: true, default: MockColorPicker }
})

// Mock react-dropzone and its named exports like useDropzone
const mockGetRootProps = jest.fn((props?: object) => ({...props})) // Make props explicitly optional
const mockGetInputProps = jest.fn((props?: object) => ({...props})) // Make props explicitly optional
const ActualMockDropzoneImplementation = jest.fn(({ children, onDropAccepted, onDropRejected, ...rest }) => {
  // Allow tests to simulate drop by calling these props
  (global as any).simulateDrop = (files: File[]) => {
    if (onDropAccepted) onDropAccepted(files, {} as any) // Pass event arg if needed
  };
  (global as any).simulateDropRejected = (rejections: any[]) => {
    if (onDropRejected) onDropRejected(rejections, {} as any) // Pass event arg if needed
  }
  return (
    <div data-testid='mock-dropzone' {...mockGetRootProps()}>
      <input {...mockGetInputProps()} />
      {children({ getRootProps: mockGetRootProps, getInputProps: mockGetInputProps, isDragActive: false, ...rest })}
    </div>
  )
})

jest.mock('react-dropzone', () => ({
  __esModule: true,
  default: ActualMockDropzoneImplementation,
  useDropzone: () => ({
    getRootProps: mockGetRootProps,
    getInputProps: mockGetInputProps,
    isDragActive: false,
    // Add other potentially accessed properties from useDropzone if necessary
    acceptedFiles: [],
    fileRejections: [],
  })
}))

// Mock next/dynamic to correctly return the mocked Dropzone component
jest.mock('next/dynamic', () => () => {
  // This function component will be what dynamic(import(...)) returns
  const DynamicComponent = (props: any) => {
    const Dropzone = require('react-dropzone').default // This will get ActualMockDropzoneImplementation
    return <Dropzone {...props} />
  }
  DynamicComponent.displayName = 'MockedDynamicDropzone' // Optional: for better debuggability
  return DynamicComponent
})


describe('Input Component', () => {
  const mockOnChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    if ((global as any).simulateDrop) delete (global as any).simulateDrop
    if ((global as any).simulateDropRejected) delete (global as any).simulateDropRejected
  })

  // Basic Rendering
  test('renders label when provided', () => {
    render(<Input type='text' name='testInput' label='Test Label' onChange={mockOnChange} />)
    expect(screen.getByText('Test Label')).toBeInTheDocument()
  })

  test('renders placeholder when provided for text input', () => {
    render(<Input type='text' name='testInput' placeholder='Enter text' onChange={mockOnChange} />)
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument()
  })

  test('renders helpText when provided and no error', () => {
    render(<Input type='text' name='testInput' helpText='Some help' onChange={mockOnChange} />)
    expect(screen.getByText('Some help')).toBeInTheDocument()
  })

  test('renders error message when error prop is a string', () => {
    render(<Input type='text' name='testInput' error='This is an error' onChange={mockOnChange} />)
    expect(screen.getByText('This is an error')).toBeInTheDocument()
    const inputElement = screen.getByRole('textbox')
    expect(inputElement.closest('.input-group-wrapper')).toHaveClass('has-error')
  })

  test('applies has-error class when error prop is true', () => {
    render(<Input type='text' name='testInput' error={true} onChange={mockOnChange} />)
    const inputElement = screen.getByRole('textbox')
    expect(inputElement.closest('.input-group-wrapper')).toHaveClass('has-error')
    expect(screen.queryByText('true')).not.toBeInTheDocument()
  })

  test('does not render helpText when error is present', () => {
    render(<Input type='text' name='testInput' helpText='Some help' error='Big error' onChange={mockOnChange} />)
    expect(screen.queryByText('Some help')).not.toBeInTheDocument()
    expect(screen.getByText('Big error')).toBeInTheDocument()
  })

  test('applies inline class when inline prop is true', () => {
    render(<Input type='text' name='testInput' inline={true} onChange={mockOnChange} />)
    const inputElement = screen.getByRole('textbox')
    expect(inputElement.closest('.input-group-wrapper')).toHaveClass('inline')
  })

  test('applies block class by default (inline is false or undefined)', () => {
    render(<Input type='text' name='testInput' onChange={mockOnChange} />)
    const inputElement = screen.getByRole('textbox')
    expect(inputElement.closest('.input-group-wrapper')).toHaveClass('block')
  })

  test('applies expand class when expand prop is true', () => {
    render(<Input type='text' name='testInput' expand={true} onChange={mockOnChange} />)
    const inputElement = screen.getByRole('textbox')
    expect(inputElement.closest('.input-group-wrapper')).toHaveClass('expand')
  })

  // Text Input
  describe('Text Input (type="text")', () => {
    test('renders with initial value', () => {
      render(<Input type='text' name='username' value='initialUser' onChange={mockOnChange} />)
      expect(screen.getByRole('textbox')).toHaveValue('initialUser')
    })

    test('calls onChange with correct name and value', () => {
      render(<Input type='text' name='username' value='' onChange={mockOnChange} />)
      const inputElement = screen.getByRole('textbox')
      fireEvent.change(inputElement, { target: { value: 'newUser' } })
      expect(mockOnChange).toHaveBeenCalledWith('username', 'newUser', expect.anything())
    })

    test('renders disabled when disabled prop is true', () => {
      render(<Input type='text' name='username' disabled={true} onChange={mockOnChange} />)
      expect(screen.getByRole('textbox')).toBeDisabled()
    })

    test('calls onKeyDown when key is pressed', () => {
        const mockOnKeyDown = jest.fn()
        render(<Input type='text' name='testKeyDown' onKeyDown={mockOnKeyDown} onChange={mockOnChange} />)
        const inputElement = screen.getByRole('textbox')
        fireEvent.keyDown(inputElement, { key: 'Enter', code: 'Enter' })
        expect(mockOnKeyDown).toHaveBeenCalledTimes(1)
    })
  })

  // Number Input
  describe('Number Input (type="number")', () => {
    test('renders with initial value', () => {
      render(<Input type='number' name='age' value={30} onChange={mockOnChange} />)
      expect(screen.getByRole('spinbutton')).toHaveValue(30)
    })

    test('calls onChange with correct name and numeric value', () => {
      render(<Input type='number' name='age' value={30} onChange={mockOnChange} />)
      const inputElement = screen.getByRole('spinbutton')
      fireEvent.change(inputElement, { target: { value: '35' } })
      expect(mockOnChange).toHaveBeenCalledWith('age', 35, expect.anything())
    })

    test('handles empty string input as undefined for value', () => {
        render(<Input type='number' name='age' value={30} onChange={mockOnChange} />)
        const inputElement = screen.getByRole('spinbutton')
        fireEvent.change(inputElement, { target: { value: '' } })
        expect(mockOnChange).toHaveBeenCalledWith('age', undefined, expect.anything())
    })
  })

  // Textarea
  describe('Textarea Input (type="textarea")', () => {
    test('renders with initial value and rows attribute', () => {
      render(<Input type='textarea' name='description' value='initial desc' rows={5} onChange={mockOnChange} />)
      const textareaElement = screen.getByRole('textbox')
      expect(textareaElement).toHaveValue('initial desc')
      expect(textareaElement).toHaveAttribute('rows', '5')
    })

    test('calls onChange for textarea', () => {
      render(<Input type='textarea' name='description' value='' onChange={mockOnChange} />)
      const textareaElement = screen.getByRole('textbox')
      fireEvent.change(textareaElement, { target: { value: 'new desc' } })
      expect(mockOnChange).toHaveBeenCalledWith('description', 'new desc', expect.anything())
    })
  })

  // Select Input
  describe('Select Input (type="select")', () => {
    const choices: IChoice[] = [
      { id: '1', label: 'Option 1' },
      { id: '2', label: 'Option 2', disabled: true },
      { id: '3', label: 'Option 3' },
    ]

    test('renders with placeholder and choices', () => {
      render(<Input type='select' name='selection' choices={choices} placeholder='Choose one' onChange={mockOnChange} />)
      expect(screen.getByRole('combobox')).toBeInTheDocument()
      expect(screen.getByText('Choose one')).toBeInTheDocument()
      expect(screen.getByText('Option 1')).toBeInTheDocument()
      expect(screen.getByText('Option 2')).toBeInTheDocument()
      expect(screen.getByText('Option 3')).toBeInTheDocument()
      expect((screen.getByText('Option 2') as HTMLOptionElement).disabled).toBe(true)
    })

    test('calls onChange for select', () => {
      render(<Input type='select' name='selection' choices={choices} value='' onChange={mockOnChange} />)
      const selectElement = screen.getByRole('combobox')
      fireEvent.change(selectElement, { target: { value: '3' } })
      expect(mockOnChange).toHaveBeenCalledWith('selection', '3', expect.anything())
    })
  })

  // Checkbox Input
  describe('Checkbox Input (type="checkbox")', () => {
    test('renders unchecked by default (value=false or undefined)', () => {
      render(<Input type='checkbox' name='agree' onChange={mockOnChange} checked={false} />)
      expect(screen.getByRole('checkbox')).not.toBeChecked()
    })

    test('renders checked when value is true', () => {
      render(<Input type='checkbox' name='agree' checked={true} onChange={mockOnChange} />)
      expect(screen.getByRole('checkbox')).toBeChecked()
    })

    test('calls onChange with boolean value', () => {
      const { rerender } = render(<Input type='checkbox' name='agree' checked={false} onChange={mockOnChange} />)
      const checkboxElement = screen.getByRole('checkbox')

      fireEvent.click(checkboxElement)
      expect(mockOnChange).toHaveBeenCalledWith('agree', true, expect.anything())

      // Re-render with new value (true) to simulate prop change
      rerender(<Input type='checkbox' name='agree' checked={true} onChange={mockOnChange} />)
      fireEvent.click(checkboxElement) // Toggles to false (as current value is true)
      expect(mockOnChange).toHaveBeenCalledWith('agree', false, expect.anything())
    })
  })

  // Color Picker
  describe('Color Input (type="color")', () => {
    test('renders ColorPicker mock and handles change', () => {
      render(<Input type='color' name='bgColor' value='#FF0000' onChange={mockOnChange} />)
      const colorPickerMock = screen.getByTestId('mock-color-picker')
      expect(colorPickerMock).toHaveValue('#ff0000') // HTML value is typically lowercase
      fireEvent.change(colorPickerMock, {target: {value: '#00FF00'}})
      expect(mockOnChange).toHaveBeenCalledWith('bgColor', '#00ff00') // Expect lowercase
    })
  })

  // Photo Upload
  describe('Photo Input (type="photo")', () => {
    let alertSpy: jest.SpyInstance

    beforeEach(() => {
        alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})
    })

    afterEach(() => {
        alertSpy.mockRestore()
    })

    test('renders Dropzone mock', () => {
      render(<Input type='photo' name='profilePic' onChange={mockOnChange} />)
      expect(screen.getByTestId('mock-dropzone')).toBeInTheDocument()
    })

    test('handles accepted file drop', async () => {
      render(<Input type='photo' name='profilePic' onChange={mockOnChange} />)
      const file = new File(['(⌐□_□)'], 'chucknorris.png', { type: 'image/png' })
      // Simulate the drop by calling the globally attached function
      await act(async () => {
        if (typeof (global as any).simulateDrop === 'function') {
            (global as any).simulateDrop([file])
        }
      })
      expect(mockOnChange).toHaveBeenCalledWith('profilePic', file, undefined)
    })

    test('handles rejected file drop and alerts', async () => {
        render(<Input type='photo' name='profilePic' onChange={mockOnChange} accept='image/jpeg' />)
        const rejectedFilePayload = [{ file: new File(['test'], 'test.txt', {type: 'text/plain'}), errors: [{code: 'file-invalid-type', message: 'File type must be image/jpeg'}]}]

        await act(async () => {
            if (typeof (global as any).simulateDropRejected === 'function') {
                (global as any).simulateDropRejected(rejectedFilePayload)
            }
        })
        expect(alertSpy).toHaveBeenCalledWith('File type not allowed: test.txt')
        expect(mockOnChange).not.toHaveBeenCalled()
      })

    test('displays existing image URL as text', () => {
        render(<Input type='photo' name='profilePic' value='http://example.com/image.png' onChange={mockOnChange} />)
        expect(screen.getByText('http://example.com/image.png')).toBeInTheDocument()
    })

    test('displays new File name as text', () => {
        const file = new File(['(⌐□_□)'], 'new_avatar.png', { type: 'image/png' })
        render(<Input type='photo' name='profilePic' value={file} onChange={mockOnChange} />)
        expect(screen.getByText('new_avatar.png (New)')).toBeInTheDocument()
    })
  })
})
