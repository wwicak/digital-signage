import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import AnnouncementOptions, { IAnnouncementOptionsProps } from '../../../widgets/announcement/src/AnnouncementOptions'
import { IAnnouncementWidgetData } from '../../../widgets/announcement/src/AnnouncementContent'

// Mock child components used by AnnouncementOptions
jest.mock('../../../components/Form', () => ({
  __esModule: true,
  Form: jest.fn(({ children }) => <form data-testid='mock-form'>{children}</form>),
  Input: jest.fn(({ label, name, value, onChange, type, placeholder, rows, inline }) => {
    const inputType = type === 'textarea' ? 'textarea' : type === 'color' ? 'color' : 'text'
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange(name, e.target.value)
    }
    if (inputType === 'textarea') {
      return (
        <div>
          <label htmlFor={name}>{label}</label>
          <textarea data-testid={`mock-input-${name}`} name={name} value={value || ''} onChange={handleChange} placeholder={placeholder} rows={rows} />
        </div>
      )
    }
    return (
      <div>
        <label htmlFor={name}>{label}</label>
        <input data-testid={`mock-input-${name}`} type={inputType} name={name} value={value || ''} onChange={handleChange} placeholder={placeholder} />
      </div>
    )
  }),
  InlineInputGroup: jest.fn(({ children }) => <div data-testid='mock-inline-input-group'>{children}</div>),
}))

jest.mock('../../../widgets/announcement/src/AnnouncementContent', () => {
  const MockAnnouncementContent = ({ data }: { data: IAnnouncementWidgetData }) => (
    <div data-testid='mock-announcement-content-preview'>
      <p data-testid='preview-text'>{data.text}</p>
      <p data-testid='preview-color'>{data.color}</p>
    </div>
  )
  MockAnnouncementContent.displayName = 'MockAnnouncementContent'
  return {
    __esModule: true,
    default: MockAnnouncementContent,
    // Exporting schema if it's used by options (it is for types)
    AnnouncementWidgetContentDataSchema: jest.requireActual('../../../widgets/announcement/src/AnnouncementContent').AnnouncementWidgetContentDataSchema
  }
})


const mockOnChange = jest.fn()

const defaultData: IAnnouncementWidgetData = {
  text: 'Initial Text',
  color: '#121212',
  textColor: '#ababab',
  titleTextColor: '#cdcdcd',
  accentColor: '#efefef',
  title: 'Initial Title',
}

const renderAnnouncementOptions = (props?: Partial<IAnnouncementOptionsProps>) => {
  const combinedProps: IAnnouncementOptionsProps = {
    data: defaultData,
    onChange: mockOnChange,
    ...props,
  }
  return render(<AnnouncementOptions {...combinedProps} />)
}

describe('AnnouncementOptions Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders input fields with initial values from props.data', () => {
    renderAnnouncementOptions()
    expect(screen.getByTestId('mock-input-color')).toHaveValue(defaultData.color)
    expect(screen.getByTestId('mock-input-textColor')).toHaveValue(defaultData.textColor)
    expect(screen.getByTestId('mock-input-titleTextColor')).toHaveValue(defaultData.titleTextColor)
    expect(screen.getByTestId('mock-input-accentColor')).toHaveValue(defaultData.accentColor)
    expect(screen.getByTestId('mock-input-text')).toHaveValue(defaultData.text)
    expect(screen.getByTestId('mock-input-title')).toHaveValue(defaultData.title)
  })

  test('renders input fields with default values if props.data is empty or not provided', () => {
    renderAnnouncementOptions({ data: {} })
    expect(screen.getByTestId('mock-input-color')).toHaveValue('#708090') // Default from component state
    expect(screen.getByTestId('mock-input-textColor')).toHaveValue('#ffffff')
    expect(screen.getByTestId('mock-input-titleTextColor')).toHaveValue('#fff0f0')
    expect(screen.getByTestId('mock-input-accentColor')).toHaveValue('#edc951') // Expect lowercase
    expect(screen.getByTestId('mock-input-text')).toHaveValue('')
    expect(screen.getByTestId('mock-input-title')).toHaveValue('Announcement') // Default from component state
  })

  const testCases = [
    { name: 'text', testId: 'mock-input-text', value: 'New Text', expectedStateKey: 'text' },
    { name: 'color', testId: 'mock-input-color', value: '#000000', expectedStateKey: 'color' },
    { name: 'textColor', testId: 'mock-input-textColor', value: '#111111', expectedStateKey: 'textColor' },
    { name: 'titleTextColor', testId: 'mock-input-titleTextColor', value: '#222222', expectedStateKey: 'titleTextColor' },
    { name: 'accentColor', testId: 'mock-input-accentColor', value: '#333333', expectedStateKey: 'accentColor' },
    { name: 'title', testId: 'mock-input-title', value: 'New Data Title', expectedStateKey: 'title' },
  ]

  testCases.forEach(({ name, testId, value, expectedStateKey }) => {
    test(`calls onChange with updated data when ${name} input changes`, async () => {
      renderAnnouncementOptions()
      const inputElement = screen.getByTestId(testId)
      fireEvent.change(inputElement, { target: { value } })

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledTimes(1)
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            ...defaultData, // a copy of defaultData
            [expectedStateKey]: value,
          })
        )
      })
    })
  })

  test('updates preview when data changes', async () => {
    renderAnnouncementOptions()

    // Check initial preview state
    expect(screen.getByTestId('preview-text')).toHaveTextContent(defaultData.text!)
    expect(screen.getByTestId('preview-color')).toHaveTextContent(defaultData.color!)

    const newText = 'Updated preview text'
    const newColor = '#ABCDEF'
    const textInputElement = screen.getByTestId('mock-input-text')
    const colorInputElement = screen.getByTestId('mock-input-color')

    fireEvent.change(textInputElement, { target: { value: newText } })
    fireEvent.change(colorInputElement, { target: { value: newColor } })

    await waitFor(() => {
      expect(screen.getByTestId('preview-text')).toHaveTextContent(newText)
      expect(screen.getByTestId('preview-color')).toHaveTextContent(newColor.toLowerCase()) // color input values are lowercase
    })
  })

  test('componentDidUpdate updates state if props.data changes', () => {
    const { rerender } = renderAnnouncementOptions({ data: defaultData })

    const newData: IAnnouncementWidgetData = {
      ...defaultData,
      text: 'Updated via props',
      color: '#987654'
    }

    rerender(<AnnouncementOptions data={newData} onChange={mockOnChange} />)

    // Verify inputs reflect the new props (which means state was updated)
    expect(screen.getByTestId('mock-input-text')).toHaveValue(newData.text)
    expect(screen.getByTestId('mock-input-color')).toHaveValue(newData.color?.toLowerCase()) // color input values are lowercase

    // Verify preview also reflects new props
    expect(screen.getByTestId('preview-text')).toHaveTextContent(newData.text!)
    expect(screen.getByTestId('preview-color')).toHaveTextContent(newData.color!.toLowerCase())
  })

})
