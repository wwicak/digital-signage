# Digital Signage Stress Test - Execution Guide

## Quick Start Instructions

### 1. Environment Setup (5 minutes)

#### Start the Application

```bash
# Navigate to project directory
cd /Users/dimastriwicaksono/digital-signage

# Install dependencies if needed
bun install

# Start the development server
bun run dev:server
```

#### Verify System is Running

1. Open browser to `http://localhost:3001`
2. Login with credentials (if required)
3. Verify you can access the admin panel
4. Check that you can create/edit displays

### 2. Test Data Preparation (10 minutes)

#### Create Test Content

1. **Upload Test Images** (for slideshow stress testing):

   - Gather 20-50 images of varying sizes (1-5MB each)
   - Include mix of formats: JPG, PNG, WebP
   - Upload through admin interface

2. **Prepare Test URLs** (for web widget stress testing):

   ```
   - https://www.google.com/maps
   - https://dashboard.example.com (any dashboard)
   - https://news.ycombinator.com
   - https://github.com
   ```

3. **Weather API Setup**:

   - Ensure weather widget has valid API key
   - Test with multiple locations: New York, London, Tokyo

4. **YouTube Content**:
   - Prepare playlist URLs or individual video IDs
   - Mix of short (2-3 min) and longer (10+ min) videos

### 3. Browser Setup (2 minutes)

#### Open Development Tools

1. **Chrome** (recommended): Press F12 or Cmd+Option+I
2. Go to **Console** tab
3. Go to **Performance** tab and familiarize with controls
4. Go to **Memory** tab for heap snapshot capability

#### Load Monitoring Script

1. Copy contents of [`stress-test-monitor.js`](stress-test-monitor.js)
2. Paste into Console tab
3. Press Enter to load the monitoring functions

## Test Execution Scenarios

### Scenario A: Quick Validation Test (2-4 hours)

**Purpose**: Verify basic stability and get baseline metrics

#### Setup Display Configuration:

```
Widget Layout:
- 1 Slideshow widget: 10-15 images, 3-second intervals
- 1 Weather widget: Single location
- 1 Web widget: Simple website (e.g., news site)
- 1 Announcement widget: Static text
```

#### Execution Steps:

1. Create display with above configuration
2. Navigate to display URL: `http://localhost:3001/display/[display-id]`
3. Start monitoring:
   ```javascript
   startStressTestMonitoring(5); // 5-minute intervals
   ```
4. Let run for 2-4 hours
5. Monitor console for warnings
6. Export results:
   ```javascript
   exportStressTestData();
   ```

#### Success Criteria:

- Memory growth < 20MB/hour
- No JavaScript errors
- All widgets functioning properly
- SSE connection stable

### Scenario B: Medium Stress Test (8-12 hours)

**Purpose**: Test under moderate load over extended period

#### Setup Display Configuration:

```
Widget Layout:
- 1 Large slideshow: 30+ images + 3 videos, 2-second intervals
- 2 Web widgets: Different sites, one with auto-refresh (60s)
- 1 Weather widget: 2 locations with forecast enabled
- 1 YouTube widget: Single video with autoplay
- 1 List widget: 10+ items
```

#### Execution Steps:

1. **Pre-test baseline**: Record system resources

   ```bash
   # macOS - check initial memory usage
   top -l 1 -n 5 -o mem
   ```

2. **Setup monitoring**:

   ```javascript
   startStressTestMonitoring(10); // 10-minute intervals for longer test
   ```

3. **Configure alerts** (optional):

   ```javascript
   // Set more aggressive thresholds for medium test
   window.stressTestMonitor.thresholds.maxMemoryMB = 1500;
   window.stressTestMonitor.thresholds.memoryGrowthRateMB = 15;
   ```

4. **Let run overnight** (8-12 hours)

5. **Check periodically**:
   - Every 2 hours: Visual inspection of display
   - Check for browser tab crashes
   - Monitor system responsiveness

#### Success Criteria:

- Memory growth < 30MB/hour
- < 5 JavaScript errors total
- No browser crashes
- All widgets remain functional
- SSE reconnections < 3 per 12 hours

### Scenario C: High Stress Test (24-72 hours)

**Purpose**: Maximum load testing for production validation

#### Setup Display Configuration:

```
Widget Layout (6x6 grid if possible):
- 1 Heavy slideshow: 50+ images + 5+ videos, 1-second intervals, random order
- 3 Web widgets: Complex sites (maps, dashboards), auto-refresh 30-60s
- 2 YouTube widgets: Different playlists, autoplay enabled
- 2 Weather widgets: Different locations, frequent updates
- Remaining slots: Mix of announcement, image, list widgets
```

#### Execution Steps:

1. **System preparation**:

   ```bash
   # Clear browser cache completely
   # Close all other applications
   # Ensure adequate disk space (5GB+)
   ```

2. **Enhanced monitoring**:

   ```javascript
   // Start with frequent monitoring
   startStressTestMonitoring(3); // 3-minute intervals

   // Set production-level thresholds
   window.stressTestMonitor.thresholds.maxMemoryMB = 2048;
   window.stressTestMonitor.thresholds.memoryGrowthRateMB = 10;
   window.stressTestMonitor.thresholds.maxErrorsPerHour = 2;
   ```

3. **Network simulation** (optional):

   - Use Chrome DevTools Network tab
   - Simulate "Fast 3G" or "Slow 3G" periodically
   - Test behavior under network instability

4. **Extended monitoring**:
   - Run for 24-72 hours
   - Check every 4-6 hours during business hours
   - Set up automated alerts if possible

#### Success Criteria:

- Memory growth < 15MB/hour
- < 2 JavaScript errors per hour
- No browser crashes over 24+ hours
- All widgets remain responsive
- Frame rate stays above 20 FPS
- SSE connection remains stable

## Monitoring and Data Collection

### Real-Time Monitoring

#### Console Commands:

```javascript
// Check current status
getStressTestReport();

// Get detailed memory info
console.table(window.stressTestMonitor.data.memory.slice(-5));

// Check for recent errors
console.table(window.stressTestMonitor.data.errors.slice(-10));

// Monitor SSE status
console.log("SSE Stats:", window.stressTestMonitor.data.sse);
```

#### System Resource Monitoring:

```bash
# macOS - continuous monitoring
top -o mem -s 5

# Check memory pressure
sudo memory_pressure

# Monitor network activity
nettop -d -t wifi
```

### Performance Profiling

#### Memory Heap Snapshots:

1. **Chrome DevTools** → **Memory** tab
2. Take snapshots every 2-4 hours
3. Compare snapshots to identify leaks:
   - Look for continuously growing objects
   - Check for detached DOM nodes
   - Monitor event listener counts

#### Performance Recording:

1. **Chrome DevTools** → **Performance** tab
2. Record 30-60 second samples periodically
3. Look for:
   - Long-running JavaScript tasks
   - Layout thrashing
   - Excessive garbage collection
   - Frame rate drops

### Automated Data Export

The monitoring script will automatically export data every 2 hours for long-running tests. Manual export:

```javascript
exportStressTestData();
```

This creates a timestamped JSON file with all collected metrics.

## Issue Detection and Response

### Critical Issues (Stop Test Immediately)

1. **Memory Usage > 4GB**

   ```javascript
   // Check current memory
   const report = getStressTestReport();
   if (report.summary.currentMemoryMB > 4000) {
     console.error("CRITICAL: Memory usage exceeded 4GB");
     stopStressTestMonitoring();
   }
   ```

2. **Browser Becomes Unresponsive**

   - Tab crashes or freezes
   - Cannot interact with page for >30 seconds
   - System becomes sluggish

3. **Rapid Error Accumulation**
   ```javascript
   // Check error rate
   const errors = window.stressTestMonitor.data.errors;
   const recentErrors = errors.filter((e) => Date.now() - e.timestamp < 300000); // Last 5 min
   if (recentErrors.length > 10) {
     console.error("CRITICAL: Too many recent errors");
   }
   ```

### Warning Conditions (Monitor Closely)

1. **Gradual Memory Growth**

   - Growth rate > 20MB/hour
   - Monitor for acceleration

2. **Performance Degradation**

   - Animations become choppy
   - Widget loading delays
   - Increased CPU usage

3. **Network Issues**
   - SSE disconnections increase
   - Widgets fail to load content
   - API timeouts

### Recovery Actions

#### For Memory Issues:

```javascript
// Force garbage collection (Chrome only)
if (window.gc) {
  window.gc();
  console.log("Manual garbage collection triggered");
}

// Clear performance entries
performance.clearMeasures();
performance.clearMarks();
performance.clearResourceTimings();
```

#### For Network Issues:

```javascript
// Check SSE connection status
const report = getStressTestReport();
console.log("SSE disconnections:", report.summary.sseDisconnections);

// If too many disconnections, may need to restart browser
```

## Results Analysis

### Expected Baseline Results

**Healthy System Indicators**:

- Memory growth: 5-15 MB/hour
- CPU usage: 10-30% average
- JavaScript errors: < 1 per hour
- SSE disconnections: < 1 per 8 hours
- Frame rate: 30+ FPS consistently

### Red Flags

**Memory Leaks**:

- Linear memory growth > 30MB/hour
- Heap snapshots showing growing detached DOM
- Performance degradation over time

**Performance Issues**:

- Frame rate consistently < 20 FPS
- CPU usage consistently > 60%
- Widget loading times > 10 seconds

**Stability Issues**:

- JavaScript errors > 5 per hour
- Browser crashes
- SSE connection instability (> 5 disconnections/hour)

## Troubleshooting Common Issues

### High Memory Usage

**Potential Causes**:

1. **Image/Video Caching**: Slideshow widget not releasing old content
2. **Event Listeners**: Accumulating listeners from SSE or widget updates
3. **DOM Nodes**: Widgets not properly cleaning up on updates

**Investigation**:

```javascript
// Check DOM node count
console.log("DOM nodes:", document.querySelectorAll("*").length);

// Look for memory leaks in heap snapshots
// Compare snapshots 2 hours apart
```

### SSE Connection Issues

**Potential Causes**:

1. Network instability
2. Server-side connection limits
3. Browser resource constraints

**Investigation**:

```javascript
// Check SSE statistics
console.log(window.stressTestMonitor.data.sse);

// Monitor in Network tab of DevTools
// Look for 'display/[id]/events' endpoint
```

### Widget Loading Failures

**Potential Causes**:

1. Network timeouts
2. API rate limiting (weather widget)
3. Resource exhaustion

**Investigation**:

- Check browser Network tab for failed requests
- Look for CORS errors in console
- Verify API keys and quotas

## Post-Test Reporting

### Generate Final Report

```javascript
const finalReport = stopStressTestMonitoring();
console.log("Test completed. Final report:");
console.table(finalReport.summary);

// Export detailed data
exportStressTestData();
```

### Key Metrics to Document

1. **Test Duration**: Total hours run
2. **Peak Memory Usage**: Maximum memory consumption
3. **Error Count**: Total JavaScript errors
4. **SSE Stability**: Connection/disconnection ratio
5. **Widget Performance**: Any widgets that failed or degraded
6. **System Impact**: Effect on overall system performance

### Recommendations Based on Results

**If tests pass**: Document the tested configuration as production-ready
**If issues found**: Prioritize fixes based on severity:

1. Memory leaks (critical)
2. Performance degradation (high)
3. Error frequency (medium)
4. Minor stability issues (low)

This execution guide provides a systematic approach to validating the digital signage system's long-term stability and performance under various load conditions.
