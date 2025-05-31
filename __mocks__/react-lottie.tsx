// __mocks__/react-lottie.tsx
import React from 'react';

interface LottieProps {
  options: {
    animationData: {
      nm?: string; // Optional name property
    } | null;
    loop?: boolean;
    autoplay?: boolean;
  };
  height?: number | string;
  width?: number | string;
  isStopped?: boolean;
  isPaused?: boolean;
  eventListeners?: Array<{
    eventName: string;
    callback: () => void;
  }>;
  style?: React.CSSProperties;
  [key: string]: any; // Allow other props
}

const MockLottie: React.FC<LottieProps> = ({ options, height, width, style }) => {
  const animationName = options?.animationData?.nm || 'mock-animation';
  return (
    <div
      data-testid="mock-lottie"
      data-animation={animationName}
      style={{ height: height || 'auto', width: width || 'auto', ...style }}
    >
      Mock Lottie Animation: {animationName}
    </div>
  );
};

export default MockLottie;
