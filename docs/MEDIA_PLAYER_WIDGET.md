# Media Player Widget

## Overview

The Media Player widget is a comprehensive solution for playing both video and audio files in your digital signage system. It supports file uploads, remote URLs, scheduling, and advanced playback controls.

## Features

### ✅ File Support

- **Video formats**: MP4, WebM, MOV, AVI
- **Audio formats**: MP3, WAV, OGG, M4A
- **File size limit**: 50MB maximum
- **Upload support**: Direct file upload with validation
- **Remote URLs**: Support for external media URLs

### ✅ Playback Controls

- **Autoplay**: Automatically start playing when displayed
- **Loop**: Repeat playback continuously
- **Volume control**: Adjustable volume (0-1 scale)
- **Mute option**: Silent playback capability
- **Player controls**: Show/hide native browser controls

### ✅ Display Options

- **Video fit modes**: Contain, Cover, Fill
- **Background color**: Customizable background
- **Title overlay**: Optional title display
- **Audio visualization**: Special UI for audio files

### ✅ Scheduling Features

- **Time-based scheduling**: Enable/disable based on time
- **Day selection**: Choose specific days of the week
- **Multiple time slots**: Set multiple active periods per day
- **Automatic activation**: Respects schedule in real-time

### ✅ Advanced Features

- **Fallback content**: Custom message when media unavailable
- **Error handling**: Graceful handling of playback errors
- **Preview mode**: Safe preview in widget options
- **Responsive design**: Works on all screen sizes

## Configuration Options

### Basic Settings

- **Title**: Optional title displayed over the media
- **Media File**: Upload file or provide URL
- **Media Type**: Auto-detected (Video/Audio)
- **Background Color**: Color shown behind media

### Playback Controls

- **Autoplay**: Start playing automatically
- **Loop**: Repeat playback when finished
- **Volume**: Set playback volume (0.0 - 1.0)
- **Muted**: Start in muted state
- **Show Controls**: Display browser media controls

### Display Options (Video Only)

- **Fit Mode**:
  - **Contain**: Fit within bounds, maintain aspect ratio
  - **Cover**: Fill area, crop if necessary
  - **Fill**: Stretch to fill entire area

### Scheduling (Optional)

- **Enable Scheduling**: Turn on time-based control
- **Active Days**: Select days of week (Sunday = 0, Saturday = 6)
- **Time Slots**: Define active time periods (HH:MM format)
- **Multiple Slots**: Add multiple time periods per day

### Fallback Content

- **Fallback Message**: Text shown when media unavailable
- **Fallback Background**: Background color for fallback state

## API Endpoints

### Media Upload: `POST /api/media/upload`

**Purpose**: Upload video/audio files for use in media player widgets

**Authentication**: Required (JWT token)

**Request**: `multipart/form-data`

- `mediaFile`: File object (required)

**Response**: JSON

```json
{
  "url": "/uploads/videos/1234567890_abcdef123.mp4",
  "filename": "1234567890_abcdef123.mp4",
  "originalName": "my-video.mp4",
  "size": 5242880,
  "type": "video/mp4",
  "mediaType": "video",
  "uploadedAt": "2024-01-01T12:00:00.000Z",
  "uploadedBy": "user_id"
}
```

**Validation**:

- File type must be supported media format
- File size must be ≤ 50MB
- File signature validation for security

## File Storage

### Directory Structure

```
public/
└── uploads/
    ├── videos/
    │   ├── .gitkeep
    │   ├── 1234567890_abcdef123.mp4
    │   └── 1234567891_xyz789456.webm
    └── audio/
        ├── .gitkeep
        ├── 1234567890_abcdef123.mp3
        └── 1234567891_xyz789456.wav
```

### File Naming

- Format: `{timestamp}_{randomString}.{extension}`
- Example: `1704110400000_k2j3h4g5f6d.mp4`
- Prevents conflicts and ensures uniqueness

## Widget Data Schema

```typescript
interface MediaPlayerWidgetData {
  title?: string;
  url?: string;
  mediaType?: "video" | "audio";
  backgroundColor?: string;
  // Playback controls
  autoplay?: boolean;
  loop?: boolean;
  volume?: number; // 0-1
  muted?: boolean;
  showControls?: boolean;
  // Display options
  fit?: "contain" | "cover" | "fill";
  // Scheduling
  enableScheduling?: boolean;
  schedule?: {
    daysOfWeek?: number[]; // 0-6 (Sunday-Saturday)
    timeSlots?: Array<{
      startTime: string; // HH:MM format
      endTime: string; // HH:MM format
    }>;
  };
  // Fallback content
  fallbackContent?: {
    message?: string;
    backgroundColor?: string;
  };
}
```

## Usage Examples

### Basic Video Widget

```json
{
  "title": "Welcome Video",
  "url": "/uploads/videos/welcome.mp4",
  "mediaType": "video",
  "autoplay": true,
  "loop": true,
  "showControls": false,
  "fit": "cover"
}
```

### Scheduled Audio Widget

```json
{
  "title": "Background Music",
  "url": "/uploads/audio/background.mp3",
  "mediaType": "audio",
  "autoplay": true,
  "loop": true,
  "volume": 0.3,
  "enableScheduling": true,
  "schedule": {
    "daysOfWeek": [1, 2, 3, 4, 5],
    "timeSlots": [
      { "startTime": "09:00", "endTime": "12:00" },
      { "startTime": "13:00", "endTime": "17:00" }
    ]
  }
}
```

## Browser Compatibility

### Video Formats

- **MP4**: Supported by all modern browsers
- **WebM**: Chrome, Firefox, Opera
- **MOV**: Safari, some Chrome versions

### Audio Formats

- **MP3**: Universal support
- **WAV**: Universal support
- **OGG**: Chrome, Firefox, Opera
- **M4A**: Safari, Chrome

### Features

- **Autoplay**: May be blocked by browser policies
- **Scheduling**: Uses JavaScript Date/Time APIs
- **File Upload**: Uses modern File API

## Security Considerations

1. **File Validation**: Server-side MIME type and signature checking
2. **Size Limits**: 50MB maximum prevents DoS attacks
3. **Authentication**: Upload requires valid user session
4. **File Isolation**: Media stored in dedicated directories
5. **Secure Naming**: Prevents directory traversal attacks

## Troubleshooting

### Common Issues

1. **Autoplay Blocked**

   - Modern browsers block autoplay with sound
   - Use `muted: true` for auto-playing videos
   - Consider user interaction before playing

2. **File Format Not Supported**

   - Check browser compatibility
   - Convert to widely supported formats (MP4, MP3)
   - Test in target browser environment

3. **Upload Fails**

   - Verify file size is under 50MB
   - Check file format is supported
   - Ensure user is authenticated

4. **Scheduling Not Working**
   - Verify time format is HH:MM
   - Check day numbers (0=Sunday, 6=Saturday)
   - Ensure enableScheduling is true

### Debug Steps

1. Check browser console for errors
2. Verify media URL is accessible
3. Test with different file formats
4. Check network tab for upload issues
5. Validate widget data schema

## Performance Tips

1. **Optimize Media Files**

   - Compress videos for web delivery
   - Use appropriate bitrates for display size
   - Consider progressive download formats

2. **Scheduling Efficiency**

   - Use scheduling to reduce bandwidth during off-hours
   - Implement fallback content for inactive periods

3. **Browser Optimization**
   - Preload media when possible
   - Use appropriate video codecs
   - Consider lazy loading for multiple widgets
