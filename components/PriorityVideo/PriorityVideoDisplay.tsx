import React, { Component, RefObject } from 'react';

export interface PriorityVideoData {
  title?: string;
  url: string;
  mediaType: "video" | "audio";
  backgroundColor: string;
  schedule: {
    daysOfWeek: number[];
    timeSlots: Array<{
      startTime: string;
      endTime: string;
    }>;
  };
  volume: number;
  fallbackContent: {
    message: string;
    backgroundColor: string;
  };
  priority: number;
  playOnce: boolean;
}

export interface PriorityVideoDisplayProps {
  data: PriorityVideoData;
  onExit?: () => void;
}

interface PriorityVideoDisplayState {
  error: string | null;
  isLoading: boolean;
  hasPlayed: boolean;
  playStartTime: number | null;
  showClickToPlay: boolean;
}

class PriorityVideoDisplay extends Component<PriorityVideoDisplayProps, PriorityVideoDisplayState> {
  private mediaRef: RefObject<HTMLVideoElement | HTMLAudioElement | null>;

  constructor(props: PriorityVideoDisplayProps) {
    super(props);
    this.state = {
      error: null,
      isLoading: false,
      hasPlayed: false,
      playStartTime: null,
      showClickToPlay: false,
    };
    this.mediaRef = React.createRef();
  }

  componentDidMount() {
    // Setup and play media immediately when component mounts (it's fullscreen)
    setTimeout(() => {
      this.setupAndPlayMedia();
    }, 100);

    // Listen for escape key to exit priority mode
    document.addEventListener('keydown', this.handleKeyDown);
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  handleKeyDown = (event: KeyboardEvent) => {
    // Allow escape key to exit priority mode
    if (event.key === 'Escape' && this.props.onExit) {
      this.props.onExit();
    }
  };

  setupAndPlayMedia = () => {
    const { data } = this.props;
    const mediaElement = this.mediaRef.current;
    
    if (!mediaElement || !data) return;

    console.log('Setting up and playing priority video media');

    // Reset any previous state
    mediaElement.currentTime = 0;
    
    // Set volume but keep muted initially for autoplay
    if (typeof data.volume === 'number') {
      mediaElement.volume = Math.max(0, Math.min(1, data.volume));
    } else {
      mediaElement.volume = 1.0; // Default to full volume
    }
    
    // Always start muted for autoplay compatibility
    mediaElement.muted = true;

    // Try to play immediately (works best for autoplay)
    this.playMedia();
  };

  playMedia = () => {
    const { data } = this.props;
    const mediaElement = this.mediaRef.current;
    
    if (!mediaElement || !data) return;

    console.log('Playing priority video media');

    // Play the media
    const playPromise = mediaElement.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log('Priority video started playing successfully');
          this.setState({
            hasPlayed: true,
            playStartTime: Date.now()
          });
          
          // Unmute after successful start (if volume > 0)
          setTimeout(() => {
            if (mediaElement && (data.volume === undefined || data.volume > 0)) {
              console.log('Unmuting priority video');
              mediaElement.muted = false;
            }
          }, 1000);
        })
        .catch(error => {
          console.error('Priority video autoplay failed:', error);
          this.setState({
            error: null, // Clear error to avoid showing error message
            showClickToPlay: true // Show click to play overlay instead
          });
        });
    }
  };

  handleMediaError = (event: React.SyntheticEvent<HTMLMediaElement, Event>) => {
    const target = event.target as HTMLMediaElement;
    let errorMessage = 'Priority video playback error';
    
    if (target.error) {
      switch (target.error.code) {
        case MediaError.MEDIA_ERR_ABORTED:
          errorMessage = 'Video playback was aborted';
          break;
        case MediaError.MEDIA_ERR_NETWORK:
          errorMessage = 'Network error occurred while loading video';
          break;
        case MediaError.MEDIA_ERR_DECODE:
          errorMessage = 'Video format is not supported';
          break;
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorMessage = 'Video source is not supported';
          break;
        default:
          errorMessage = 'Unknown video error';
      }
    }
    
    console.error('Priority video error:', errorMessage, 'Source:', target.src);
    this.setState({ error: errorMessage });
  };

  handleMediaLoad = () => {
    this.setState({ error: null, isLoading: false });
  };

  handleMediaLoadStart = () => {
    this.setState({ isLoading: true, error: null });
  };

  handleMediaEnded = () => {
    console.log('Priority video playback ended');
    // Exit priority mode when video ends
    if (this.props.onExit) {
      this.props.onExit();
    }
  };

  handleClickToPlay = () => {
    const mediaElement = this.mediaRef.current;
    if (mediaElement) {
      // This is triggered by user interaction, so autoplay restrictions don't apply
      mediaElement.play()
        .then(() => {
          console.log('Priority video started playing after user interaction');
          this.setState({
            showClickToPlay: false,
            hasPlayed: true,
            playStartTime: Date.now()
          });
          
          // Unmute after successful start
          setTimeout(() => {
            if (mediaElement && (this.props.data?.volume === undefined || this.props.data?.volume > 0)) {
              mediaElement.muted = false;
            }
          }, 500);
        })
        .catch(error => {
          console.error('Manual play failed:', error);
          this.setState({ error: 'Failed to play video' });
        });
    }
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
      console.error('Priority video - Could not extract YouTube video ID from:', youtubeUrl);
      return this.renderFallbackContent();
    }

    // Build YouTube embed URL with parameters
    const embedUrl = new URL(`https://www.youtube.com/embed/${videoId}`);
    
    // Add YouTube embed parameters for priority video
    embedUrl.searchParams.set('autoplay', '1');
    embedUrl.searchParams.set('mute', '1'); // Start muted
    embedUrl.searchParams.set('controls', '0'); // Hide controls for priority video
    embedUrl.searchParams.set('rel', '0'); // Don't show related videos
    embedUrl.searchParams.set('modestbranding', '1'); // Reduce YouTube branding

    return (
      <iframe
        src={embedUrl.toString()}
        className="w-full h-full"
        style={{
          backgroundColor: data?.backgroundColor || '#000000',
        }}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title={data?.title || 'Priority Video'}
        onLoad={() => {
          this.setState({ hasPlayed: true, playStartTime: Date.now() });
        }}
      />
    );
  };

  renderFallbackContent = () => {
    const { data } = this.props;
    const { error } = this.state;
    
    const fallbackBg = data?.fallbackContent?.backgroundColor || data?.backgroundColor || '#000000';
    const fallbackMessage = error || data?.fallbackContent?.message || 'Priority video is not available';

    return (
      <div
        className='flex items-center justify-center w-full h-full text-white text-center p-4'
        style={{ backgroundColor: fallbackBg }}
      >
        <div>
          <div className='text-lg mb-2'>⚡</div>
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
        processedUrl = data.url; // Keep original for iframe
      } else {
        // Validate URL format for non-YouTube URLs
        new URL(processedUrl);
      }
    } catch (error) {
      console.error('Priority video - Invalid URL format:', data.url, error);
      return this.renderFallbackContent();
    }

    // Handle YouTube URLs with iframe
    if (isYouTubeUrl) {
      return this.renderYouTubeEmbed(processedUrl);
    }

    const commonProps = {
      ref: this.mediaRef as any,
      src: processedUrl,
      controls: false, // Priority video doesn't show controls
      autoPlay: false, // We control autoplay manually
      loop: false, // Priority video doesn't loop
      muted: true, // Start muted
      playsInline: true, // Important for mobile devices
      onError: this.handleMediaError,
      onLoadStart: this.handleMediaLoadStart,
      onLoadedData: this.handleMediaLoad,
      onCanPlay: this.handleMediaLoad,
      onEnded: this.handleMediaEnded,
      className: "w-full h-full",
      crossOrigin: "anonymous" as const,
      preload: "auto" as const,
      style: {
        objectFit: 'contain' as const,
        backgroundColor: data.backgroundColor || '#000000',
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
    const { data } = this.props;
    const { isLoading } = this.state;

    return (
      <div
        className='fixed inset-0 z-[99999] bg-black'
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 99999 // Maximum z-index to ensure it's above everything
        }}
      >
        {isLoading && (
          <div className='absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white z-10'>
            <div className='text-center'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2'></div>
              <div>Loading priority video...</div>
            </div>
          </div>
        )}
        
        {/* Click to play overlay when autoplay is blocked */}
        {this.state.showClickToPlay && (
          <div
            className='absolute inset-0 flex items-center justify-center bg-black bg-opacity-80 text-white z-30 cursor-pointer'
            onClick={this.handleClickToPlay}
          >
            <div className='text-center'>
              <div className='text-6xl mb-4'>▶️</div>
              <div className='text-xl mb-2'>Click to Play Priority Video</div>
              <div className='text-sm opacity-75'>Autoplay was blocked by your browser</div>
            </div>
          </div>
        )}
        
        {data?.title && (
          <div className='absolute top-0 left-0 right-0 bg-black bg-opacity-75 text-white p-4 text-center text-xl z-20'>
            {data.title}
          </div>
        )}
        
        {this.renderMediaElement()}
        
        <div className='absolute bottom-4 right-4 text-white text-sm bg-black bg-opacity-50 px-2 py-1 rounded z-20'>
          Priority Video • ESC to exit
        </div>
      </div>
    );
  }
}

export default PriorityVideoDisplay;