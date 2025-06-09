import React, { Component, ComponentType, JSX } from 'react'

// Assuming these will be migrated or are usable as JS with appropriate typings/shims
import GenericSlide from './Slide/Generic'
import PhotoSlide from './Slide/Photo'
import VideoSlide from './Slide/Video'
import YoutubeSlide from './Slide/Youtube'
import WebSlide from './Slide/Web'
import Progress from './Progress'
import * as z from 'zod'

import { getSlides, ISlideData, SlideActionDataSchema } from '../../../actions/slide' // ISlideData is z.infer<SlideActionDataSchema>
// This is an interface

const DEFAULT_SLIDE_DURATION_MS = 5000

// Interface for slide component refs - Zod not typically used here
export interface ISlideInstance {
  play: () => void;
  stop: () => void;
  loadedPromise: Promise<void>;
}

// Zod schema for ISlideshowWidgetDefaultData
export const SlideshowWidgetDefaultDataSchema = z.object({
  slideshow_id: z.string().nullable(),
  show_progressbar: z.boolean().optional(),
  transition_time: z.number().optional(),
  random_order: z.boolean().optional(),
})
/*
 * We don't infer type for ISlideshowWidgetDefaultData here as it's imported from index.ts
 * and used as a base for props.data. The schema is for validation if needed.
 */

// Zod schema for Slideshow content component props
export const SlideshowWidgetContentPropsSchema = z.object({
  data: SlideshowWidgetDefaultDataSchema.optional(),
  defaultDuration: z.number().optional(),
  isPreview: z.boolean().optional(),
})
export type ISlideshowWidgetContentProps = z.infer<typeof SlideshowWidgetContentPropsSchema>;

// Zod schema for Slideshow content component state
export const SlideshowWidgetContentStateSchema = z.object({
  currentSlideIndex: z.number().nullable(),
  slides: z.array(SlideActionDataSchema), // Use SlideActionDataSchema from actions
  isLoading: z.boolean(),
  isCurrentSlideReady: z.boolean(),
  error: z.string().nullable(),
})
type ISlideshowWidgetContentState = z.infer<typeof SlideshowWidgetContentStateSchema>;

class Slideshow extends Component<ISlideshowWidgetContentProps, ISlideshowWidgetContentState> {
  private slideRefs: Array<ISlideInstance | null> = []
  private slideAdvanceTimeoutId: ReturnType<typeof setTimeout> | null = null
  private isMounted: boolean = false

  constructor(props: ISlideshowWidgetContentProps) {
    super(props)
    this.slideRefs = []
    this.state = {
      currentSlideIndex: null,
      slides: [],
      isLoading: true,
      isCurrentSlideReady: false,
      error: null,
    }
  }
  async componentDidMount() {
    this.isMounted = true
    this.fetchSlidesAndStart()
  }

  componentDidUpdate(prevProps: ISlideshowWidgetContentProps) {
    // If slideshow_id changes, re-fetch slides
    if (this.props.data?.slideshow_id !== prevProps.data?.slideshow_id) {
      this.clearAdvanceTimer() // Clear existing timer before fetching new slides
      this.slideRefs = [] // Reset refs
      this.fetchSlidesAndStart()
    }
  }
  componentWillUnmount() {
    this.isMounted = false
    this.clearAdvanceTimer()
    // Optionally call stop() on the current slide if active
    if (this.state.currentSlideIndex !== null && this.slideRefs[this.state.currentSlideIndex]) {
        this.slideRefs[this.state.currentSlideIndex]?.stop()
    }
  }
  
  clearAdvanceTimer(): void {
    if (this.slideAdvanceTimeoutId) {
      clearTimeout(this.slideAdvanceTimeoutId)
      this.slideAdvanceTimeoutId = null
    }
  }

  fetchSlidesAndStart = async (): Promise<void> => {
    const slideshowId = this.props.data?.slideshow_id
    if (!slideshowId) {
      this.setState({ isLoading: false, error: 'Slideshow ID not provided.', slides: [] })
      return
    }

    this.setState({ isLoading: true, error: null, currentSlideIndex: null, slides: [] })
    try {
      const slides = await getSlides(slideshowId)
      
      // Check if component is still mounted after async operation
      if (!this.isMounted) {
        return
      }
      
      if (slides && slides.length > 0) {
        this.slideRefs = new Array(slides.length).fill(null)
        /*
         * Keep slides in the order they come from the API
         * If there's a specific order field, it would need to be added to the ISlideData interface
         */
        const orderedSlides = slides
        
        this.setState({ slides: orderedSlides, currentSlideIndex: 0, isLoading: false }, () => {
          if (this.isMounted) {
            this.slideRefs[0]?.play() // Play the first slide
            this.waitForNextSlide()
          }
        })
      } else {
        this.setState({ slides: [], currentSlideIndex: null, isLoading: false })
      }
    } catch (error) {
      console.error('Failed to fetch slides:', error)
      if (this.isMounted) {
        this.setState({ isLoading: false, error: 'Failed to load slides.' })
      }
    }
  }

  get orderedSlides(): ISlideData[] {
    // The sorting is now done once after fetching. This getter can just return the state.
    return this.state.slides
  }

  advanceToNextSlide = (): void => {
    const { currentSlideIndex, slides } = this.state
    if (slides.length === 0 || currentSlideIndex === null) return

    const prevSlideIndex = currentSlideIndex
    const nextSlideIndex = (currentSlideIndex + 1) % slides.length

    // Stop the current slide first
    this.slideRefs[prevSlideIndex]?.stop()

    this.setState({ currentSlideIndex: nextSlideIndex, isCurrentSlideReady: false }, () => {
      // Start the new slide after state update
      this.slideRefs[nextSlideIndex]?.play()
      this.waitForNextSlide() // Schedule next advance
    })
  }

  waitForNextSlide = (): void => {
    this.clearAdvanceTimer() // Clear any existing timer first

    const { currentSlideIndex, slides } = this.state
    if (currentSlideIndex === null || slides.length === 0) return

    const currentSlideData = this.orderedSlides[currentSlideIndex]
    const slideRef = this.slideRefs[currentSlideIndex]

    if (slideRef && currentSlideData) {
      slideRef.loadedPromise
        .then(() => {
          // Check if component is still mounted before setting state or timers
          if (!this.isMounted) return
          
          this.setState({ isCurrentSlideReady: true })
          const duration = (currentSlideData.duration || 0) * 1000 // Convert seconds to ms
          const effectiveDuration = duration > 0 ? duration : (this.props.defaultDuration ?? DEFAULT_SLIDE_DURATION_MS)
          
          this.slideAdvanceTimeoutId = setTimeout(this.advanceToNextSlide, effectiveDuration)
        })
        .catch(error => {
          console.error('Error waiting for slide to load, advancing to next:', error)
          // Check if component is still mounted before setting timers
          if (!this.isMounted) return
          
          // Advance to next slide even if current one fails to load after a short delay
          this.slideAdvanceTimeoutId = setTimeout(this.advanceToNextSlide, 2000)
        })
    } else {
        // If no slideRef or currentSlideData, try to advance after a short delay (e.g., if slides are empty)
        if (this.isMounted) {
          this.slideAdvanceTimeoutId = setTimeout(this.advanceToNextSlide, (this.props.defaultDuration ?? DEFAULT_SLIDE_DURATION_MS))
        }
    }
  }

  // Memoize component selection for better performance in class components
  private componentCache = new Map<string, ComponentType<any>>()
  
  getSlideComponent = (type: string): ComponentType<any> => {
    // Use manual caching for performance optimization in class components
    if (this.componentCache.has(type)) {
      return this.componentCache.get(type)!
    }
    
    let component: ComponentType<any>
    switch (type) {
      case 'photo':
      case 'image':
        component = PhotoSlide
        break
      case 'video':
        component = VideoSlide
        break
      case 'youtube':
        component = YoutubeSlide
        break
      case 'web':
        component = WebSlide
        break
      // Add cases for 'announcement', 'list', 'congrats' etc. if they can be part of a slideshow
      default:
        component = GenericSlide // Fallback for unknown or generic types
    }
    
    this.componentCache.set(type, component)
    return component
  }

  renderSlide = (slide: ISlideData, index: number): JSX.Element => {
    const { currentSlideIndex } = this.state
    const SlideComponent = this.getSlideComponent(slide.type)

    return (
      <SlideComponent
        key={slide._id || `slide-${index}`} // Use slide._id for key
        slide={slide} // Pass full slide data
        show={index === currentSlideIndex} // Prop to control visibility/activity
        ref={(ref: ISlideInstance | null) => (this.slideRefs[index] = ref)}
        // Other props like isPreview can be passed here if needed
      />
    )
  }

  render() {
    const { defaultDuration = DEFAULT_SLIDE_DURATION_MS } = this.props
    const { currentSlideIndex, slides, isCurrentSlideReady, isLoading, error } = this.state

    if (isLoading) {
      return (
        <div className='flex items-center justify-center h-full w-full bg-gray-100'>
          <div className='text-center'>
            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4'></div>
            <p className='text-gray-600'>Loading Slideshow...</p>
          </div>
        </div>
      )
    }
    if (error) {
      return (
        <div className='flex items-center justify-center h-full w-full bg-red-50'>
          <div className='text-center p-6'>
            <div className='text-red-600 text-4xl mb-4'>⚠️</div>
            <h3 className='text-lg font-semibold text-red-800 mb-2'>Slideshow Error</h3>
            <p className='text-red-600'>{error}</p>
          </div>
        </div>
      )
    }
    if (slides.length === 0 && !this.props.data?.slideshow_id) {
      return (
        <div className='flex items-center justify-center h-full w-full bg-yellow-50'>
          <div className='text-center p-6'>
            <div className='text-yellow-600 text-4xl mb-4'>📋</div>
            <h3 className='text-lg font-semibold text-yellow-800 mb-2'>No Slideshow Configured</h3>
            <p className='text-yellow-600'>Please configure a slideshow for this widget.</p>
          </div>
        </div>
      )
    }
    if (slides.length === 0) {
      return (
        <div className='flex items-center justify-center h-full w-full bg-blue-50'>
          <div className='text-center p-6'>
            <div className='text-blue-600 text-4xl mb-4'>📷</div>
            <h3 className='text-lg font-semibold text-blue-800 mb-2'>Empty Slideshow</h3>
            <p className='text-blue-600'>This slideshow has no slides. Add some content to get started.</p>
          </div>
        </div>
      )
    }

    return (
      <div className='flex-1 w-full h-full'> {/* Renamed class */}
        <div className='relative w-full h-full overflow-hidden'>
          {this.orderedSlides.map((slide, index) => this.renderSlide(slide, index))}
        </div>
        {this.props.data?.show_progressbar !== false && currentSlideIndex !== null && (
          <Progress
            key={`progress-${currentSlideIndex}`} // Force re-mount for progress animation
            current={currentSlideIndex}
            defaultDuration={defaultDuration}
            orderedSlides={this.orderedSlides}
            ready={isCurrentSlideReady}
          />
        )}
        
      </div>
    )
  }
}

export default Slideshow