import React, { Component } from 'react';
import { Input, IChoice } from '../../../components/Form';
import { IWidgetOptionsEditorProps } from '../../base_widget';
import { PriorityVideoWidgetData } from '@/lib/models/Widget';
import { Badge } from '@/components/ui/badge';
import {
  Zap,
  Clock,
  Calendar,
  Upload,
  Settings,
  Eye,
  AlertCircle,
  Plus,
  Trash2,
  FileVideo,
  FileAudio,
  Volume2,
  VolumeX
} from 'lucide-react';
import axios from 'axios';
import PriorityVideoContent from './PriorityVideoContent';

interface IPriorityVideoOptionsState extends PriorityVideoWidgetData {
  // Additional state for UI
  uploadError?: string;
  isUploading?: boolean;
}

const dayChoices: IChoice[] = [
  { id: '0', label: 'Sunday' },
  { id: '1', label: 'Monday' },
  { id: '2', label: 'Tuesday' },
  { id: '3', label: 'Wednesday' },
  { id: '4', label: 'Thursday' },
  { id: '5', label: 'Friday' },
  { id: '6', label: 'Saturday' },
];

class PriorityVideoOptions extends Component<IWidgetOptionsEditorProps<PriorityVideoWidgetData>, IPriorityVideoOptionsState> {
  constructor(props: IWidgetOptionsEditorProps<PriorityVideoWidgetData>) {
    super(props);
    
    // Initialize state from props.data with defaults
    const {
      title = '',
      url = '',
      mediaType = 'video',
      backgroundColor = '#000000',
      schedule = {
        daysOfWeek: [],
        timeSlots: [{ startTime: '22:00', endTime: '22:05' }],
      },
      volume = 1,
      fallbackContent = {
        message: 'Priority video is not scheduled',
        backgroundColor: '#000000',
      },
      priority = 100,
      playOnce = true,
    } = props.data || {};

    this.state = {
      title,
      url,
      mediaType,
      backgroundColor,
      schedule,
      volume,
      fallbackContent,
      priority,
      playOnce,
      uploadError: undefined,
      isUploading: false,
    };
  }

  componentDidUpdate(prevProps: IWidgetOptionsEditorProps<PriorityVideoWidgetData>) {
    if (this.props.data !== prevProps.data && this.props.data) {
      this.setState({ ...this.props.data });
    }
  }

  handleChange = async (name: string, value: any): Promise<void> => {
    const { onChange } = this.props;
    let finalName: keyof IPriorityVideoOptionsState = name as keyof IPriorityVideoOptionsState;
    let finalValue = value;

    // Handle file upload
    if (name === 'upload') {
      finalName = 'url';
      if (value instanceof File) {
        try {
          this.setState({ isUploading: true, uploadError: undefined });
          const formData = new FormData();
          formData.append('mediaFile', value);
          
          const response = await axios.post('/api/media/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          
          finalValue = response.data.url;
          
          // Auto-detect media type based on uploaded file
          if (response.data.mediaType) {
            this.setState({ mediaType: response.data.mediaType });
          }
          
          this.setState({ isUploading: false });
        } catch (error: any) {
          console.error('Media upload failed:', error);
          this.setState({
            uploadError: error.response?.data?.message || 'Upload failed',
            isUploading: false
          });
          finalValue = this.state.url; // Keep existing URL
        }
      } else if (typeof value === 'string') {
        finalValue = value;
        
        // Enhanced URL validation
        if (value) {
          try {
            const url = new URL(value);
            // Check if it's a valid media URL pattern
            const validProtocols = ['http:', 'https:'];
            
            if (!validProtocols.includes(url.protocol)) {
              throw new Error('URL must use HTTP or HTTPS protocol');
            }
            
            // Check if it's a YouTube URL (allowed) or validate as direct media URL
            const youtubeRegex = /(?:youtube\.com|youtu\.be)/i;
            const isYouTubeUrl = youtubeRegex.test(url.hostname);
            
            if (isYouTubeUrl) {
              // Additional validation for YouTube URLs
              const videoIdRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
              if (!videoIdRegex.test(value)) {
                throw new Error('Invalid YouTube URL format');
              }
            }
            
            this.setState({ uploadError: undefined });
          } catch (error) {
            const errorMessage = `Invalid URL: ${error instanceof Error ? error.message : 'Please enter a valid URL'}`;
            this.setState({ uploadError: errorMessage });
          }
        } else {
          this.setState({ uploadError: undefined });
        }
      } else {
        finalValue = '';
      }
    }

    // Handle schedule days selection
    if (name === 'scheduleDays') {
      finalName = 'schedule';
      const currentSchedule = this.state.schedule || { daysOfWeek: [], timeSlots: [] };
      finalValue = {
        ...currentSchedule,
        daysOfWeek: Array.isArray(value) ? value.map(Number) : [],
      };
    }

    // Handle time slot changes
    if (name.startsWith('timeSlot_')) {
      const [, index, field] = name.split('_');
      const slotIndex = parseInt(index);
      finalName = 'schedule';
      const currentSchedule = this.state.schedule || { daysOfWeek: [], timeSlots: [] };
      const timeSlots = [...(currentSchedule.timeSlots || [])];
      
      if (!timeSlots[slotIndex]) {
        timeSlots[slotIndex] = { startTime: '22:00', endTime: '22:05' };
      }
      
      timeSlots[slotIndex] = {
        ...timeSlots[slotIndex],
        [field]: value,
      };
      
      finalValue = {
        ...currentSchedule,
        timeSlots,
      };
    }

    // Handle fallback content changes
    if (name.startsWith('fallback_')) {
      const field = name.replace('fallback_', '');
      finalName = 'fallbackContent';
      finalValue = {
        ...this.state.fallbackContent,
        [field]: value,
      };
    }

    this.setState(
      { [finalName]: finalValue } as Pick<IPriorityVideoOptionsState, keyof IPriorityVideoOptionsState>,
      () => {
        if (onChange) {
          const { uploadError, isUploading, ...dataToSave } = this.state;
          onChange(dataToSave);
        }
      }
    );
  };

  addTimeSlot = () => {
    const currentSchedule = this.state.schedule || { daysOfWeek: [], timeSlots: [] };
    const newTimeSlots = [
      ...(currentSchedule.timeSlots || []),
      { startTime: '22:00', endTime: '22:05' },
    ];
    
    this.handleChange('schedule', {
      ...currentSchedule,
      timeSlots: newTimeSlots,
    });
  };

  removeTimeSlot = (index: number) => {
    const currentSchedule = this.state.schedule || { daysOfWeek: [], timeSlots: [] };
    const newTimeSlots = (currentSchedule.timeSlots || []).filter((_, i) => i !== index);
    
    this.handleChange('schedule', {
      ...currentSchedule,
      timeSlots: newTimeSlots,
    });
  };

  render() {
    const {
      title = '',
      url = '',
      mediaType = 'video',
      backgroundColor = '#000000',
      schedule = { daysOfWeek: [], timeSlots: [] },
      volume = 1,
      fallbackContent = { message: '', backgroundColor: '#000000' },
      priority = 100,
      playOnce = true,
      uploadError,
      isUploading,
    } = this.state;

    const previewData: PriorityVideoWidgetData = {
      title,
      url,
      mediaType,
      backgroundColor,
      schedule: {
        ...schedule,
        timeSlots: [{ startTime: '00:00', endTime: '23:59' }], // Always active in preview
      },
      volume,
      fallbackContent,
      priority,
      playOnce: false, // Don't restrict playback in preview
    };

    return (
      <div className='space-y-8'>
        {/* Header */}
        <div className='bg-gradient-to-r from-orange-600 to-red-600 rounded-xl p-6 text-white shadow-lg'>
          <div className='flex items-center gap-3 mb-2'>
            <div className='p-2 bg-white/20 rounded-lg'>
              <Zap className='w-6 h-6' />
            </div>
            <h1 className='text-xl font-bold'>Priority Scheduled Video Configuration</h1>
          </div>
          <p className='text-orange-100'>High-priority video that takes over the display at scheduled times</p>
        </div>

        {/* Main Content - Responsive Grid Layout */}
        <div className='grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8'>
          {/* Configuration Panel - Responsive Column Span */}
          <div className='xl:col-span-2 space-y-6'>
            
            {/* Media Source Section */}
            <div className='bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden'>
              <div className='bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200'>
                <div className='flex items-center gap-3'>
                  <div className='p-2 bg-blue-100 rounded-lg'>
                    <Upload className='w-5 h-5 text-blue-600' />
                  </div>
                  <div>
                    <h3 className='text-lg font-semibold text-gray-900'>Media Source</h3>
                    <p className='text-sm text-gray-600'>Upload or specify your priority video content</p>
                  </div>
                </div>
              </div>
              
              <div className='p-6 space-y-6'>
                <Input
                  label='Title (Optional)'
                  type='text'
                  name='title'
                  value={title}
                  placeholder='Enter a title for your priority video...'
                  onChange={this.handleChange}
                />

                <div>
                  <div className='space-y-4'>
                    <Input
                      label='Media URL'
                      type='url'
                      name='upload'
                      value={url}
                      placeholder='https://example.com/video.mp4 or https://youtube.com/watch?v=...'
                      onChange={this.handleChange}
                      helpText='Enter a direct URL to a video/audio file, or a YouTube URL'
                    />
                    
                    <div className='text-center text-gray-500 text-sm font-medium'>
                      OR
                    </div>
                    
                    <Input
                      label='Upload Media File'
                      type='photo'
                      name='upload'
                      value={url}
                      onChange={this.handleChange}
                      accept={{
                        'video/mp4': ['.mp4'],
                        'video/webm': ['.webm'],
                        'video/quicktime': ['.mov'],
                        'audio/mpeg': ['.mp3'],
                        'audio/wav': ['.wav'],
                        'audio/ogg': ['.ogg'],
                      }}
                    />
                  </div>
                  {isUploading && (
                    <div className='flex items-center gap-2 mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg'>
                      <div className='w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin'></div>
                      <span className='text-sm text-blue-700 font-medium'>Uploading media file...</span>
                    </div>
                  )}
                  {uploadError && (
                    <div className='flex items-center gap-2 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg'>
                      <AlertCircle className='w-4 h-4 text-red-600' />
                      <span className='text-sm text-red-700'>{uploadError}</span>
                    </div>
                  )}
                  <div className='mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg'>
                    <p className='text-sm text-gray-600'>
                      <strong>Supported formats:</strong> MP4, WebM, MOV (video) | MP3, WAV, OGG (audio) | YouTube URLs
                    </p>
                    <p className='text-sm text-gray-600 mt-1'>
                      <strong>Maximum file size:</strong> 50MB (for uploads)
                    </p>
                  </div>
                </div>

                {/* Responsive Grid for Media Type and Background */}
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6'>
                  <div className='flex flex-col'>
                    <Input
                      label='Media Type'
                      type='select'
                      name='mediaType'
                      value={mediaType}
                      choices={[
                        { id: 'video', label: '🎥 Video' },
                        { id: 'audio', label: '🎵 Audio' },
                      ]}
                      onChange={this.handleChange}
                    />
                  </div>
                  <div className='flex flex-col'>
                    <Input
                      label='Background Color'
                      type='color'
                      name='backgroundColor'
                      value={backgroundColor}
                      onChange={this.handleChange}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Priority Settings Section */}
            <div className='bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden'>
              <div className='bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200'>
                <div className='flex items-center gap-3'>
                  <div className='p-2 bg-orange-100 rounded-lg'>
                    <Settings className='w-5 h-5 text-orange-600' />
                  </div>
                  <div>
                    <h3 className='text-lg font-semibold text-gray-900'>Priority Settings</h3>
                    <p className='text-sm text-gray-600'>Configure video priority and playback behavior</p>
                  </div>
                </div>
              </div>
              
              <div className='p-6 space-y-6'>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  <Input
                    label='Priority Level'
                    type='number'
                    name='priority'
                    value={priority}
                    min={1}
                    max={999}
                    helpText='Higher numbers = higher priority (1-999)'
                    onChange={this.handleChange}
                  />
                  
                  <div className='flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200'>
                    <div className='flex items-center gap-3 flex-1'>
                      <div className='w-6 h-6 flex items-center justify-center flex-shrink-0'>
                        <div className='w-3 h-3 bg-orange-600 rounded-full'></div>
                      </div>
                      <div className='flex-1'>
                        <label className='text-sm font-medium text-gray-900 block'>Play Once Only</label>
                        <p className='text-xs text-gray-600'>Play only once per schedule activation</p>
                      </div>
                    </div>
                    <div className='flex-shrink-0 ml-3'>
                      <Input
                        type='checkbox'
                        name='playOnce'
                        label=''
                        checked={playOnce}
                        onChange={(name, checked) => this.handleChange(name, checked)}
                      />
                    </div>
                  </div>
                </div>

                {/* Volume Control */}
                <div className='bg-white rounded-lg border border-gray-200 p-4'>
                  <div className='flex items-center gap-3 mb-4'>
                    <div className='w-6 h-6 flex items-center justify-center flex-shrink-0'>
                      <Volume2 className='w-5 h-5 text-gray-600' />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <label className='text-sm font-medium text-gray-900 block'>Volume Level</label>
                      <p className='text-xs text-gray-600'>Control playback volume (0.0 - 1.0)</p>
                    </div>
                  </div>
                  <div className='space-y-3'>
                    <Input
                      label=''
                      type='number'
                      name='volume'
                      value={volume}
                      min={0}
                      max={1}
                      step={0.1}
                      onChange={this.handleChange}
                    />
                    <div className='flex justify-between text-xs text-gray-500 px-1'>
                      <span className='flex items-center gap-1'>
                        <VolumeX className='w-3 h-3' />
                        Silent (0.0)
                      </span>
                      <span className='flex items-center gap-1'>
                        <Volume2 className='w-3 h-3' />
                        Maximum (1.0)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Scheduling Section - Always Required */}
            <div className='bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden'>
              <div className='bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200'>
                <div className='flex items-center gap-3'>
                  <div className='p-2 bg-purple-100 rounded-lg'>
                    <Clock className='w-5 h-5 text-purple-600' />
                  </div>
                  <div>
                    <h3 className='text-lg font-semibold text-gray-900'>Priority Scheduling</h3>
                    <p className='text-sm text-gray-600'>Define when your priority video will activate</p>
                  </div>
                  <Badge variant='destructive' className='ml-auto'>Required</Badge>
                </div>
              </div>
              
              <div className='p-6 space-y-6'>
                <div className='space-y-6 p-6 bg-gradient-to-br from-orange-50 to-red-50 rounded-lg border border-orange-200'>
                  {/* Days of Week */}
                  <div>
                    <label className='block text-sm font-semibold text-gray-900 mb-3'>
                      Active Days
                    </label>
                    <p className='text-xs text-gray-600 mb-4'>Leave empty to activate on all days</p>
                    {/* Responsive Grid for Days */}
                    <div className='grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-3'>
                      {dayChoices.map((day) => (
                        <label key={day.id} className='flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-orange-300 transition-colors cursor-pointer group'>
                          <div className='flex-shrink-0'>
                            <input
                              type='checkbox'
                              checked={(schedule?.daysOfWeek || []).includes(parseInt(day.id.toString()))}
                              onChange={(e) => {
                                const currentDays = schedule?.daysOfWeek || [];
                                const dayNum = parseInt(day.id.toString());
                                const newDays = e.target.checked
                                  ? [...currentDays, dayNum]
                                  : currentDays.filter(d => d !== dayNum);
                                this.handleChange('scheduleDays', newDays);
                              }}
                              className='w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 focus:ring-2'
                            />
                          </div>
                          <span className='text-sm font-medium text-gray-900 flex-1 min-w-0 truncate group-hover:text-orange-700 transition-colors'>
                            {day.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Time Slots */}
                  <div>
                    <div className='flex items-center justify-between mb-4'>
                      <div>
                        <label className='block text-sm font-semibold text-gray-900'>
                          Activation Time Periods
                        </label>
                        <p className='text-xs text-gray-600 mt-1'>Define when the priority video will activate</p>
                      </div>
                      <button
                        type='button'
                        onClick={this.addTimeSlot}
                        className='flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors'
                      >
                        <Plus className='w-4 h-4' />
                        Add Time Slot
                      </button>
                    </div>
                    
                    <div className='space-y-3'>
                      {(schedule?.timeSlots || []).map((slot, index) => (
                        <div key={index} className='flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors'>
                          {/* Time Inputs Container */}
                          <div className='flex items-center gap-3 flex-1 min-w-0'>
                            <div className='flex-1 min-w-0'>
                              <label className='block text-sm font-medium text-gray-700 mb-2'>
                                Start Time
                              </label>
                              <input
                                type='time'
                                name={`timeSlot_${index}_startTime`}
                                value={slot.startTime}
                                onChange={(e) => this.handleChange(e.target.name, e.target.value)}
                                className='font-sans text-gray-800 bg-gray-100 min-h-[40px] rounded border border-gray-300 outline-none px-3 py-2 text-base box-border w-full transition-all duration-200 focus:border-blue-500 focus:shadow-[0_0_0_2px_rgba(59,130,246,0.2)]'
                              />
                            </div>
                            <div className='flex-shrink-0 px-2 pt-7'>
                              <span className='text-gray-500 font-medium text-sm'>to</span>
                            </div>
                            <div className='flex-1 min-w-0'>
                              <label className='block text-sm font-medium text-gray-700 mb-2'>
                                End Time
                              </label>
                              <input
                                type='time'
                                name={`timeSlot_${index}_endTime`}
                                value={slot.endTime}
                                onChange={(e) => this.handleChange(e.target.name, e.target.value)}
                                className='font-sans text-gray-800 bg-gray-100 min-h-[40px] rounded border border-gray-300 outline-none px-3 py-2 text-base box-border w-full transition-all duration-200 focus:border-blue-500 focus:shadow-[0_0_0_2px_rgba(59,130,246,0.2)]'
                              />
                            </div>
                          </div>
                          {/* Remove Button */}
                          <div className='flex-shrink-0'>
                            <button
                              type='button'
                              onClick={() => this.removeTimeSlot(index)}
                              className='flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200'
                            >
                              <Trash2 className='w-4 h-4 flex-shrink-0' />
                              <span className='hidden sm:inline'>Remove</span>
                            </button>
                          </div>
                        </div>
                      ))}
                      
                      {(schedule?.timeSlots || []).length === 0 && (
                        <div className='text-center py-8 text-gray-500'>
                          <Clock className='w-8 h-8 mx-auto mb-2 opacity-50' />
                          <p className='text-sm'>No time slots configured</p>
                          <p className='text-xs'>Click &quot;Add Time Slot&quot; to get started</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Fallback Content Section */}
            <div className='bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden'>
              <div className='bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200'>
                <div className='flex items-center gap-3'>
                  <div className='p-2 bg-orange-100 rounded-lg'>
                    <AlertCircle className='w-5 h-5 text-orange-600' />
                  </div>
                  <div>
                    <h3 className='text-lg font-semibold text-gray-900'>Fallback Content</h3>
                    <p className='text-sm text-gray-600'>Shown when priority video is not scheduled or cannot play</p>
                  </div>
                </div>
              </div>
              
              <div className='p-6 space-y-6'>
                <Input
                  label='Fallback Message'
                  type='text'
                  name='fallback_message'
                  value={fallbackContent?.message || ''}
                  placeholder='Priority video is not scheduled'
                  onChange={this.handleChange}
                />
                <Input
                  label='Fallback Background Color'
                  type='color'
                  name='fallback_backgroundColor'
                  value={fallbackContent?.backgroundColor || '#000000'}
                  onChange={this.handleChange}
                />
              </div>
            </div>
          </div>

          {/* Preview Panel - Responsive Layout */}
          <div className='xl:col-span-1 order-first xl:order-last'>
            <div className='sticky top-6'>
              <div className='bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden'>
                {/* Preview Header */}
                <div className='bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200'>
                  <div className='flex items-center gap-3'>
                    <div className='w-10 h-10 flex items-center justify-center bg-indigo-100 rounded-lg flex-shrink-0'>
                      <Eye className='w-5 h-5 text-indigo-600' />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <h3 className='text-lg font-semibold text-gray-900'>Live Preview</h3>
                      <p className='text-sm text-gray-600 truncate'>See how your priority video looks</p>
                    </div>
                  </div>
                </div>

                <div className='p-6'>
                  {/* Responsive Preview Container */}
                  <div className='aspect-video bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 overflow-hidden'>
                    <PriorityVideoContent data={previewData} isPreview={true} />
                  </div>
                  <div className='mt-4 p-3 bg-orange-50 rounded-lg border border-orange-200'>
                    <div className='flex items-start gap-2'>
                      <div className='w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5'>
                        <Zap className='w-3 h-3 text-orange-600' />
                      </div>
                      <p className='text-xs text-orange-700 flex-1'>
                        <strong>Note:</strong> Preview shows the content without fullscreen takeover. The actual priority video will take over the entire display when activated.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default PriorityVideoOptions;