import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import LoginPage from './page' // Import the component to test

// --- Mock Dependencies ---

// Mock next/navigation
const mockRouterPush = jest.fn()
const mockSearchParamsGet = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
  useSearchParams: () => ({
    get: mockSearchParamsGet,
  }),
  redirect: jest.fn(), // Add redirect mock if it were used directly
}))

// Mock helpers/auth
const actualMockAuthLogin = jest.fn()
jest.mock('../../helpers/auth', () => ({
  __esModule: true, // Assuming it's an ES module
  login: (...args: any[]) => actualMockAuthLogin(...args),
}))

// Mock components/Admin/Frame
jest.mock('../../components/Admin/Frame', () => {
  return jest.fn(({ children }) => <div data-testid='mock-frame'>{children}</div>)
})

// Mock @fortawesome/react-fontawesome
jest.mock('@fortawesome/react-fontawesome', () => ({
  FontAwesomeIcon: jest.fn((props) => <i data-testid='mock-fa-icon' data-icon={props.icon.iconName}></i>),
}))


// --- Test Suite ---
describe('LoginPage', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockRouterPush.mockClear()
    mockSearchParamsGet.mockClear()
    actualMockAuthLogin.mockClear() // Use the new mock variable
  })

  test('renders login form correctly', () => {
    render(<LoginPage />)
    expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument()
    // Initial info alert
    expect(screen.getByText(/Use the username "demo" and password "demo"/i)).toBeInTheDocument()
  })

  test('allows typing in username and password fields', () => {
    render(<LoginPage />)
    const usernameInput = screen.getByLabelText(/username/i)
    const passwordInput = screen.getByLabelText(/password/i)

    fireEvent.change(usernameInput, { target: { value: 'testuser' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })

    expect(usernameInput).toHaveValue('testuser')
    expect(passwordInput).toHaveValue('password123')
  })

  test('successful login redirects to /layout when no displayId is present', async () => {
    mockSearchParamsGet.mockReturnValue(null) // No displayId
    actualMockAuthLogin.mockResolvedValueOnce({ success: true }) // Use new mock

    render(<LoginPage />)

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'testuser' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'testpass' } })
    fireEvent.click(screen.getByRole('button', { name: /log in/i }))

    await waitFor(() => {
      expect(actualMockAuthLogin).toHaveBeenCalledWith( // Use new mock
        { username: 'testuser', password: 'testpass' },
        undefined,
        undefined // displayId
      )
    })

    await waitFor(() => {
      expect(screen.getByText(/Successfully logged in to your account./i)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/layout')
    })
  })

  test('successful login redirects to /display/[displayId] when displayId is present', async () => {
    const displayId = 'testDisplay123'
    mockSearchParamsGet.mockReturnValue(displayId)
    actualMockAuthLogin.mockResolvedValueOnce({ success: true }) // Use new mock

    render(<LoginPage />)

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'testuser' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'testpass' } })
    fireEvent.click(screen.getByRole('button', { name: /log in/i }))

    await waitFor(() => {
      expect(actualMockAuthLogin).toHaveBeenCalledWith( // Use new mock
        { username: 'testuser', password: 'testpass' },
        undefined,
        displayId
      )
    })

    await waitFor(() => {
        expect(screen.getByText(/Successfully logged in to your account./i)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith(`/display/${displayId}`)
    })
  })

  test('failed login (API returns success: false) shows error message and does not redirect', async () => {
    mockSearchParamsGet.mockReturnValue(null)
    actualMockAuthLogin.mockResolvedValueOnce({ success: false }) // Use new mock

    render(<LoginPage />)

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'wronguser' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrongpass' } })
    fireEvent.click(screen.getByRole('button', { name: /log in/i }))

    await waitFor(() => {
      expect(actualMockAuthLogin).toHaveBeenCalledWith( // Use new mock
        { username: 'wronguser', password: 'wrongpass' },
        undefined,
        undefined
      )
    })

    await waitFor(() => {
      expect(screen.getByText(/Username or password not recognized./i)).toBeInTheDocument()
    })
    expect(mockRouterPush).not.toHaveBeenCalled()
  })

  test('failed login (API throws error) shows error message and does not redirect', async () => {
    mockSearchParamsGet.mockReturnValue(null)
    actualMockAuthLogin.mockRejectedValueOnce(new Error('Network error')) // Use new mock

    render(<LoginPage />)

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'erroruser' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'errorpass' } })
    fireEvent.click(screen.getByRole('button', { name: /log in/i }))

    await waitFor(() => {
      expect(actualMockAuthLogin).toHaveBeenCalledWith( // Use new mock
        { username: 'erroruser', password: 'errorpass' },
        undefined,
        undefined
      )
    })

    await waitFor(() => {
      expect(screen.getByText(/Username or password not recognized./i)).toBeInTheDocument()
    })
    expect(mockRouterPush).not.toHaveBeenCalled()
  })

  // Test for the back link
  test('renders back link to home page', () => {
    render(<LoginPage />)
    const backLink = screen.getByText(/Back to the home page/i).closest('a')
    expect(backLink).toBeInTheDocument()
    expect(backLink).toHaveAttribute('href', '/')
  })
})
