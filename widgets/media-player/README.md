# Media Player Widget

A comprehensive media player widget for digital signage that supports both video and audio files with advanced scheduling and playback controls.

## Features

- **Multi-format support**: MP4, WebM, MOV (video) | MP3, WAV, OGG (audio)
- **File upload**: Direct upload up to 50MB with validation
- **Remote URLs**: Support for external media sources
- **Scheduling**: Time-based and day-based activation
- **Playback controls**: Autoplay, loop, volume, mute options
- **Responsive design**: Works on all screen sizes
- **Error handling**: Graceful fallback for unsupported media

## Quick Start

1. **Add Widget**: Select "Media Player" from the widget menu
2. **Upload Media**: Use the file upload or provide a URL
3. **Configure Playback**: Set autoplay, loop, and volume options
4. **Set Schedule** (optional): Define when the media should play
5. **Save**: Your media player widget is ready!

## File Support

### Video Formats

- MP4 (recommended for best compatibility)
- WebM (Chrome, Firefox)
- MOV (Safari, some Chrome)
- AVI (limited support)

### Audio Formats

- MP3 (universal support)
- WAV (universal support)
- OGG (Chrome, Firefox, Opera)
- M4A (Safari, Chrome)

## Configuration Options

### Basic Settings

- **Title**: Optional overlay title
- **Media Source**: Upload file or provide URL
- **Background Color**: Color behind media
- **Media Type**: Auto-detected (Video/Audio)

### Playback Controls

- **Autoplay**: Start automatically (may be blocked by browsers)
- **Loop**: Repeat when finished
- **Volume**: 0.0 (silent) to 1.0 (full volume)
- **Muted**: Start without sound
- **Show Controls**: Display browser media controls

### Display Options (Video)

- **Contain**: Fit within bounds, maintain aspect ratio
- **Cover**: Fill area, crop if necessary
- **Fill**: Stretch to fill entire area

### Scheduling

- **Enable Scheduling**: Turn on time-based control
- **Active Days**: Select specific days of the week
- **Time Slots**: Define multiple active periods per day
- **Format**: Use HH:MM format (e.g., "09:00", "17:30")

### Fallback Content

- **Message**: Text shown when media unavailable
- **Background**: Color for fallback state

## Browser Considerations

### Autoplay Policies

Modern browsers restrict autoplay with sound. For reliable autoplay:

- Set `muted: true` for videos
- Use user interaction to start audio
- Consider autoplay alternatives

### Format Compatibility

- **MP4 + MP3**: Best cross-browser support
- **WebM + OGG**: Good for Chrome/Firefox
- **MOV + M4A**: Optimized for Safari

## Examples

### Basic Video Widget

```json
{
  "title": "Welcome Video",
  "url": "/uploads/videos/welcome.mp4",
  "autoplay": true,
  "loop": true,
  "muted": true,
  "showControls": false,
  "fit": "cover"
}
```

### Scheduled Background Music

```json
{
  "title": "Office Music",
  "url": "/uploads/audio/background.mp3",
  "autoplay": true,
  "loop": true,
  "volume": 0.3,
  "enableScheduling": true,
  "schedule": {
    "daysOfWeek": [1, 2, 3, 4, 5],
    "timeSlots": [{ "startTime": "09:00", "endTime": "17:00" }]
  }
}
```

## Troubleshooting

### Upload Issues

- Check file size (max 50MB)
- Verify supported format
- Ensure stable internet connection

### Playback Problems

- Test different browsers
- Check media URL accessibility
- Verify file isn't corrupted

### Scheduling Issues

- Use 24-hour format (HH:MM)
- Check day numbers (0=Sunday, 6=Saturday)
- Verify current time zone

## Technical Details

- **Widget Type**: `media-player`
- **Version**: 1.0.0
- **Dependencies**: React, HTML5 Media APIs
- **File Storage**: `/public/uploads/videos/` and `/public/uploads/audio/`
- **API Endpoint**: `/api/media/upload`

## Security

- Server-side file validation
- MIME type verification
- File signature checking
- Size limit enforcement
- Authentication required for uploads
