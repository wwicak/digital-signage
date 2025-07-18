import React, { Component, RefObject } from 'react';

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

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
  isMuted: boolean;
}

class PriorityVideoDisplay extends Component<PriorityVideoDisplayProps, PriorityVideoDisplayState> {
  private mediaRef: RefObject<HTMLVideoElement | HTMLAudioElement | null>;
  private player: any;

  constructor(props: PriorityVideoDisplayProps) {
    super(props);
    this.state = {
      error: null,
      isLoading: false,
      hasPlayed: false,
      playStartTime: null,
      showClickToPlay: false,
      isMuted: true,
    };
    this.mediaRef = React.createRef();
  }

  componentDidMount() {
    this.loadYouTubeAPI();
    setTimeout(() => {
      this.setupAndPlayMedia();
    }, 100);

    document.addEventListener('keydown', this.handleKeyDown);
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.handleKeyDown);
    if (this.player) {
      this.player.destroy();
    }
  }

  handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && this.props.onExit) {
      this.props.onExit();
    }
  };

  loadYouTubeAPI = () => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  };
  
  setupAndPlayMedia = () => {
    const { data } = this.props;
    const mediaElement = this.mediaRef.current;
    
    if (!data) return;

    if (this.isYouTubeUrl(data.url)) {
      this.setupYouTubePlayer();
    } else if (mediaElement) {
      mediaElement.currentTime = 0;
      
      if (typeof data.volume === 'number') {
        mediaElement.volume = Math.max(0, Math.min(1, data.volume));
      } else {
        mediaElement.volume = 1.0;
      }
      
      mediaElement.muted = true;
  
      this.playMedia();
    }
  };

  playMedia = () => {
    const mediaElement = this.mediaRef.current;
    
    if (!mediaElement) return;

    const playPromise = mediaElement.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          this.setState({
            hasPlayed: true,
            playStartTime: Date.now()
          });
        })
        .catch(error => {
          console.error('Priority video autoplay failed:', error);
          this.setState({
            error: null,
            showClickToPlay: true
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
    if (this.props.onExit) {
      this.props.onExit();
    }
  };

  handleClickToPlay = () => {
    if (this.player) {
      this.player.unMute();
      this.player.playVideo();
      this.setState({ showClickToPlay: false, isMuted: false });
    } else {
      const mediaElement = this.mediaRef.current;
      if (mediaElement) {
        mediaElement.muted = false;
        mediaElement.play()
          .then(() => {
            this.setState({
              showClickToPlay: false,
              isMuted: false,
              hasPlayed: true,
              playStartTime: Date.now()
            });
          })
          .catch(error => {
            console.error('Manual play failed:', error);
            this.setState({ error: 'Failed to play video' });
          });
      }
    }
  };

  isYouTubeUrl = (url: string) => {
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    return youtubeRegex.test(url);
  }

  setupYouTubePlayer = () => {
    const { data } = this.props;
    const videoId = this.getYouTubeVideoId(data.url);

    if (!videoId) {
      console.error('Priority video - Could not extract YouTube video ID from:', data.url);
      return this.renderFallbackContent();
    }

    const onPlayerReady = (event: any) => {
      event.target.playVideo();
      this.setState({ hasPlayed: true, playStartTime: Date.now() });
    }

    const onPlayerStateChange = (event: any) => {
      if (event.data === window.YT.PlayerState.ENDED) {
        this.handleMediaEnded();
      }
    }
    
    window.onYouTubeIframeAPIReady = () => {
      this.player = new window.YT.Player('youtube-player', {
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          rel: 0,
          modestbranding: 1,
          mute: 1,
        },
        events: {
          'onReady': onPlayerReady,
          'onStateChange': onPlayerStateChange
        }
      });
    }
  }

  getYouTubeVideoId = (url: string): string | null => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  renderYouTubeEmbed = () => {
    return <div id="youtube-player" className="w-full h-full"></div>;
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

    let processedUrl = data.url;
    
    try {
      if (data.url.startsWith('/')) {
        processedUrl = `${window.location.origin}${data.url}`;
      } else if (!this.isYouTubeUrl(data.url)) {
        new URL(processedUrl);
      }
    } catch (error) {
      console.error('Priority video - Invalid URL format:', data.url, error);
      return this.renderFallbackContent();
    }

    if (this.isYouTubeUrl(data.url)) {
      return this.renderYouTubeEmbed();
    }

    const commonProps = {
      ref: this.mediaRef as any,
      src: processedUrl,
      controls: false,
      autoPlay: false,
      loop: false,
      muted: this.state.isMuted,
      playsInline: true,
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
          zIndex: 99999
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
