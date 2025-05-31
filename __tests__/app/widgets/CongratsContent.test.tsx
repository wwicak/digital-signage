import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Options as LottieOptions } from 'react-lottie'

// Import the component to be tested
import ActualCongratsContent from '../../../widgets/congrats/src/CongratsContent'
// Import the utility object we want to spy on
import { animationUtils } from '../../../widgets/congrats/src/animationUtils'

type ICongratsContentProps = React.ComponentProps<typeof ActualCongratsContent>;

// Constants from the component for default value testing - ensure these match!
const DEFAULT_TEXT_COMPONENT = 'Congratulations!'
const DEFAULT_COLOR_COMPONENT = '#34495e'
const DEFAULT_TEXT_COLOR_COMPONENT = '#ffffff'
const DEFAULT_ANIMATION_COMPONENT = 'confetti'
const DEFAULT_FONT_SIZE_COMPONENT = 16

// Mock Lottie
jest.mock('react-lottie', () => {
  const MockLottie = jest.fn(({ options }: { options: LottieOptions }) => (
    <div data-testid='mock-lottie' data-animationdata-name={(options.animationData as any)?.default?.nm || (options.animationData as any)?.nm || 'none'}>
      Mock Lottie Content
    </div>
  ));
  (MockLottie as any).displayName = 'MockLottie'
  return { __esModule: true, default: MockLottie }
})

// Mock AutoScroll
jest.mock('../../../components/AutoScroll', () => {
  const MockAutoScroll = jest.fn(({ children, style }: { children: React.ReactNode, style: React.CSSProperties }) => (
    <div data-testid='mock-autoscroll' style={style}>
      {children}
    </div>
  ));
  (MockAutoScroll as any).displayName = 'MockAutoScroll'
  return { __esModule: true, default: MockAutoScroll }
})

describe('CongratsContent (Refactored with animationUtils)', () => {
  let getAnimationDataSpy: jest.SpyInstance
  let consoleErrorSpy: jest.SpyInstance

  // Expected animation data objects (structure depends on how JSON files are imported, often with a 'default' key)
  const confettiData = { default: { nm: 'confettiAnimation' } }
  const balloonsData = { default: { nm: 'balloonsAnimation' } }

  beforeEach(() => {
    // Spy on animationUtils.getAnimationData
    getAnimationDataSpy = jest.spyOn(animationUtils, 'getAnimationData')

    // Provide a default mock implementation for the spy that mimics the actual util's behavior
    getAnimationDataSpy.mockImplementation((animationName?: string) => {
      const resolvedName = animationName || DEFAULT_ANIMATION_COMPONENT
      if (resolvedName === 'confetti') return confettiData
      if (resolvedName === 'balloons') return balloonsData
      // Simulate the console error and fallback of the actual util for unknown styles
      console.error(`Animation not found: ${resolvedName}. Falling back to default.`)
      if (DEFAULT_ANIMATION_COMPONENT === 'confetti') return confettiData
      // Add more fallbacks if your actual util has them
      return null // Or whatever the ultimate fallback is
    })

    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    // Clear mocks for child components
    const mockLottie = jest.requireMock('react-lottie').default
    if (jest.isMockFunction(mockLottie)) mockLottie.mockClear()
    const mockAutoScroll = jest.requireMock('../../../components/AutoScroll').default
    if (jest.isMockFunction(mockAutoScroll)) mockAutoScroll.mockClear()
  })

  afterEach(() => {
    getAnimationDataSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  const renderCongratsContent = (props: Partial<ICongratsContentProps> = {}) => {
    return render(<ActualCongratsContent {...props} />)
  }

  test('renders with default props, calling getAnimationData for default animation', () => {
    renderCongratsContent({})
    expect(getAnimationDataSpy).toHaveBeenCalledWith(DEFAULT_ANIMATION_COMPONENT)
    expect(screen.getByTestId('mock-lottie')).toHaveAttribute('data-animationdata-name', confettiData.default.nm)
    expect(screen.getByText(DEFAULT_TEXT_COMPONENT)).toBeInTheDocument()
  })

  test('calls getAnimationData with "balloons" and renders corresponding animation', () => {
    renderCongratsContent({ data: { animation: 'balloons' } })
    expect(getAnimationDataSpy).toHaveBeenCalledWith('balloons')
    expect(screen.getByTestId('mock-lottie')).toHaveAttribute('data-animationdata-name', balloonsData.default.nm)
  })

  test('handles unknown animation style by falling back to default and logging error', () => {
    renderCongratsContent({ data: { animation: 'unknownStyle' } })
    expect(getAnimationDataSpy).toHaveBeenCalledWith('unknownStyle')
    // The mockImplementation of the spy now handles the fallback logic and console.error
    expect(screen.getByTestId('mock-lottie')).toHaveAttribute('data-animationdata-name', confettiData.default.nm)
    expect(consoleErrorSpy).toHaveBeenCalledWith('Animation not found: unknownStyle. Falling back to default.')
  })

  test('renders no Lottie if getAnimationData spy returns null', () => {
    getAnimationDataSpy.mockReturnValue(null) // Override spy for this specific test

    renderCongratsContent({ data: { animation: 'someAnimationThatWillReturnNull' } })
    expect(getAnimationDataSpy).toHaveBeenCalledWith('someAnimationThatWillReturnNull')
    expect(screen.queryByTestId('mock-lottie')).not.toBeInTheDocument()
  })

  test('renders provided text, colors, and font size correctly', () => {
    const testData: ICongratsContentProps['data'] = {
      text: 'Special Text!\nAnother Line.',
      textColor: 'rgb(0, 128, 0)',
      color: 'rgb(128, 0, 128)',
      fontSize: 30,
      animation: 'confetti',
    }
    renderCongratsContent({ data: testData })

    expect(screen.getByText('Special Text!')).toBeInTheDocument()
    const widgetContent = screen.getByText('Special Text!').closest('.congrats-widget-content')
    expect(widgetContent).toHaveStyle(`background: ${testData.color}`)
    expect(widgetContent).toHaveStyle(`color: ${testData.textColor}`)
    const textContent = screen.getByText('Special Text!').closest('.text-content')
    expect(textContent).toHaveStyle(`font-size: ${testData.fontSize}px`)
  })
})
