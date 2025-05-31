import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

import ListContent, { IListContentProps } from '../../../widgets/list/src/ListContent'
import { IListItem } from '../../../widgets/list/index'

// Mock AutoScroll
jest.mock('../../../components/AutoScroll', () => {
  return jest.fn(({ children, style }) => (
    <div data-testid='mock-autoscroll' style={style}>
      {children}
    </div>
  ))
})

describe('ListContent', () => {
  const defaultListItems: IListItem[] = [
    { text: 'Item 1', label: 'Label 1' },
    { text: 'Item 2' },
  ]

  const defaultProps: IListContentProps = {
    data: {
      title: 'Test List Title',
      list: defaultListItems,
      color: 'rgb(0, 0, 0)', // black
      textColor: 'rgb(255, 255, 255)', // white
      ordered: false,
      fontSize: 18,
    },
  }

  const renderListContent = (props: Partial<IListContentProps> = {}) => {
    // Deep merge data prop if provided
    const mergedProps = {
      ...defaultProps,
      ...props,
      data: {
        ...defaultProps.data,
        ...(props.data || {}),
      },
    }
    return render(<ListContent {...mergedProps} />)
  }

  test('renders title when provided', () => {
    renderListContent()
    expect(screen.getByText('Test List Title')).toBeInTheDocument()
  })

  test('does not render title container if title is null', () => {
    const { container } = renderListContent({ data: { title: null } })
    expect(screen.queryByText('Test List Title')).not.toBeInTheDocument()
    expect(container.querySelector('.title-container')).not.toBeInTheDocument()
  })

  test('renders an unordered list (ul) by default or when ordered is false', () => {
    const { container } = renderListContent({ data: { ordered: false } })
    expect(container.querySelector('ul.list-tag.unordered')).toBeInTheDocument()
    expect(container.querySelector('ol.list-tag.ordered')).not.toBeInTheDocument()
  })

  test('renders an ordered list (ol) when ordered is true', () => {
    const { container } = renderListContent({ data: { ordered: true } })
    expect(container.querySelector('ol.list-tag.ordered')).toBeInTheDocument()
    expect(container.querySelector('ul.list-tag.unordered')).not.toBeInTheDocument()
  })

  test('renders list items with text and labels', () => {
    renderListContent()
    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.getByText('Label 1')).toBeInTheDocument()
    expect(screen.getByText('Item 2')).toBeInTheDocument()
    expect(screen.queryByText('Label 2')).not.toBeInTheDocument() // Item 2 has no label
  })

  test('renders default text for item if item.text is empty', () => {
    renderListContent({ data: { list: [{text: ''}] } })
    expect(screen.getByText('Insert some text ...')).toBeInTheDocument()
  })


  test('applies correct background and text colors', () => {
    renderListContent()
    const widgetContent = screen.getByText('Test List Title').closest('.list-widget-content')
    expect(widgetContent).toHaveStyle('background: rgb(0, 0, 0)')
    expect(widgetContent).toHaveStyle('color: rgb(255, 255, 255)')
  })

  test('applies correct font size to list items', () => {
    renderListContent()
    const listItem = screen.getByText('Item 1').closest('li')
    expect(listItem).toHaveStyle('font-size: 18px')
  })

  test('renders AutoScroll component', () => {
    renderListContent()
    expect(screen.getByTestId('mock-autoscroll')).toBeInTheDocument()
  })

  test('handles empty list gracefully', () => {
    const { container } = renderListContent({ data: { list: [] } })
    expect(container.querySelector('ul.list-tag')?.children.length).toBe(0) // Check no li elements
    // Check if title still renders
    expect(screen.getByText('Test List Title')).toBeInTheDocument()
  })

  test('handles missing data prop by using defaults', () => {
    /*
     * This relies on the component's internal default for data = {}
     * And then internal defaults for title, list, color etc.
     */
    const { container } = render(<ListContent />)
    expect(container.querySelector('.title-container')).not.toBeInTheDocument() // No default title
    expect(container.querySelector('ul.list-tag.unordered')).toBeInTheDocument() // Default unordered
    expect(container.querySelector('ul.list-tag')?.children.length).toBe(0) // Default empty list

    const widgetContent = container.firstChild as HTMLElement
    expect(widgetContent).toHaveStyle('background: #34495e') // DEFAULT_COLOR
    expect(widgetContent).toHaveStyle('color: #ffffff')    // DEFAULT_TEXT_COLOR
  })
})
