import React, { Component } from 'react';
import { Form, Input, InlineInputGroup, IChoice } from '../../../components/Form';
import { IWidgetOptionsEditorProps } from '../../base_widget';
import { MediaPlayerWidgetData } from '@/lib/models/Widget';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Monitor, 
  Clock, 
  Calendar,
  Upload,
  Settings,
  Eye,
  AlertCircle,
  Plus,
  Trash2,
  FileVideo,
  FileAudio
} from 'lucide-react';
import axios from 'axios';
import MediaPlayerContent from './MediaPlayerContent';

interface IMediaPlayerOptionsState extends MediaPlayerWidgetData {
  // Additional state for UI
  uploadError?: string;
  isUploading?: boolean;
}

const fitChoices: IChoice[] = [
  { id: 'contain', label: 'Contain (fit within bounds)' },
  { id: 'cover', label: 'Cover (fill and crop)' },
  { id: 'fill', label: 'Fill (stretch to fit)' },
];

const dayChoices: IChoice[] = [
  { id: '0', label: 'Sunday' },
  { id: '1', label: 'Monday' },
  { id: '2', label: 'Tuesday' },
  { id: '3', label: 'Wednesday' },
  { id: '4', label: 'Thursday' },
  { id: '5', label: 'Friday' },
  { id: '6', label: 'Saturday' },
];

class MediaPlayerOptions extends Component<IWidgetOptionsEditorProps<MediaPlayerWidgetData>, IMediaPlayerOptionsState> {
  constructor(props: IWidgetOptionsEditorProps<MediaPlayerWidgetData>) {
    super(props);
    
    // Initialize state from props.data with defaults
    const {
      title = '',
      url = '',
      mediaType = 'video',
      backgroundColor = '#000000',
      autoplay = false,
      loop = false,
      volume = 1,
      muted = false,
      showControls = true,
      fit = 'contain',
      enableScheduling = false,
      schedule = {
        daysOfWeek: [],
        timeSlots: [{ startTime: '09:00', endTime: '17:00' }],
      },
      fallbackContent = {
        message: 'Media content is not available',
        backgroundColor: '#000000',
      },
    } = props.data || {};

    this.state = {
      title,
      url,
      mediaType,
      backgroundColor,
      autoplay,
      loop,
      volume,
      muted,
      showControls,
      fit,
      enableScheduling,
      schedule,
      fallbackContent,
      uploadError: undefined,
      isUploading: false,
    };
  }

  componentDidUpdate(prevProps: IWidgetOptionsEditorProps<MediaPlayerWidgetData>) {
    if (this.props.data !== prevProps.data && this.props.data) {
      this.setState({ ...this.props.data });
    }
  }

  handleChange = async (name: string, value: any): Promise<void> => {
    const { onChange } = this.props;
    let finalName: keyof IMediaPlayerOptionsState = name as keyof IMediaPlayerOptionsState;
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
        this.setState({ uploadError: undefined });
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
        timeSlots[slotIndex] = { startTime: '09:00', endTime: '17:00' };
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
      { [finalName]: finalValue } as Pick<IMediaPlayerOptionsState, keyof IMediaPlayerOptionsState>,
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
      { startTime: '09:00', endTime: '17:00' },
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
      autoplay = false,
      loop = false,
      volume = 1,
      muted = false,
      showControls = true,
      fit = 'contain',
      enableScheduling = false,
      schedule = { daysOfWeek: [], timeSlots: [] },
      fallbackContent = { message: '', backgroundColor: '#000000' },
      uploadError,
      isUploading,
    } = this.state;

    const previewData: MediaPlayerWidgetData = {
      title,
      url,
      mediaType,
      backgroundColor,
      autoplay: false, // Disable autoplay in preview
      loop,
      volume,
      muted: true, // Mute in preview
      showControls,
      fit,
      enableScheduling: false, // Disable scheduling in preview
      schedule,
      fallbackContent,
    };

    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-lg">
              {mediaType === 'video' ? <FileVideo className="w-6 h-6" /> : <FileAudio className="w-6 h-6" />}
            </div>
            <h1 className="text-xl font-bold">Media Player Configuration</h1>
          </div>
          <p className="text-blue-100">Create an engaging media experience for your digital signage</p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Configuration Panel */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Media Source Section */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Upload className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Media Source</h3>
                    <p className="text-sm text-gray-600">Upload or specify your media content</p>
                  </div>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                <Input
                  label="Title (Optional)"
                  type="text"
                  name="title"
                  value={title}
                  placeholder="Enter a descriptive title for your media..."
                  onChange={this.handleChange}
                />

                <div>
                  <Input
                    label="Media File (Upload or URL)"
                    type="photo"
                    name="upload"
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
                  {isUploading && (
                    <div className="flex items-center gap-2 mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm text-blue-700 font-medium">Uploading media file...</span>
                    </div>
                  )}
                  {uploadError && (
                    <div className="flex items-center gap-2 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <span className="text-sm text-red-700">{uploadError}</span>
                    </div>
                  )}
                  <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-sm text-gray-600">
                      <strong>Supported formats:</strong> MP4, WebM, MOV (video) | MP3, WAV, OGG (audio)
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      <strong>Maximum file size:</strong> 50MB
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Input
                      label="Media Type"
                      type="select"
                      name="mediaType"
                      value={mediaType}
                      choices={[
                        { id: 'video', label: '🎥 Video' },
                        { id: 'audio', label: '🎵 Audio' },
                      ]}
                      onChange={this.handleChange}
                    />
                  </div>
                  <div>
                    <Input
                      label="Background Color"
                      type="color"
                      name="backgroundColor"
                      value={backgroundColor}
                      onChange={this.handleChange}
                    />
                  </div>
                </div>

                {mediaType === 'video' && (
                  <Input
                    label="Video Fit Mode"
                    type="select"
                    name="fit"
                    value={fit}
                    choices={fitChoices}
                    onChange={this.handleChange}
                  />
                )}
              </div>
            </div>

            {/* Playback Controls Section */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Settings className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Playback Controls</h3>
                    <p className="text-sm text-gray-600">Configure how your media plays</p>
                  </div>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-3">
                        <Play className="w-5 h-5 text-gray-600" />
                        <div>
                          <label className="text-sm font-medium text-gray-900">Autoplay</label>
                          <p className="text-xs text-gray-600">Start playing automatically</p>
                        </div>
                      </div>
                      <Input
                        type="checkbox"
                        name="autoplay"
                        label=""
                        checked={autoplay}
                        onChange={(name, checked) => this.handleChange(name, checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 flex items-center justify-center">
                          <div className="w-3 h-3 border-2 border-gray-600 rounded-full"></div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-900">Loop</label>
                          <p className="text-xs text-gray-600">Repeat when finished</p>
                        </div>
                      </div>
                      <Input
                        type="checkbox"
                        name="loop"
                        label=""
                        checked={loop}
                        onChange={(name, checked) => this.handleChange(name, checked)}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-3">
                        {muted ? <VolumeX className="w-5 h-5 text-gray-600" /> : <Volume2 className="w-5 h-5 text-gray-600" />}
                        <div>
                          <label className="text-sm font-medium text-gray-900">Muted</label>
                          <p className="text-xs text-gray-600">Start without sound</p>
                        </div>
                      </div>
                      <Input
                        type="checkbox"
                        name="muted"
                        label=""
                        checked={muted}
                        onChange={(name, checked) => this.handleChange(name, checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-3">
                        <Monitor className="w-5 h-5 text-gray-600" />
                        <div>
                          <label className="text-sm font-medium text-gray-900">Show Controls</label>
                          <p className="text-xs text-gray-600">Display player controls</p>
                        </div>
                      </div>
                      <Input
                        type="checkbox"
                        name="showControls"
                        label=""
                        checked={showControls}
                        onChange={(name, checked) => this.handleChange(name, checked)}
                      />
                    </div>
                  </div>
                </div>

                <div className="max-w-md">
                  <Input
                    label="Volume Level"
                    type="number"
                    name="volume"
                    value={volume}
                    min={0}
                    max={1}
                    step={0.1}
                    onChange={this.handleChange}
                  />
                  <div className="mt-2 flex justify-between text-xs text-gray-500">
                    <span>Silent (0.0)</span>
                    <span>Maximum (1.0)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Scheduling Section */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Clock className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Scheduling</h3>
                    <p className="text-sm text-gray-600">Control when your media plays</p>
                  </div>
                  <Badge variant="secondary" className="ml-auto">Optional</Badge>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-gray-600" />
                    <div>
                      <label className="text-sm font-medium text-gray-900">Enable Time-based Scheduling</label>
                      <p className="text-xs text-gray-600">Set specific days and times for playback</p>
                    </div>
                  </div>
                  <Input
                    type="checkbox"
                    name="enableScheduling"
                    label=""
                    checked={enableScheduling}
                    onChange={(name, checked) => this.handleChange(name, checked)}
                  />
                </div>

                {enableScheduling && (
                  <div className="space-y-6 p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                    {/* Days of Week */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-3">
                        Active Days
                      </label>
                      <p className="text-xs text-gray-600 mb-4">Leave empty to play on all days</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {dayChoices.map((day) => (
                          <label key={day.id} className="flex items-center gap-2 p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors cursor-pointer">
                            <input
                              type="checkbox"
                              checked={(schedule?.daysOfWeek || []).includes(parseInt(day.id.toString()))}
                              onChange={(e) => {
                                const currentDays = schedule?.daysOfWeek || [];
                                const dayNum = parseInt(day.id.toString());
                                const newDays = e.target.checked
                                  ? [...currentDays, dayNum]
                                  : currentDays.filter(d => d !== dayNum);
                                this.handleChange('scheduleDays', newDays);
                              }}
                              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                            />
                            <span className="text-sm font-medium text-gray-900">{day.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Time Slots */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-900">
                            Active Time Periods
                          </label>
                          <p className="text-xs text-gray-600 mt-1">Define when the media should play</p>
                        </div>
                        <button
                          type="button"
                          onClick={this.addTimeSlot}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          Add Time Slot
                        </button>
                      </div>
                      
                      <div className="space-y-3">
                        {(schedule?.timeSlots || []).map((slot, index) => (
                          <div key={index} className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200">
                            <div className="flex items-center gap-2 flex-1">
                              <Input
                                label=""
                                type="text"
                                name={`timeSlot_${index}_startTime`}
                                value={slot.startTime}
                                placeholder="09:00"
                                onChange={this.handleChange}
                              />
                              <span className="text-gray-500 font-medium">to</span>
                              <Input
                                label=""
                                type="text"
                                name={`timeSlot_${index}_endTime`}
                                value={slot.endTime}
                                placeholder="17:00"
                                onChange={this.handleChange}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => this.removeTimeSlot(index)}
                              className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                              Remove
                            </button>
                          </div>
                        ))}
                        
                        {(schedule?.timeSlots || []).length === 0 && (
                          <div className="text-center py-8 text-gray-500">
                            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No time slots configured</p>
                            <p className="text-xs">Click "Add Time Slot" to get started</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Fallback Content Section */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Fallback Content</h3>
                    <p className="text-sm text-gray-600">Shown when media cannot play or is scheduled off</p>
                  </div>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                <Input
                  label="Fallback Message"
                  type="text"
                  name="fallback_message"
                  value={fallbackContent?.message || ''}
                  placeholder="Media content is not available"
                  onChange={this.handleChange}
                />
                <Input
                  label="Fallback Background Color"
                  type="color"
                  name="fallback_backgroundColor"
                  value={fallbackContent?.backgroundColor || '#000000'}
                  onChange={this.handleChange}
                />
              </div>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <Eye className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Live Preview</h3>
                      <p className="text-sm text-gray-600">See how your widget looks</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="aspect-video bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 overflow-hidden">
                    <MediaPlayerContent data={previewData} isPreview={true} />
                  </div>
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600">
                      <strong>Note:</strong> Preview shows muted playback with controls disabled for safety.
                    </p>
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

export default MediaPlayerOptions;
