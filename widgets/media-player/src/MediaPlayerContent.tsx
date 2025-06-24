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
      isScheduleActive: false, // Start inactive until schedule is checked
      error: null,
      isLoading: false,
    };
    this.mediaRef = React.createRef();
  }

  componentDidMount() {
    // Initial schedule check and media setup
    const isActive = this.checkSchedule();
    this.setState({ isScheduleActive: isActive }, () => {
      this.setupMediaElement();
    });
    
    // Setup interval for future checks
    this.setupScheduleCheck();
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
      const isActive = this.checkSchedule();
      if (isActive !== this.state.isScheduleActive) {
        this.setState({ isScheduleActive: isActive }, () => {
          // Re-setup media element when schedule changes
          this.setupMediaElement();
        });
      }
    }, 30000);
  };

  checkSchedule = (): boolean => {
    const { data } = this.props;

    // If scheduling is not enabled, media should be active
    if (!data?.enableScheduling || !data?.schedule) {
      return true;
    }

    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // Check if current day is in allowed days
    const { daysOfWeek, timeSlots } = data.schedule;

    // Return false early if current day is not in schedule
    if (daysOfWeek && daysOfWeek.length > 0 && !daysOfWeek.includes(currentDay)) {
      return false;
    }

    // Check if current time is in allowed time slots
    // Check time slots
    if (timeSlots && timeSlots.length > 0) {
      const isInTimeSlot = timeSlots.some(slot => {
        return currentTime >= slot.startTime && currentTime <= slot.endTime;
      });

      // Log schedule state
      console.log(`Media player schedule: ${isInTimeSlot ? 'ACTIVE' : 'INACTIVE'} at ${currentTime} on day ${currentDay}`);

      return isInTimeSlot;
    }

    // If no time slots defined, media should be active
    return true;
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
    console.log('Attempting autoplay:', {
      autoplay: data.autoplay,
      isScheduleActive: this.state.isScheduleActive,
      mediaElement
    });

    if (data.autoplay && this.state.isScheduleActive) {
      // Force muted for initial autoplay (browser requirement)
      mediaElement.muted = true;
      const playPromise = mediaElement.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            // After successful autoplay, restore original muted state
            mediaElement.muted = data.muted ?? false;
          })
          .catch(error => {
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
          errorMessage = 'Network error occurred while loading media. Check your internet connection or URL.';
          break;
        case MediaError.MEDIA_ERR_DECODE:
          errorMessage = 'Media format is not supported by this browser';
          break;
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorMessage = 'Media source is not supported. Please check the URL or file format.';
          break;
        default:
          errorMessage = 'Unknown media error';
      }
    }
    
    console.error('MediaPlayer - Media error:', errorMessage, 'Source:', target.src);
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

  renderYouTubeEmbed = (youtubeUrl: string) => {
    const { data } = this.props;
    
    // Extract video ID from various YouTube URL formats
    const getYouTubeVideoId = (url: string): string | null => {
      const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
      const match = url.match(regex);
      return match ? match[1] : null;
    };

    const videoId = getYouTubeVideoId(youtubeUrl);
    if (!videoId) {
      console.error('MediaPlayer - Could not extract YouTube video ID from:', youtubeUrl);
      return this.renderFallbackContent();
    }

    // Build YouTube embed URL with parameters
    const embedUrl = new URL(`https://www.youtube.com/embed/${videoId}`);
    
    // Add YouTube embed parameters
    if (data?.autoplay && this.state.isScheduleActive) {
      embedUrl.searchParams.set('autoplay', '1');
    }
    if (data?.loop) {
      embedUrl.searchParams.set('loop', '1');
      embedUrl.searchParams.set('playlist', videoId); // Required for loop to work
    }
    if (data?.muted) {
      embedUrl.searchParams.set('mute', '1');
    }
    if (data?.showControls === false) {
      embedUrl.searchParams.set('controls', '0');
    }
    
    // Additional YouTube parameters
    embedUrl.searchParams.set('rel', '0'); // Don't show related videos
    embedUrl.searchParams.set('modestbranding', '1'); // Reduce YouTube branding

    return (
      <iframe
        src={embedUrl.toString()}
        className="w-full h-full"
        style={{
          backgroundColor: data?.backgroundColor || 'transparent',
        }}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title={data?.title || 'YouTube Video'}
      />
    );
  };

  renderMediaElement = () => {
    const { data } = this.props;
    
    if (!data?.url) {
      return this.renderFallbackContent();
    }

    // Process and validate URL
    let processedUrl = data.url;
    let isYouTubeUrl = false;
    
    try {
      // Handle relative URLs by converting to absolute
      if (data.url.startsWith('/')) {
        processedUrl = `${window.location.origin}${data.url}`;
      }
      
      // Check if it's a YouTube URL and convert it
      const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
      const match = data.url.match(youtubeRegex);
      
      if (match) {
        isYouTubeUrl = true;
        // For YouTube, we'll need to use iframe embed instead of video element
        processedUrl = data.url; // Keep original for iframe
      } else {
        // Validate URL format for non-YouTube URLs
        new URL(processedUrl);
      }
    } catch (error) {
      console.error('MediaPlayer - Invalid URL format:', data.url, error);
      return this.renderFallbackContent();
    }

    // Handle YouTube URLs with iframe
    if (isYouTubeUrl) {
      return this.renderYouTubeEmbed(processedUrl);
    }

    const commonProps: React.DetailedHTMLProps<React.AudioHTMLAttributes<HTMLAudioElement>, HTMLAudioElement> & React.DetailedHTMLProps<React.VideoHTMLAttributes<HTMLVideoElement>, HTMLVideoElement> = {
      ref: this.mediaRef as React.RefObject<HTMLAudioElement & HTMLVideoElement>,
      src: processedUrl,
      controls: data.showControls !== false, // Default to true
      autoPlay: data.autoplay && this.state.isScheduleActive,
      loop: data.loop,
      muted: data.muted,
      onError: this.handleMediaError,
      onLoadStart: this.handleMediaLoadStart,
      onLoadedData: this.handleMediaLoad,
      className: "w-full h-full",
      preload: "metadata", // Preload metadata for better UX
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
      <video {...commonProps} crossOrigin="anonymous">
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
