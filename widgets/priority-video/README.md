# Priority Scheduled Video Widget

A high-priority video widget that automatically takes over the entire display at scheduled times. Perfect for important announcements, national anthems, or other priority content that needs to be shown with full screen impact.

## Features

### 🎯 Priority Scheduling
- **Always Scheduled**: Unlike regular media players, this widget is always schedule-based
- **Automatic Activation**: Activates automatically at configured times
- **Priority Override**: Takes precedence over other content when active

### 📺 Full-Screen Takeover
- **Automatic Fullscreen**: Enters fullscreen mode when activated
- **Clean Interface**: Minimal controls for distraction-free viewing
- **Priority Indicator**: Shows "Priority Video" label and exit instructions

### ⚡ Smart Playback
- **Play Once**: Option to play only once per schedule activation
- **Auto-start**: Begins playing immediately when scheduled
- **Auto-exit**: Exits fullscreen automatically when video ends

### 🌐 Media Support
- **Direct URLs**: Supports direct video/audio file URLs
- **YouTube Integration**: Automatic YouTube URL detection and embedding
- **File Uploads**: Upload local media files
- **Multiple Formats**: MP4, WebM, MOV, MP3, WAV, OGG

## Use Cases

### 🇮🇩 National Anthem
Schedule "Indonesia Raya" to play at specific times:
- **Time**: 22:00 - 22:05 (10:00 PM - 10:05 PM)
- **Days**: All weekdays
- **Behavior**: Play once, full screen, auto-exit

### 📢 Emergency Announcements
Critical information that needs immediate attention:
- **Priority**: High (900+)
- **Timing**: Immediate or scheduled
- **Impact**: Full screen takeover

### 🎉 Special Events
Important ceremonies or celebrations:
- **Scheduling**: Specific dates and times
- **Content**: Videos, speeches, or music
- **Experience**: Immersive full-screen presentation

## Configuration

### Required Settings
- **Media Source**: URL or uploaded file
- **Schedule**: At least one time slot must be configured
- **Priority Level**: 1-999 (higher = more important)

### Optional Settings
- **Title**: Descriptive name for the content
- **Days of Week**: Restrict to specific days (empty = all days)
- **Volume**: Audio level (0.0 - 1.0)
- **Play Once**: Prevent repeated playback in same schedule window

### Advanced Options
- **Background Color**: Fallback background when not playing
- **Fallback Message**: Text shown when not scheduled
- **Media Type**: Video or Audio content

## Technical Details

### Scheduling Logic
- Checks schedule every 30 seconds
- Activates when current time falls within configured time slots
- Respects day-of-week restrictions if configured
- Tracks playback state to prevent duplicates (if "Play Once" enabled)

### Fullscreen Behavior
- Uses native browser fullscreen APIs
- Handles webkit prefixes for Safari compatibility
- Graceful fallback if fullscreen is denied
- Automatic exit on video completion or schedule end

### Media Handling
- YouTube URLs automatically converted to embeds
- Direct media URLs validated before playback
- CORS support for external content
- Error handling with informative messages

## Integration

### Widget Type
```typescript
WidgetType.PRIORITY_VIDEO = "priority-video"
```

### Data Interface
```typescript
interface PriorityVideoWidgetData {
  title?: string;
  url?: string;
  mediaType?: "video" | "audio";
  backgroundColor?: string;
  schedule: {
    daysOfWeek?: number[]; // 0-6 (Sunday-Saturday)
    timeSlots: Array<{
      startTime: string; // "HH:MM"
      endTime: string;   // "HH:MM"
    }>;
  };
  volume?: number; // 0-1
  fallbackContent?: {
    message?: string;
    backgroundColor?: string;
  };
  priority?: number; // 1-999
  playOnce?: boolean;
}
```

### Usage Example
```typescript
const priorityVideoData: PriorityVideoWidgetData = {
  title: "Indonesia Raya",
  url: "https://example.com/indonesia-raya.mp4",
  mediaType: "video",
  schedule: {
    daysOfWeek: [1, 2, 3, 4, 5], // Monday-Friday
    timeSlots: [
      { startTime: "22:00", endTime: "22:05" }
    ]
  },
  priority: 100,
  playOnce: true,
  volume: 0.8
};
```

## Browser Compatibility

- **Fullscreen**: Modern browsers with fullscreen API support
- **Media**: HTML5 video/audio support required
- **YouTube**: iframe embedding (standard across browsers)
- **Autoplay**: May be restricted by browser policies (handled gracefully)

## Best Practices

1. **Test Scheduling**: Verify time slots work as expected
2. **Volume Levels**: Consider environment and content type
3. **Priority Levels**: Use consistent numbering scheme
4. **Content Length**: Keep priority videos concise
5. **Fallback Content**: Provide clear messaging when inactive