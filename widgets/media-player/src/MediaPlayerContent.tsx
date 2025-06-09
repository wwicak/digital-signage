import React, { Component, RefObject } from 'react';
import { IWidgetContentProps } from '../../base_widget';
import { MediaPlayerWidgetData } from '@/lib/models/Widget';

export interface IMediaPlayerContentProps extends IWidgetContentProps<MediaPlayerWidgetData> {}

interface IMediaPlayerContentState {
  isScheduleActive: boolean;
  error: string | null;
  isLoading: boolean;
}

class MediaPlayerContent extends Component<IMediaPlayerContentProps, IMediaPlayerContentState> {
  private mediaRef: RefObject<HTMLVideoElement | HTMLAudioElement | null>;
  private scheduleCheckInterval: NodeJS.Timeout | null = null;

  constructor(props: IMediaPlayerContentProps) {
    super(props);
    this.state = {
      isScheduleActive: true,
      error: null,
      isLoading: false,
    };
    this.mediaRef = React.createRef();
  }

  componentDidMount() {
    this.checkSchedule();
    this.setupScheduleCheck();
    this.setupMediaElement();
  }

  componentDidUpdate(prevProps: IMediaPlayerContentProps, prevState: IMediaPlayerContentState) {
    if (prevProps.data !== this.props.data) {
      this.checkSchedule();
      this.setupMediaElement();
    }

    // Handle schedule state changes
    if (prevState.isScheduleActive !== this.state.isScheduleActive) {
      this.handleScheduleChange();
    }
  }

  componentWillUnmount() {
    if (this.scheduleCheckInterval) {
      clearInterval(this.scheduleCheckInterval);
    }
  }

  setupScheduleCheck = () => {
    // Check schedule every 30 seconds for more responsive scheduling
    this.scheduleCheckInterval = setInterval(() => {
      this.checkSchedule();
    }, 30000);
  };

  checkSchedule = () => {
    const { data } = this.props;

    if (!data?.enableScheduling || !data?.schedule) {
      this.setState({ isScheduleActive: true });
      return;
    }

    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // Check if current day is in allowed days
    const { daysOfWeek, timeSlots } = data.schedule;

    if (daysOfWeek && daysOfWeek.length > 0 && !daysOfWeek.includes(currentDay)) {
      this.setState({ isScheduleActive: false });
      return;
    }

    // Check if current time is in allowed time slots
    if (timeSlots && timeSlots.length > 0) {
      const isInTimeSlot = timeSlots.some(slot => {
        return currentTime >= slot.startTime && currentTime <= slot.endTime;
      });

      // Log schedule changes for debugging
      if (this.state.isScheduleActive !== isInTimeSlot) {
        console.log(`Media player schedule changed: ${isInTimeSlot ? 'ACTIVE' : 'INACTIVE'} at ${currentTime} on day ${currentDay}`);
      }

      this.setState({ isScheduleActive: isInTimeSlot });
    } else {
      this.setState({ isScheduleActive: true });
    }
  };

  handleScheduleChange = () => {
    const mediaElement = this.mediaRef.current;
    if (!mediaElement) return;

    if (this.state.isScheduleActive) {
      // Schedule became active - start playing if autoplay is enabled
      if (this.props.data?.autoplay) {
        const playPromise = mediaElement.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.warn('Autoplay was prevented:', error);
          });
        }
      }
    } else {
      // Schedule became inactive - pause the media
      mediaElement.pause();
    }
  };

  setupMediaElement = () => {
    const { data } = this.props;
    const mediaElement = this.mediaRef.current;
    
    if (!mediaElement || !data) return;

    // Set volume and muted state
    if (typeof data.volume === 'number') {
      mediaElement.volume = Math.max(0, Math.min(1, data.volume));
    }
    
    if (data.muted !== undefined) {
      mediaElement.muted = data.muted;
    }

    // Set loop
    if (data.loop !== undefined) {
      mediaElement.loop = data.loop;
    }

    // Handle autoplay (note: browsers may block autoplay)
    if (data.autoplay && this.state.isScheduleActive) {
      const playPromise = mediaElement.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.warn('Autoplay was prevented:', error);
          this.setState({ error: 'Autoplay was blocked by the browser' });
        });
      }
    }
  };

  handleMediaError = (event: React.SyntheticEvent<HTMLMediaElement, Event>) => {
    const target = event.target as HTMLMediaElement;
    let errorMessage = 'Media playback error';
    
    if (target.error) {
      switch (target.error.code) {
        case MediaError.MEDIA_ERR_ABORTED:
          errorMessage = 'Media playback was aborted';
          break;
        case MediaError.MEDIA_ERR_NETWORK:
          errorMessage = 'Network error occurred while loading media';
          break;
        case MediaError.MEDIA_ERR_DECODE:
          errorMessage = 'Media format is not supported';
          break;
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorMessage = 'Media source is not supported';
          break;
        default:
          errorMessage = 'Unknown media error';
      }
    }
    
    this.setState({ error: errorMessage });
  };

  handleMediaLoad = () => {
    this.setState({ error: null, isLoading: false });
  };

  handleMediaLoadStart = () => {
    this.setState({ isLoading: true, error: null });
  };

  renderFallbackContent = () => {
    const { data } = this.props;
    const { error } = this.state;
    
    const fallbackBg = data?.fallbackContent?.backgroundColor || data?.backgroundColor || '#000000';
    const fallbackMessage = error || data?.fallbackContent?.message || 'Media content is not available';

    return (
      <div
        className='flex items-center justify-center w-full h-full text-white text-center p-4'
        style={{ backgroundColor: fallbackBg }}
      >
        <div>
          <div className='text-lg mb-2'>📺</div>
          <div className='text-sm'>{fallbackMessage}</div>
        </div>
      </div>
    );
  };

  renderMediaElement = () => {
    const { data } = this.props;
    
    if (!data?.url) {
      return this.renderFallbackContent();
    }

    const commonProps = {
      ref: this.mediaRef as any,
      src: data.url,
      controls: data.showControls !== false, // Default to true
      autoPlay: data.autoplay && this.state.isScheduleActive,
      loop: data.loop,
      muted: data.muted,
      onError: this.handleMediaError,
      onLoadStart: this.handleMediaLoadStart,
      onLoadedData: this.handleMediaLoad,
      className: "w-full h-full",
      style: {
        objectFit: data.fit || 'contain',
        backgroundColor: data.backgroundColor || 'transparent',
      } as React.CSSProperties,
    };

    if (data.mediaType === 'audio') {
      return (
        <div className='flex items-center justify-center w-full h-full' style={{ backgroundColor: data.backgroundColor || '#000000' }}>
          <div className='text-center text-white'>
            <div className='text-4xl mb-4'>🎵</div>
            {data.title && <div className='text-lg mb-4'>{data.title}</div>}
            <audio {...commonProps} className='w-full max-w-md' />
          </div>
        </div>
      );
    }

    // Video element
    return (
      <video {...commonProps}>
        Your browser does not support the video tag.
      </video>
    );
  };

  render() {
    const { data, isPreview } = this.props;
    const { isScheduleActive, isLoading } = this.state;

    // Show fallback if scheduling is enabled and not active (unless in preview mode)
    if (!isPreview && data?.enableScheduling && !isScheduleActive) {
      return this.renderFallbackContent();
    }

    return (
      <div className='relative w-full h-full overflow-hidden'>
        {isLoading && (
          <div className='absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white z-10'>
            <div className='text-center'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2'></div>
              <div>Loading media...</div>
            </div>
          </div>
        )}
        
        {data?.title && (
          <div className='absolute top-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 text-sm z-20'>
            {data.title}
          </div>
        )}
        
        {this.renderMediaElement()}
      </div>
    );
  }
}

export default MediaPlayerContent;
