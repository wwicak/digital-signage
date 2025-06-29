// Import animation data statically
import * as confettiAnimationData from './animations/confetti.json'
import * as balloonsAnimationData from './animations/balloons.json'

// Define default animation style name, can be imported or defined here
const DEFAULT_ANIMATION = 'confetti'

interface AnimationData {
  [key: string]: unknown;
}

const getAnimationDataInternal = (animationName: string | undefined): AnimationData | null => {
  if (!animationName) {
    animationName = DEFAULT_ANIMATION
  }

  let sourceData: AnimationData | null = null;
  switch (animationName) {
    case 'confetti':
      sourceData = confettiAnimationData
      break
    case 'balloons':
      sourceData = balloonsAnimationData
      break
    default:
      console.error(`Animation not found: ${animationName}. Falling back to default.`)
      // Fallback to default animation if specified one is not found
      if (DEFAULT_ANIMATION === 'confetti') sourceData = confettiAnimationData
      else if (DEFAULT_ANIMATION === 'balloons') sourceData = balloonsAnimationData
      else {
        console.error(`Default animation "${DEFAULT_ANIMATION}" also not found.`)
        return null
      }
  }

  // Return a mutable copy of the animation data
  return sourceData ? JSON.parse(JSON.stringify(sourceData)) : null
}

export const animationUtils = {
  getAnimationData: getAnimationDataInternal,
}
