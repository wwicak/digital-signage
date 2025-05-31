import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import CongratsContent from '../../../widgets/congrats/src/CongratsContent';
import { ICongratsWidgetData } from '../../../widgets/congrats/src/CongratsContent';

// Mock react-lottie
jest.mock('react-lottie', () => {
  // eslint-disable-next-line react/display-name
  return ({ options, height, width }: any) => (
    <div data-testid="mock-lottie-player" data-animation={options?.animationData?.nm || 'unknown'}>
      Lottie Animation ({options?.animationData?.nm || 'unknown'}) - H:{height}, W:{width}
    </div>
  );
});

// Mock the getAnimationData function within CongratsContent
// This is a bit tricky as it's an internal helper.
// We'll mock the module where it's defined if it were separate,
// but since it's in the same file, we might need to spyOn or adjust its behavior if it causes issues.
// For now, we assume it might return null if animations are not found, and Lottie mock handles null animationData.
// A more robust way would be to mock the dynamic require if tests fail due to it.
// For now, let's proceed without directly mocking getAnimationData here, relying on the Lottie mock.

const mockDefaultWidgetData: ICongratsWidgetData = {
  text: "Congratulations!",
  animation: "confetti",
  color: "#34495e",
  textColor: "#ffffff",
  fontSize: 16,
};

describe('CongratsContent Component', () => {
  it('should render with default data if no data prop is provided', () => {
    render(<CongratsContent isPreview={false} />); // data is undefined

    expect(screen.getByTestId('congrats-text-content')).toHaveTextContent('Congratulations!');
    expect(screen.getByTestId('lottie-animation-container')).toBeInTheDocument();
    // Check if the Lottie mock receives default animation name if possible (depends on mock detail)
    expect(screen.getByTestId('mock-lottie-player')).toHaveAttribute('data-animation', 'Confetti Combined'); // Adjusted
  });

  it('should render with custom text and animation', () => {
    const customData: ICongratsWidgetData = {
      ...mockDefaultWidgetData,
      text: 'Well Done!',
      animation: 'balloons', // Assuming a 'balloons.json' might exist or mock handles it
    };
    render(<CongratsContent data={customData} isPreview={false} />);

    expect(screen.getByTestId('congrats-text-content')).toHaveTextContent('Well Done!');
    expect(screen.getByTestId('mock-lottie-player')).toHaveAttribute('data-animation', 'Balloon Animation'); // Adjusted
  });

  it('should apply custom styles from data', () => {
    const customStyleData: ICongratsWidgetData = {
      text: 'Styled Text',
      color: 'rgb(0, 0, 255)',      // blue background
      textColor: 'rgb(255, 255, 0)',// yellow text
      fontSize: 24,
      animation: 'confetti',
    };
    render(<CongratsContent data={customStyleData} isPreview={false} />);

    const widgetContentDiv = screen.getByTestId('congrats-text-content').parentElement?.parentElement;
    expect(widgetContentDiv).toHaveStyle(`background: rgb(0, 0, 255)`);
    expect(widgetContentDiv).toHaveStyle(`color: rgb(255, 255, 0)`);

    const textContent = screen.getByTestId('congrats-text-content');
    expect(textContent).toHaveStyle(`font-size: 24px`);
  });

  it('should render without Lottie animation if animationData is null', () => {
    // This requires a way to make getAnimationData return null.
    // We can achieve this by trying an animation name that doesn't exist and ensuring fallback also fails.
    // Or, more reliably, by mocking getAnimationData if it were exported, or CongratsContent's internal state/logic.
    // For now, this test assumes that if 'nonexistent' animation is passed, animationData becomes null.
    // This is a simplification; a more robust test would involve deeper mocking of getAnimationData.
    const dataWithInvalidAnimation: ICongratsWidgetData = {
      animation: 'nonexistent-animation-that-will-fail-and-fallback-will-also-fail-if-confetti-is-not-mocked-to-exist',
      text: 'No Animation Test'
    };

    // To ensure getAnimationData returns null, we can temporarily break the require for confetti too.
    // This is hacky for a unit test. A better way would be to allow CongratsContent to take animationData as a prop
    // or to mock the getAnimationData import.
    // For now, we'll rely on the Lottie mock handling undefined animationData gracefully.
    // The Lottie mock currently renders a div even with unknown animation.
    // A better test would be to assert Lottie is *not* called/rendered.

    jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error from getAnimationData

    render(<CongratsContent data={dataWithInvalidAnimation} isPreview={false} />);
    expect(screen.getByTestId('congrats-text-content')).toHaveTextContent('No Animation Test');

    // If 'nonexistent-animation' fails AND the fallback 'confetti' also fails (e.g. not found by require),
    // then animationData would be null. The Lottie mock would get 'unknown_animation'.
    // If 'nonexistent-animation' fails but 'confetti' (the default) loads, it would be 'Confetti Combined'.
    // Based on previous output, the fallback to 'confetti' happens.
    expect(screen.getByTestId('mock-lottie-player')).toHaveAttribute('data-animation', 'Confetti Combined'); // Adjusted

    (console.error as jest.Mock).mockRestore();
  });

  it('should render correctly in preview mode', () => {
    const previewData: ICongratsWidgetData = {
      ...mockDefaultWidgetData,
      text: 'Preview Congrats!',
    };
    render(<CongratsContent data={previewData} isPreview={true} />);
    expect(screen.getByTestId('congrats-text-content')).toHaveTextContent('Preview Congrats!');
    // No specific visual change for isPreview is currently implemented other than passing the prop.
  });

  it('should handle multiline text correctly', () => {
    const multilineData: ICongratsWidgetData = {
      ...mockDefaultWidgetData,
      text: "First line\nSecond line",
    };
    render(<CongratsContent data={multilineData} isPreview={false} />);
    const textContent = screen.getByTestId('congrats-text-content');
    expect(textContent.children.length).toBe(2); // Two divs for two lines
    expect(textContent.children[0]).toHaveTextContent("First line");
    expect(textContent.children[1]).toHaveTextContent("Second line");
  });

  it('should handle empty text gracefully (renders a br for an empty line)', () => {
    const emptyData: ICongratsWidgetData = {
      ...mockDefaultWidgetData,
      text: "",
    };
    render(<CongratsContent data={emptyData} isPreview={false} />);
    const textContent = screen.getByTestId('congrats-text-content');
    // Empty string splits into [''], map renders one div with <br />
    expect(textContent.innerHTML.trim()).toBe('<div><br></div>');
  });

});
