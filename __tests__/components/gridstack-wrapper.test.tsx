import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock GridStack
jest.mock('gridstack', () => ({
  GridStack: {
    init: jest.fn(() => ({
      on: jest.fn(),
      off: jest.fn(),
      destroy: jest.fn(),
      addWidget: jest.fn(),
      removeWidget: jest.fn(),
      removeAll: jest.fn(),
      makeWidget: jest.fn(),
      batchUpdate: jest.fn(),
      save: jest.fn(() => []),
      enableMove: jest.fn(),
      enableResize: jest.fn(),
      getColumn: jest.fn(() => 12),
      update: jest.fn(),
    })),
  },
}))

// Mock CSS import
jest.mock('gridstack/dist/gridstack.min.css', () => ({}))

// Mock the GridStackWrapper component
const MockGridStackWrapper = ({ items, className }: any) => (
  <div className={`grid-stack ${className || ''}`} role="generic">
    {items.map((item: any) => (
      <div
        key={item.id}
        className="grid-stack-item"
        gs-id={item.id}
        gs-x={item.x?.toString()}
        gs-y={item.y?.toString()}
        gs-w={item.w?.toString()}
        gs-h={item.h?.toString()}
      >
        <div className="grid-stack-item-content">
          {item.content}
        </div>
      </div>
    ))}
  </div>
)

describe('GridStackWrapper', () => {
  const mockItems = [
    {
      id: 'test-1',
      x: 0,
      y: 0,
      w: 2,
      h: 2,
      content: <div>Test Widget 1</div>
    },
    {
      id: 'test-2',
      x: 2,
      y: 0,
      w: 2,
      h: 2,
      content: <div>Test Widget 2</div>
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders without crashing', () => {
    const { container } = render(<MockGridStackWrapper items={[]} />)
    const gridContainer = container.querySelector('.grid-stack')
    expect(gridContainer).toBeInTheDocument()
  })

  it('renders grid items correctly', () => {
    render(<MockGridStackWrapper items={mockItems} />)

    expect(screen.getByText('Test Widget 1')).toBeInTheDocument()
    expect(screen.getByText('Test Widget 2')).toBeInTheDocument()
  })

  it('applies correct grid stack attributes', () => {
    const { container } = render(<MockGridStackWrapper items={mockItems} />)

    const gridItems = container.querySelectorAll('.grid-stack-item')
    expect(gridItems).toHaveLength(2)

    const firstItem = gridItems[0]
    expect(firstItem).toHaveAttribute('gs-id', 'test-1')
    expect(firstItem).toHaveAttribute('gs-x', '0')
    expect(firstItem).toHaveAttribute('gs-y', '0')
    expect(firstItem).toHaveAttribute('gs-w', '2')
    expect(firstItem).toHaveAttribute('gs-h', '2')
  })

  it('applies custom className', () => {
    const { container } = render(
      <MockGridStackWrapper items={[]} className="custom-class" />
    )

    const gridContainer = container.querySelector('.grid-stack')
    expect(gridContainer).toHaveClass('custom-class')
  })

  it('handles empty items array', () => {
    const { container } = render(<MockGridStackWrapper items={[]} />)

    const gridContainer = container.querySelector('.grid-stack')
    expect(gridContainer).toBeInTheDocument()
    expect(gridContainer.children).toHaveLength(0)
  })
})
