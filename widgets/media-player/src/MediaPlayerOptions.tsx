import React, { Component } from 'react';
import { Form, Input, InlineInputGroup, IChoice } from '../../../components/Form';
import { IWidgetOptionsEditorProps } from '../../base_widget';
import { MediaPlayerWidgetData } from '@/lib/models/Widget';
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
      <div className="widget-settings-content">
        <div className="widget-settings-body">
          <div className="space-y-6">
            {/* Basic Configuration */}
            <div className="widget-config-section">
              <div className="widget-config-header">
                <h3 className="widget-config-title">Media Player Configuration</h3>
                <p className="widget-config-description">Configure your media player settings and content.</p>
              </div>

              <Form>
                <div className="space-y-6">
                  {/* Title */}
                  <Input
                    label="Title (Optional)"
                    type="text"
                    name="title"
                    value={title}
                    placeholder="Media title..."
                    onChange={this.handleChange}
                  />

                  {/* Media Upload/URL */}
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
                      <p className="text-sm text-blue-600 mt-1">Uploading media file...</p>
                    )}
                    {uploadError && (
                      <p className="text-sm text-red-600 mt-1">{uploadError}</p>
                    )}
                    <p className="text-sm text-gray-500 mt-1">
                      Supported formats: MP4, WebM, MOV (video) | MP3, WAV, OGG (audio). Max size: 50MB
                    </p>
                  </div>

                  {/* Media Type and Display Settings */}
                  <div className="form-field-group">
                    <Input
                      label="Media Type"
                      type="select"
                      name="mediaType"
                      value={mediaType}
                      choices={[
                        { id: 'video', label: 'Video' },
                        { id: 'audio', label: 'Audio' },
                      ]}
                      onChange={this.handleChange}
                    />
                    <Input
                      label="Background Color"
                      type="color"
                      name="backgroundColor"
                      value={backgroundColor}
                      onChange={this.handleChange}
                    />
                  </div>

                  {/* Video-specific options */}
                  {mediaType === 'video' && (
                    <Input
                      label="Video Fit"
                      type="select"
                      name="fit"
                      value={fit}
                      choices={fitChoices}
                      onChange={this.handleChange}
                    />
                  )}
                </div>
              </Form>
            </div>

            {/* Playback Controls */}
            <div className="widget-config-section">
              <div className="widget-config-header">
                <h4 className="widget-config-title">Playback Controls</h4>
                <p className="widget-config-description">Configure how the media plays.</p>
              </div>

              <Form>
                <div className="space-y-4">
                  <div className="form-field-group">
                    <div className="flex items-center">
                      <Input
                        type="checkbox"
                        name="autoplay"
                        label="Autoplay"
                        checked={autoplay}
                        onChange={(name, checked) => this.handleChange(name, checked)}
                      />
                    </div>
                    <div className="flex items-center">
                      <Input
                        type="checkbox"
                        name="loop"
                        label="Loop"
                        checked={loop}
                        onChange={(name, checked) => this.handleChange(name, checked)}
                      />
                    </div>
                  </div>

                  <div className="form-field-group">
                    <div className="flex items-center">
                      <Input
                        type="checkbox"
                        name="muted"
                        label="Muted"
                        checked={muted}
                        onChange={(name, checked) => this.handleChange(name, checked)}
                      />
                    </div>
                    <div className="flex items-center">
                      <Input
                        type="checkbox"
                        name="showControls"
                        label="Show Controls"
                        checked={showControls}
                        onChange={(name, checked) => this.handleChange(name, checked)}
                      />
                    </div>
                  </div>

                  <Input
                    label="Volume"
                    type="number"
                    name="volume"
                    value={volume}
                    min={0}
                    max={1}
                    step={0.1}
                    onChange={this.handleChange}
                  />
                </div>
              </Form>
            </div>

            {/* Scheduling */}
            <div className="widget-config-section">
              <div className="widget-config-header">
                <h4 className="widget-config-title">Scheduling (Optional)</h4>
                <p className="widget-config-description">Control when the media plays based on time and day.</p>
              </div>

              <Form>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <Input
                      type="checkbox"
                      name="enableScheduling"
                      label="Enable Time-based Scheduling"
                      checked={enableScheduling}
                      onChange={(name, checked) => this.handleChange(name, checked)}
                    />
                  </div>

                  {enableScheduling && (
                    <div className="space-y-4 pl-6 border-l-2 border-gray-200">
                      {/* Days of Week */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Active Days (leave empty for all days)
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {dayChoices.map((day) => (
                            <label key={day.id} className="flex items-center space-x-2">
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
                                className="rounded border-gray-300"
                              />
                              <span className="text-sm">{day.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Time Slots */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Active Time Periods
                        </label>
                        {(schedule?.timeSlots || []).map((slot, index) => (
                          <div key={index} className="flex items-center space-x-2 mb-2">
                            <Input
                              label=""
                              type="text"
                              name={`timeSlot_${index}_startTime`}
                              value={slot.startTime}
                              placeholder="HH:MM"
                              onChange={this.handleChange}
                            />
                            <span className="text-gray-500">to</span>
                            <Input
                              label=""
                              type="text"
                              name={`timeSlot_${index}_endTime`}
                              value={slot.endTime}
                              placeholder="HH:MM"
                              onChange={this.handleChange}
                            />
                            <button
                              type="button"
                              onClick={() => this.removeTimeSlot(index)}
                              className="px-2 py-1 text-red-600 hover:text-red-800"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={this.addTimeSlot}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Add Time Slot
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </Form>
            </div>

            {/* Fallback Content */}
            <div className="widget-config-section">
              <div className="widget-config-header">
                <h4 className="widget-config-title">Fallback Content</h4>
                <p className="widget-config-description">Content shown when media cannot play or is scheduled off.</p>
              </div>

              <Form>
                <div className="space-y-4">
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
              </Form>
            </div>

            {/* Preview */}
            <div className="widget-preview-section">
              <div className="widget-preview-header">
                <h4 className="widget-preview-title">Live Preview</h4>
                <p className="text-gray-600">Preview of your media player widget</p>
              </div>
              <div className="widget-preview-container">
                <MediaPlayerContent data={previewData} isPreview={true} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default MediaPlayerOptions;
