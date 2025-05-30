import React, { Component } from 'react';
import { Form, Input, InlineInputGroup, IInputProps, IChoice } from '../../../components/Form';
import { IWidgetOptionsEditorProps } from '../../../components/Admin/WidgetEditDialog';
import getVideoId from 'get-video-id'; // For parsing YouTube URL

import { IYoutubeDefaultData } from '../index'; // Data structure from youtube/index.ts
import YoutubeContent from './YoutubeContent'; // For potential preview

// Props for YoutubeOptions should conform to IWidgetOptionsEditorProps
export interface IYoutubeOptionsProps extends IWidgetOptionsEditorProps<IYoutubeDefaultData> {}

// Local state for this options panel might include the full URL input by the user,
// from which video_id is derived.
interface IYoutubeOptionsComponentState {
  inputUrl: string; // To store the full YouTube URL entered by the user
}

class YoutubeOptions extends Component<IYoutubeOptionsProps, IYoutubeOptionsComponentState> {
  constructor(props: IYoutubeOptionsProps) {
    super(props);
    // Initialize local state for the URL input field.
    // If props.data.video_id exists, construct a sample URL for display,
    // otherwise, use an empty string or a default example URL.
    this.state = {
      inputUrl: props.data?.video_id ? `https://www.youtube.com/watch?v=${props.data.video_id}` : '',
    };
  }
  
  componentDidUpdate(prevProps: IYoutubeOptionsProps) {
    // If the video_id from parent data changes and it's different from what inputUrl would yield,
    // update inputUrl. This is tricky because inputUrl could be a full URL or just an ID.
    // A safer approach might be to primarily work with video_id and only use inputUrl for user input.
    if (this.props.data?.video_id !== prevProps.data?.video_id) {
        this.setState({
            inputUrl: this.props.data?.video_id ? `https://www.youtube.com/watch?v=${this.props.data.video_id}` : ''
        });
    }
  }

  // Handles changes for any field in IYoutubeDefaultData or the local inputUrl
  handleChange = (name: string, value: any): void => {
    const { onChange, data: currentWidgetData } = this.props;

    if (name === 'inputUrl') {
      this.setState({ inputUrl: value as string });
      // Try to extract video_id and update parent
      const extracted = getVideoId(value as string);
      if (extracted && extracted.service === 'youtube' && extracted.id) {
        const newData: IYoutubeDefaultData = {
          ...(currentWidgetData || this.getDefaultWidgetData()), // Spread existing or default data
          video_id: extracted.id, // Update video_id
        };
        if (onChange) onChange(newData);
      } else if (!value) { // If URL is cleared, clear video_id
        const newData: IYoutubeDefaultData = {
            ...(currentWidgetData || this.getDefaultWidgetData()),
            video_id: null,
        };
        if (onChange) onChange(newData);
      }
      // If invalid URL, video_id in parent remains unchanged or becomes null if input is empty.
      // User will see their inputUrl, but the underlying video_id might not update.
      return; 
    }
    
    // For other fields, directly update the widget data object
    if (onChange) {
      const newData: IYoutubeDefaultData = {
        ...(currentWidgetData || this.getDefaultWidgetData()), // Spread existing or default data
        [name]: value, // Update the changed field
      };
      onChange(newData);
    }
  };

  // Helper to get default widget data structure
  getDefaultWidgetData = (): IYoutubeDefaultData => {
    return {
      video_id: null,
      autoplay: true,
      loop: false,
      show_controls: true,
      start_time: 0,
      end_time: 0,
      show_captions: false,
    };
  }

  render() {
    // Current widget data comes from props, managed by WidgetEditDialog
    const { data: currentWidgetData } = this.props;
    const { inputUrl } = this.state;

    // Use values from props.data for controlled components, with fallbacks to defaults
    const {
      video_id = null, // Primarily use this for the preview and for constructing inputUrl if empty
      autoplay = true,
      loop = false,
      show_controls = true,
      start_time = 0,
      end_time = 0,
      show_captions = false,
    } = currentWidgetData || this.getDefaultWidgetData();
    
    const previewData: IYoutubeDefaultData = { video_id, autoplay, loop, show_controls, start_time, end_time, show_captions };

    return (
      <div className={'options-container'}>
        <Form>
          <h3>Widget: YouTube Video</h3>
          <p>Configure the YouTube video widget.</p>
          <Input
            label={'YouTube Video URL or ID'}
            type={'text'}
            name={'inputUrl'} // Use local state 'inputUrl' for this field
            value={inputUrl} // Controlled by local state
            placeholder={'e.g., https://www.youtube.com/watch?v=... or just video_id'}
            onChange={this.handleChange}
            helpText={`Current Video ID: ${video_id || 'None'}`}
          />
          <InlineInputGroup>
            <Input
              label={'Start Time (seconds)'}
              type={'number'}
              name={'start_time'}
              value={start_time}
              min={0}
              onChange={this.handleChange}
            />
            <Input
              label={'End Time (seconds, 0 for end)'}
              type={'number'}
              name={'end_time'}
              value={end_time}
              min={0}
              onChange={this.handleChange}
            />
          </InlineInputGroup>
          <InlineInputGroup>
            <Input
              type="checkbox"
              name="autoplay"
              label="Autoplay"
              checked={autoplay}
              onChange={this.handleChange}
            />
            <Input
              type="checkbox"
              name="loop"
              label="Loop"
              checked={loop}
              onChange={this.handleChange}
            />
            <Input
              type="checkbox"
              name="show_controls"
              label="Show Controls"
              checked={show_controls}
              onChange={this.handleChange}
            />
            <Input
              type="checkbox"
              name="show_captions"
              label="Show Captions"
              checked={show_captions}
              onChange={this.handleChange}
            />
          </InlineInputGroup>
        </Form>
        <div className={'preview-section-container'}>
            <p>Preview</p>
            <div className={'preview-box youtube-preview-box'}>
                {video_id ? (
                    <YoutubeContent data={previewData} isPreview={true} />
                ) : (
                    <div className="no-video-preview">Enter a valid YouTube URL or Video ID</div>
                )}
            </div>
        </div>
        <style jsx>
          {`
            h3,
            p {
              font-family: 'Open Sans', sans-serif;
            }
            .options-container {
              display: flex;
              flex-direction: row;
              width: 100%;
            }
            .options-container > :global(form) {
                flex: 1;
                padding-right: 16px;
            }
            .preview-section-container {
              margin-left: 16px;
              width: 320px;
              flex-shrink: 0;
            }
            .preview-box {
              display: block;
              width: 100%;
              height: 180px; /* Aspect ratio for video preview */
              border-radius: 6px;
              overflow: hidden;
              border: 1px solid #ccc;
              background-color: #000; /* Black background for player */
            }
            .youtube-preview-box {
                position: relative;
            }
            .no-video-preview {
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100%;
                color: #555;
                text-align: center;
                background-color: #f0f0f0;
            }
          `}
        </style>
      </div>
    );
  }
}

export default YoutubeOptions;
