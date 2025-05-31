// Import animation data statically
import * as confettiAnimationData from './animations/confetti.json';
import * as balloonsAnimationData from './animations/balloons.json';

// Define default animation style name, can be imported or defined here
const DEFAULT_ANIMATION = 'confetti';

const getAnimationDataInternal = (animationName: string | undefined): any | null => {
  if (!animationName) {
    animationName = DEFAULT_ANIMATION;
  }
  switch (animationName) {
    case 'confetti':
      return confettiAnimationData;
    case 'balloons':
      return balloonsAnimationData;
    default:
      console.error(`Animation not found: ${animationName}. Falling back to default.`);
      // Fallback to default animation if specified one is not found
      if (DEFAULT_ANIMATION === 'confetti') return confettiAnimationData;
      if (DEFAULT_ANIMATION === 'balloons') return balloonsAnimationData;
      // If default is also unknown (config error), return null
      console.error(`Default animation "${DEFAULT_ANIMATION}" also not found.`);
      return null;
  }
};

export const animationUtils = {
  getAnimationData: getAnimationDataInternal,
};
