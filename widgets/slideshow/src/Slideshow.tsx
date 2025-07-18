import React, { Component, ComponentType, JSX } from 'react'

// Assuming these will be migrated or are usable as JS with appropriate typings/shims
import GenericSlide from './Slide/Generic'
import PhotoSlide from './Slide/Photo'
import VideoSlide from './Slide/Video'
import YoutubeSlide from './Slide/Youtube'
import WebSlide from './Slide/Web'
import Progress from './Progress'
import * as z from 'zod'

import { getSlides, ISlideData, SlideActionDataSchema } from '../../../actions/slide'

const DEFAULT_SLIDE_DURATION_MS = 5000

interface SlideComponentProps {
  slide: ISlideData;
  isActive: boolean;
  show?: boolean;
  display?: string;
}

export interface ISlideInstance {
  play: () => void;
  stop: () => void;
  loadedPromise: Promise<void>;
}

export const SlideshowWidgetDefaultDataSchema = z.object({
  slideshow_id: z.string().nullable(),
  show_progressbar: z.boolean().optional(),
  transition_time: z.number().optional(),
  random_order: z.boolean().optional(),
})

export const SlideshowWidgetContentPropsSchema = z.object({
  data: SlideshowWidgetDefaultDataSchema.optional(),
  defaultDuration: z.number().optional(),
  isPreview: z.boolean().optional(),
})
export type ISlideshowWidgetContentProps = z.infer<typeof SlideshowWidgetContentPropsSchema>;

export const SlideshowWidgetContentStateSchema = z.object({
  currentSlideIndex: z.number().nullable(),
  slides: z.array(SlideActionDataSchema),
  isLoading: z.boolean(),
  isCurrentSlideReady: z.boolean(),
  error: z.string().nullable(),
})
type ISlideshowWidgetContentState = z.infer<typeof SlideshowWidgetContentStateSchema>;

class Slideshow extends Component<ISlideshowWidgetContentProps, ISlideshowWidgetContentState> {
  private slideRefs: Array<ISlideInstance | null> = []
  private slideAdvanceTimeoutId: ReturnType<typeof setTimeout> | null = null
  private _isMounted: boolean = false

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
    this._isMounted = true
    this.fetchSlidesAndStart()
  }

  componentDidUpdate(prevProps: ISlideshowWidgetContentProps) {
    if (this.props.data?.slideshow_id !== prevProps.data?.slideshow_id) {
      this.clearAdvanceTimer()
      this.slideRefs = []
      this.fetchSlidesAndStart()
    }
  }
  
  componentWillUnmount() {
    this._isMounted = false
    this.clearAdvanceTimer()
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
      if (this._isMounted) {
        this.setState({ isLoading: false, error: 'Slideshow ID not provided.', slides: [] })
      }
      return
    }

    if (this._isMounted) {
      this.setState({ isLoading: true, error: null, currentSlideIndex: null, slides: [] })
    }
    try {
      const slides = await getSlides(slideshowId)
      
      if (!this._isMounted) {
        return
      }
      
      if (slides && slides.length > 0) {
        this.slideRefs = new Array(slides.length).fill(null)
        const orderedSlides = slides
        
        this.setState({ slides: orderedSlides, currentSlideIndex: 0, isLoading: false }, () => {
          if (this._isMounted) {
            this.slideRefs[0]?.play()
            this.waitForNextSlide()
          }
        })
      } else {
        this.setState({ slides: [], currentSlideIndex: null, isLoading: false })
      }
    } catch (error) {
      console.error('Failed to fetch slides:', error)
      if (this._isMounted) {
        this.setState({ isLoading: false, error: 'Failed to load slides.' })
      }
    }
  }

  get orderedSlides(): ISlideData[] {
    return this.state.slides
  }

  advanceToNextSlide = (): void => {
    if (!this._isMounted) return;
    const { currentSlideIndex, slides } = this.state
    if (slides.length === 0 || currentSlideIndex === null) return

    const prevSlideIndex = currentSlideIndex
    const nextSlideIndex = (currentSlideIndex + 1) % slides.length

    this.slideRefs[prevSlideIndex]?.stop()

    this.setState({ currentSlideIndex: nextSlideIndex, isCurrentSlideReady: false }, () => {
      if (this._isMounted) {
        this.slideRefs[nextSlideIndex]?.play()
        this.waitForNextSlide()
      }
    })
  }

  waitForNextSlide = (): void => {
    this.clearAdvanceTimer()

    const { currentSlideIndex, slides } = this.state
    if (currentSlideIndex === null || slides.length === 0) return

    const currentSlideData = this.orderedSlides[currentSlideIndex]
    const slideRef = this.slideRefs[currentSlideIndex]

    if (slideRef && currentSlideData) {
      slideRef.loadedPromise
        .then(() => {
          if (!this._isMounted) return
          
          this.setState({ isCurrentSlideReady: true })
          const duration = (currentSlideData.duration || 0) * 1000
          const effectiveDuration = duration > 0 ? duration : (this.props.defaultDuration ?? DEFAULT_SLIDE_DURATION_MS)
          
          this.slideAdvanceTimeoutId = setTimeout(this.advanceToNextSlide, effectiveDuration)
        })
        .catch(error => {
          console.error('Error waiting for slide to load, advancing to next:', error)
          if (!this._isMounted) return
          
          this.slideAdvanceTimeoutId = setTimeout(this.advanceToNextSlide, 2000)
        })
    } else {
        if (this._isMounted) {
          this.slideAdvanceTimeoutId = setTimeout(this.advanceToNextSlide, (this.props.defaultDuration ?? DEFAULT_SLIDE_DURATION_MS))
        }
    }
  }

  private componentCache = new Map<string, ComponentType<SlideComponentProps>>()
  
  getSlideComponent = (type: string): ComponentType<SlideComponentProps> => {
    if (this.componentCache.has(type)) {
      return this.componentCache.get(type)!
    }
    
    let component: ComponentType<SlideComponentProps>
    switch (type) {
      case 'photo':
      case 'image':
        component = PhotoSlide as unknown as ComponentType<SlideComponentProps>
        break
      case 'video':
        component = VideoSlide as unknown as ComponentType<SlideComponentProps>
        break
      case 'youtube':
        component = YoutubeSlide as unknown as ComponentType<SlideComponentProps>
        break
      case 'web':
        component = WebSlide as unknown as ComponentType<SlideComponentProps>
        break
      default:
        component = GenericSlide as unknown as ComponentType<SlideComponentProps>
    }
    
    this.componentCache.set(type, component)
    return component
  }

  renderSlide = (slide: ISlideData, index: number): JSX.Element => {
    const { currentSlideIndex } = this.state;
    if (!slide.type) {
      console.error('Unknown slide type with data:', slide);
    }
    const SlideComponent = this.getSlideComponent(slide.type);

    return (
      <SlideComponent
        key={slide._id || `slide-${index}`}
        slide={slide}
        isActive={index === currentSlideIndex}
        show={index === currentSlideIndex}
      />
    );
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
      <div className='flex-1 w-full h-full'>
        <div className='relative w-full h-full overflow-hidden'>
          {this.orderedSlides.map((slide, index) => this.renderSlide(slide, index))}
        </div>
        {this.props.data?.show_progressbar !== false && currentSlideIndex !== null && (
          <Progress
            key={`progress-${currentSlideIndex}`}
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