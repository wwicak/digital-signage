import React, { createRef } from 'react'
import { render, screen, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import DialogWrapper, { DialogMethods as DialogWrapperMethods } from '../../../components/Dialog' // Renamed to DialogWrapper

/*
 * Mock the DialogLegacy component
 * The mock implementation and its associated jest.fn() instances are defined inside the factory
 */
jest.mock('../../../components/ui/dialog-legacy', () => {
  const mockLegacyOpen = jest.fn()
  const mockLegacyClose = jest.fn()

  const MockDialogLegacyComponent = require('react').forwardRef(
    ({ children, title, description, className }, ref) => {
      require('react').useImperativeHandle(ref, () => ({
        open: mockLegacyOpen,
        close: mockLegacyClose,
      }))
      return require('react').createElement(
        'div',
        { 'data-testid': 'mock-dialog-legacy', className },
        title && require('react').createElement('h2', { 'data-testid': 'mock-dialog-title' }, title),
        description && require('react').createElement('p', { 'data-testid': 'mock-dialog-description' }, description),
        children
      )
    }
  )
  MockDialogLegacyComponent.displayName = 'MockDialogLegacy';

  // Attach the mock functions to the component itself for easier access in tests
  (MockDialogLegacyComponent as any).mockOpen = mockLegacyOpen;
  (MockDialogLegacyComponent as any).mockClose = mockLegacyClose

  return {
    __esModule: true,
    default: MockDialogLegacyComponent,
  }
})

describe('Dialog Component (Wrapper)', () => {
  let mockLegacyOpen: jest.Mock
  let mockLegacyClose: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    // Access the mock functions from the mocked module
    const DialogLegacyMock = require('../../../components/ui/dialog-legacy').default
    mockLegacyOpen = (DialogLegacyMock as any).mockOpen
    mockLegacyClose = (DialogLegacyMock as any).mockClose
  })

  test('renders DialogLegacy with children and passes props', () => {
    const titleText = 'Test Dialog Title'
    const descriptionText = 'This is a test description.'
    const className = 'my-custom-dialog-class'
    const childText = 'Dialog Content Here'

    // Get the actual mocked component constructor after jest.mock has run
    render(
      <DialogWrapper title={titleText} description={descriptionText} className={className}>
        <p>{childText}</p>
      </DialogWrapper>
    )

    // Check if DialogLegacy mock rendered its content, implying it was called/rendered
    expect(screen.getByTestId('mock-dialog-legacy')).toHaveClass(className)
    expect(screen.getByTestId('mock-dialog-title')).toHaveTextContent(titleText)
    expect(screen.getByTestId('mock-dialog-description')).toHaveTextContent(descriptionText)
    expect(screen.getByText(childText)).toBeInTheDocument()
  })

  test('correctly forwards ref and calls open method on DialogLegacy', () => {
    const dialogRef = createRef<DialogWrapperMethods>()
    render(
      <DialogWrapper ref={dialogRef} title='Open Test'>
        <p>Content</p>
      </DialogWrapper>
    )

    expect(dialogRef.current).toBeDefined()
    act(() => {
      dialogRef.current?.open()
    })

    expect(mockLegacyOpen).toHaveBeenCalledTimes(1)
    expect(mockLegacyClose).not.toHaveBeenCalled()
  })

  test('correctly forwards ref and calls close method on DialogLegacy', () => {
    const dialogRef = createRef<DialogWrapperMethods>()
    render(
      <DialogWrapper ref={dialogRef} title='Close Test'>
        <p>Content</p>
      </DialogWrapper>
    )

    expect(dialogRef.current).toBeDefined()
    act(() => {
      dialogRef.current?.close()
    })

    expect(mockLegacyClose).toHaveBeenCalledTimes(1)
    expect(mockLegacyOpen).not.toHaveBeenCalled()
  })

  test('open and close methods call stopPropagation if event is provided', () => {
    const dialogRef = createRef<DialogWrapperMethods>()
    render(
      <DialogWrapper ref={dialogRef} title='Event Stop Test'>
        <p>Content</p>
      </DialogWrapper>
    )

    const mockEvent = { stopPropagation: jest.fn() } as any

    act(() => {
      dialogRef.current?.open(mockEvent)
    })
    expect(mockEvent.stopPropagation).toHaveBeenCalledTimes(1)
    expect(mockLegacyOpen).toHaveBeenCalledTimes(1)

    act(() => {
      dialogRef.current?.close(mockEvent)
    })
    expect(mockEvent.stopPropagation).toHaveBeenCalledTimes(2)
    expect(mockLegacyClose).toHaveBeenCalledTimes(1)
  })
})
