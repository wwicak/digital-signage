import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

import ListOptions, { IListOptionsProps } from '../../../widgets/list/src/ListOptions'
import { IListDefaultData, IListItem } from '../../../widgets/list/index'

// Mock Form components
jest.mock('../../../components/Form', () => ({
  Form: jest.fn(({ children }) => <form data-testid='mock-form'>{children}</form>),
  Input: jest.fn((props: any) => {
    /*
     * Simplified mock: just call onChange with value for text/number/color,
     * or with the choice id for select.
     */
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      if (props.onChange) {
        // Pass the raw value from the event; component's onChange will handle conversion
        props.onChange(props.name, e.target.value)
      }
    }
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
      )
    }
    return (
      <div>
        <label htmlFor={props.name}>{props.label}</label>
        <input
          data-testid={`mock-input-${props.name}`}
          type={props.type}
          name={props.name}
          value={String(props.value || '')} // Ensure value is string for input attribute
          placeholder={props.placeholder}
          onChange={handleChange}
        />
      </div>
    )
  }),
  InlineInputGroup: jest.fn(({ children }) => <div data-testid='mock-inline-input-group'>{children}</div>),
  Button: jest.fn(({ text, onClick, style }) => (
    <button type='button' data-testid='mock-button' onClick={onClick} style={style}>{text}</button> // Added type="button"
  )),
}))

// Mock FontAwesomeIcon
jest.mock('@fortawesome/react-fontawesome', () => ({
  FontAwesomeIcon: jest.fn(() => <i data-testid='mock-fa-icon' />),
}))

// Mock ListContent for preview
jest.mock('../../../widgets/list/src/ListContent', () => {
  return jest.fn((props: any) => (
    <div data-testid='mock-list-content-preview'>
      Preview: {props.data?.title}
      <ul>{props.data?.list?.map((item: IListItem, i: number) => <li key={i}>{item.text} - {item.label}</li>)}</ul>
    </div>
  ))
})


describe('ListOptions', () => {
  const mockOnChange = jest.fn()
  const defaultListData: IListDefaultData = {
    title: 'My List',
    color: '#333333',
    textColor: '#eeeeee',
    list: [
      { text: 'First item', label: 'Label A' },
      { text: 'Second item', label: 'Label B' },
    ],
    ordered: false,
    fontSize: 16,
  }

  const renderListOptions = (data?: IListDefaultData) => {
    return render(<ListOptions data={data || defaultListData} onChange={mockOnChange} />)
  }

  beforeEach(() => {
    mockOnChange.mockClear();
    (jest.requireMock('../../../components/Form').Input as jest.Mock).mockClear();
    (jest.requireMock('../../../components/Form').Button as jest.Mock).mockClear();
    (jest.requireMock('../../../widgets/list/src/ListContent') as jest.Mock).mockClear()
  })

  test('renders initial fields correctly', () => {
    renderListOptions()
    expect(screen.getByTestId('mock-input-title')).toHaveValue(defaultListData.title)
    // Explicitly cast .value to string for comparison, as JSDOM might return number for type="number"
    expect(String((screen.getByTestId('mock-input-fontSize') as HTMLInputElement).value)).toBe(defaultListData.fontSize?.toString())
    expect(screen.getByTestId('mock-input-color')).toHaveValue(defaultListData.color)
    expect(screen.getByTestId('mock-input-textColor')).toHaveValue(defaultListData.textColor)
    expect(screen.getByTestId('mock-input-ordered')).toHaveValue(defaultListData.ordered ? 'ordered' : 'unordered')
  })

  test('renders list item editors correctly', () => {
    renderListOptions()
    expect(screen.getByTestId('mock-input-item-text-0')).toHaveValue(defaultListData.list[0].text)
    expect(screen.getByTestId('mock-input-item-label-0')).toHaveValue(defaultListData.list[0].label)
    expect(screen.getByTestId('mock-input-item-text-1')).toHaveValue(defaultListData.list[1].text)
    expect(screen.getByTestId('mock-input-item-label-1')).toHaveValue(defaultListData.list[1].label)
  })

  test('calls onChange when title is changed', () => {
    renderListOptions()
    fireEvent.change(screen.getByTestId('mock-input-title'), { target: { value: 'New Title' } })
    expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ title: 'New Title' }))
  })

  test('calls onChange when fontSize is changed', () => {
    renderListOptions()
    fireEvent.change(screen.getByTestId('mock-input-fontSize'), { target: { value: '20' } })
    expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ fontSize: '20' })) // Input value is string
  })

  test('calls onChange when ordered is changed', () => {
    renderListOptions()
    fireEvent.change(screen.getByTestId('mock-input-ordered'), { target: { value: 'ordered' } })
    expect(mockOnChange).toHaveBeenLastCalledWith(expect.objectContaining({ ordered: true })) // Changed to toHaveBeenLastCalledWith
    fireEvent.change(screen.getByTestId('mock-input-ordered'), { target: { value: 'unordered' } })
    expect(mockOnChange).toHaveBeenLastCalledWith(expect.objectContaining({ ordered: false })) // Changed to toHaveBeenLastCalledWith
  })

  test('adds a new item when "Add Item" button is clicked', () => {
    renderListOptions()
    fireEvent.click(screen.getByTestId('mock-button')) // Assumes only one button or add more specific selector
    const expectedList = [...defaultListData.list, { text: '', label: null }]
    expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ list: expectedList }))
  })

  test('deletes an item when delete icon is clicked', () => {
    renderListOptions()
    // Get all delete icons (which are inside buttons), then click the first one.
    const deleteButtons = screen.getAllByRole('button', { name: /delete item/i })
    expect(deleteButtons[0]).toBeInTheDocument()
    fireEvent.click(deleteButtons[0])

    const expectedList = defaultListData.list.slice(1) // All items except the first one
    expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ list: expectedList }))
  })

  test('updates item text when changed', () => {
    renderListOptions()
    fireEvent.change(screen.getByTestId('mock-input-item-text-0'), { target: { value: 'Updated Text 0' } })
    const updatedList = defaultListData.list.map((item, i) => i === 0 ? { ...item, text: 'Updated Text 0' } : item)
    expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ list: updatedList }))
  })

  test('updates item label when changed', () => {
    renderListOptions()
    fireEvent.change(screen.getByTestId('mock-input-item-label-1'), { target: { value: 'Updated Label 1' } })
    const updatedList = defaultListData.list.map((item, i) => i === 1 ? { ...item, label: 'Updated Label 1' } : item)
    expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ list: updatedList }))
  })

  test('updates preview when data changes', () => {
    const { rerender } = renderListOptions()
    const ListContentMock = jest.requireMock('../../../widgets/list/src/ListContent')
    expect(ListContentMock).toHaveBeenLastCalledWith(expect.objectContaining({data: defaultListData}), {})

    const newData: IListDefaultData = {
        ...defaultListData,
        title: 'New Preview Title',
        list: [{text: 'Preview Item', label: 'Preview Label'}]
    }
    // To simulate props changing, we re-render ListOptions with new data
    rerender(<ListOptions data={newData} onChange={mockOnChange} />)
    /*
     * Then, check if ListContent (preview) was called with the new data.
     * Note: The component's componentDidUpdate might setState, triggering another onChange and thus another preview update.
     * We are interested in the state that reflects newData.
     * The mockOnChange would be called by componentDidUpdate if it calls this.setState,
     * and that setState callback calls this.props.onChange(this.state)
     * For this test, focus on what ListContent receives via the previewData prop in render.
     * The mock for ListContent will be called during the render method of ListOptions.
     */
    expect(ListContentMock).toHaveBeenLastCalledWith(expect.objectContaining({data: newData}), {})
  })

})
