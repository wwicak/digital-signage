# Digital Signage System - Stress Test Plan

## Executive Summary

This document outlines a comprehensive stress testing strategy for the digital signage system to evaluate its stability under extended runtime and varying conditions. The goal is to identify performance bottlenecks, memory leaks, and reliability risks that could affect long-term deployment.

## System Architecture Overview

Based on code analysis, the system consists of:

- **Frontend**: Next.js 14.2.29 React application with TypeScript
- **Backend**: Express.js server with MongoDB (Mongoose 8.15.1)
- **Real-time Updates**: Server-Sent Events (SSE) for live content updates
- **Widget System**: 8 different widget types with varying resource requirements
- **Layout Engine**: React Grid Layout for responsive positioning

## 1. Stress Test Categories

### 1.1 Duration-Based Tests

#### Test 1A: Short-Duration Baseline (2-4 hours)

- **Purpose**: Establish baseline performance metrics
- **Duration**: 2-4 hours continuous operation
- **Scenarios**: Standard mixed widget display
- **Monitoring**: Every 5 minutes

#### Test 1B: Medium-Duration Endurance (24-48 hours)

- **Purpose**: Detect gradual memory leaks and performance degradation
- **Duration**: 24-48 hours continuous operation
- **Scenarios**: Heavy mixed content with frequent updates
- **Monitoring**: Every 15 minutes

#### Test 1C: Long-Duration Stability (72+ hours)

- **Purpose**: Validate production readiness for weeks/months operation
- **Duration**: 72+ hours (up to 1 week if possible)
- **Scenarios**: Production-like workload simulation
- **Monitoring**: Every 30 minutes

### 1.2 Widget-Specific Stress Tests

#### Test 2A: Slideshow Widget Stress

- **Heavy Image Loading**: 50+ high-resolution images (2-5MB each)
- **Video Content**: Multiple MP4 videos with varying formats
- **Rapid Transitions**: 1-2 second intervals between slides
- **Random Order**: Enabled to test different loading patterns
- **Duration**: 6-12 hours

#### Test 2B: Web Widget Stress

- **Multiple iframes**: 3-4 web widgets simultaneously
- **Heavy Websites**: Load resource-intensive sites (maps, dashboards)
- **Auto-Refresh**: 30-60 second refresh intervals
- **Different Scales**: Mix of 0.5x, 1.0x, 1.5x scaling
- **Duration**: 4-8 hours

#### Test 2C: YouTube Widget Stress

- **Multiple Videos**: 2-3 YouTube widgets concurrently
- **Long Playlists**: Auto-advancing through 20+ videos
- **Quality Variations**: Mix of 720p, 1080p content
- **Autoplay Enabled**: Continuous video playback
- **Duration**: 6-12 hours

#### Test 2D: Weather Widget Stress

- **Frequent API Calls**: Multiple weather widgets with different locations
- **Network Simulation**: Intermittent connectivity issues
- **API Rate Limiting**: Test behavior near rate limits
- **Duration**: 4-6 hours

### 1.3 System Load Tests

#### Test 3A: Maximum Widget Density

- **Grid Layout**: 6x6 grid (36 widgets) if system allows
- **Mixed Types**: All 8 widget types represented
- **High Resource Widgets**: Emphasis on slideshow, web, YouTube
- **Duration**: 2-4 hours

#### Test 3B: SSE Event Storm

- **Rapid Updates**: Simulate admin making frequent changes
- **Multiple Displays**: If possible, test multiple display connections
- **Event Types**: display_updated, layout changes, widget updates
- **Rate**: 1-2 events per second for 30-60 minutes

#### Test 3C: Memory Pressure Simulation

- **Large Content**: High-resolution images, long videos
- **Cache Busting**: Frequent content changes to prevent caching benefits
- **Background Processes**: Run other applications to simulate resource constraints
- **Duration**: 3-6 hours

## 2. Test Configurations

### 2.1 Low-Resource Configuration (Minimum Hardware Simulation)

```
- Single slideshow widget: 20 images (1-2MB each)
- One web widget: Simple website
- One weather widget: Single location
- Layout: spaced (to test animation overhead)
- Transition time: 5 seconds
```

### 2.2 Medium-Resource Configuration (Typical Deployment)

```
- Slideshow widget: 30-40 mixed images/videos
- Two web widgets: Medium complexity sites
- Weather widget: 2 locations
- YouTube widget: Single video
- Announcement widget: Static content
- Layout: compact
- Transition time: 3 seconds
```

### 2.3 High-Resource Configuration (Stress Test)

```
- Large slideshow: 50+ images + 5+ videos
- Three web widgets: Complex dashboards/maps
- Two YouTube widgets: Different playlists
- Weather widget: 3+ locations with forecast
- All remaining widget types active
- Layout: spaced (maximum animation overhead)
- Transition time: 1-2 seconds
```

## 3. Monitoring Metrics

### 3.1 Browser Performance Metrics

- **Memory Usage**: Track heap size, DOM nodes, event listeners
- **CPU Utilization**: Monitor via DevTools Performance tab
- **GPU Usage**: Check for graphics acceleration issues
- **Network Activity**: Monitor request frequency and payload sizes
- **JavaScript Errors**: Console error tracking
- **Frame Rate**: Monitor for dropped frames in animations

### 3.2 System Performance Metrics

- **RAM Usage**: System memory consumption
- **CPU Load**: Overall system CPU usage
- **Network Bandwidth**: Upload/download utilization
- **Disk I/O**: Cache and temporary file usage
- **Temperature**: Hardware thermal monitoring

### 3.3 Application-Specific Metrics

- **SSE Connection Stability**: Monitor connection drops/reconnections
- **API Response Times**: Backend performance tracking
- **Database Performance**: MongoDB query performance
- **Widget Load Times**: Time to render each widget type
- **Layout Reflow Events**: Monitor unnecessary re-renders

## 4. Monitoring Tools and Setup

### 4.1 Browser DevTools Monitoring

```javascript
// Memory monitoring script for console
function logMemoryUsage() {
  if (performance.memory) {
    console.log(`Memory Usage:
      Used: ${(performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB
      Total: ${(performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB
      Limit: ${(performance.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB
    `);
  }

  // Log DOM nodes
  console.log(`DOM Nodes: ${document.querySelectorAll("*").length}`);

  // Log event listeners (if possible)
  console.log(`Active timeouts/intervals: Check DevTools Sources tab`);
}

// Run every 5 minutes during testing
setInterval(logMemoryUsage, 5 * 60 * 1000);
```

### 4.2 System Monitoring Commands

#### macOS Monitoring:

```bash
# CPU and Memory monitoring
top -l 1 -n 10 -o cpu

# Memory pressure
memory_pressure

# Network activity
nettop -l 1

# Temperature monitoring (if available)
sudo powermetrics --samplers smc -a --hide-cpu-duty-cycle -n 1
```

#### Network Simulation (for testing robustness):

```bash
# Simulate network latency (requires Network Link Conditioner)
# or use browser DevTools Network tab throttling
```

### 4.3 Application Logging

Add monitoring code to detect potential issues:

```javascript
// Add to Display.tsx for SSE monitoring
useEffect(() => {
  let reconnectCount = 0;
  const originalSetupSSE = setupSSE;

  const monitoredSetupSSE = () => {
    console.log(`SSE Connection attempt: ${++reconnectCount}`);
    originalSetupSSE();
  };

  return monitoredSetupSSE;
}, []);
```

## 5. Test Execution Protocol

### 5.1 Pre-Test Setup

1. **Environment Preparation**:

   - Clean browser cache and restart browser
   - Close unnecessary applications
   - Document starting system resource usage
   - Verify MongoDB connection and performance
   - Set up monitoring tools

2. **Test Data Preparation**:

   - Upload test images/videos to slideshow
   - Configure web widgets with target URLs
   - Set up weather widget with API keys
   - Create YouTube playlists for testing

3. **Baseline Measurement**:
   - Record initial memory usage
   - Note starting CPU utilization
   - Document network baseline
   - Screenshot initial display state

### 5.2 During Test Execution

1. **Automated Monitoring**:

   - Run memory logging script every 5-15 minutes
   - Take periodic screenshots for visual verification
   - Monitor system resources every 10-30 minutes
   - Log any errors or warnings immediately

2. **Manual Observations**:

   - Check display responsiveness every hour
   - Verify all widgets are functioning correctly
   - Note any visual glitches or performance degradation
   - Document any browser tab crashes or freezes

3. **Intervention Triggers**:
   - Stop test if memory usage exceeds 4GB
   - Halt if CPU usage remains >90% for >30 minutes
   - Terminate if display becomes completely unresponsive
   - End test if critical errors occur repeatedly

### 5.3 Post-Test Analysis

1. **Data Collection**:

   - Export DevTools performance profiles
   - Collect system monitoring logs
   - Document final resource usage
   - Save browser console logs

2. **Performance Analysis**:
   - Calculate average memory growth rate
   - Identify peak resource usage periods
   - Analyze performance degradation patterns
   - Review error frequency and types

## 6. Expected Test Scenarios and Results

### 6.1 Success Criteria

- **Memory Stability**: <10% memory growth over 24 hours
- **CPU Efficiency**: Average CPU usage <30% during normal operation
- **Visual Performance**: Maintain 30+ FPS for animations
- **Error Rate**: <1 error per hour in browser console
- **SSE Reliability**: <5 connection drops per 24 hours
- **Widget Responsiveness**: All widgets load within 5 seconds

### 6.2 Failure Indicators

- **Memory Leaks**: Continuous memory growth >50MB/hour
- **Performance Degradation**: Frame rate drops below 15 FPS
- **System Overload**: Sustained CPU usage >80%
- **Connection Issues**: Frequent SSE disconnections
- **Widget Failures**: Widgets failing to load or update
- **Browser Crashes**: Tab or browser becoming unresponsive

### 6.3 Common Issues to Watch For

#### Widget-Specific Issues:

- **Slideshow**: Image loading failures, memory accumulation from cached images
- **Web**: iframe memory leaks, cross-origin issues, auto-refresh problems
- **YouTube**: Video player memory issues, playlist navigation problems
- **Weather**: API rate limiting, network timeout handling

#### System-Level Issues:

- **SSE Connection**: Event listener accumulation, connection state management
- **React Grid Layout**: Re-render performance, layout calculation overhead
- **React Query**: Cache management, query invalidation efficiency
- **Browser Cache**: Local storage growth, cache eviction policies

## 7. Test Environment Recommendations

### 7.1 Hardware Specifications

**Minimum Test Environment**:

- 4GB RAM, dual-core CPU
- 1920x1080 display
- 10 Mbps internet connection

**Recommended Test Environment**:

- 8GB RAM, quad-core CPU
- 4K display capability
- 25+ Mbps internet connection

**Stress Test Environment**:

- 16GB+ RAM, 6+ core CPU
- Multiple display support
- 50+ Mbps internet connection

### 7.2 Browser Selection

**Primary Testing**: Latest Chrome (best DevTools support)
**Secondary Testing**: Firefox, Safari, Edge
**Fallback Testing**: Older browser versions for compatibility

### 7.3 Network Conditions

- **Stable**: Consistent high-speed connection
- **Variable**: Simulated bandwidth fluctuations
- **Limited**: Test with reduced bandwidth (5 Mbps)
- **Intermittent**: Periodic disconnections for robustness testing

## 8. Risk Assessment

### 8.1 High-Risk Areas

1. **Memory Management**: React component lifecycle, event listeners, image caching
2. **SSE Connection Handling**: Connection drops, reconnection logic, event accumulation
3. **Widget Isolation**: One widget affecting others, resource sharing conflicts
4. **Browser Resource Limits**: Reaching browser memory/connection limits

### 8.2 Medium-Risk Areas

1. **API Rate Limiting**: Weather widget, external service dependencies
2. **Content Loading**: Large image/video files, network timeouts
3. **Layout Performance**: Grid recalculations, responsive design overhead
4. **Database Performance**: MongoDB query optimization, connection pooling

### 8.3 Mitigation Strategies

- Implement circuit breakers for external APIs
- Add resource cleanup in React component unmounting
- Set maximum cache sizes for images/videos
- Implement graceful degradation for network issues

## 9. Next Steps After Testing

### 9.1 If Tests Pass

- Document stable configuration limits
- Create monitoring recommendations for production
- Establish maintenance schedules for optimal performance
- Generate deployment guidelines for various hardware specs

### 9.2 If Issues Are Found

- Prioritize critical performance bottlenecks
- Document workarounds for immediate deployment
- Plan optimization tasks for next development cycle
- Consider hardware requirement adjustments

## 10. Conclusion

This comprehensive stress testing plan will validate the digital signage system's readiness for extended production deployment. The multi-layered approach ensures both immediate performance issues and long-term stability concerns are identified and addressed.

The tests should be executed in order of increasing complexity, allowing for early identification of critical issues while building confidence in the system's overall robustness.
