/**
 * Digital Signage Stress Test Monitoring Script
 *
 * This script should be run in the browser console during stress testing
 * to automatically collect performance metrics and detect potential issues.
 *
 * Usage:
 * 1. Open the display page in your browser
 * 2. Open Developer Tools (F12)
 * 3. Go to Console tab
 * 4. Copy and paste this entire script
 * 5. Run: startStressTestMonitoring()
 * 6. To stop: stopStressTestMonitoring()
 */

class StressTestMonitor {
  constructor() {
    this.isRunning = false
    this.startTime = null
    this.intervals = []
    this.data = {
      memory: [],
      performance: [],
      errors: [],
      widgets: [],
      sse: {
        connections: 0,
        disconnections: 0,
        events: 0,
      },
    }

    this.thresholds = {
      memoryGrowthRateMB: 10, // MB per hour
      maxMemoryMB: 2048, // 2GB
      maxCPUPercent: 80,
      maxErrorsPerHour: 5,
      minFPS: 20,
    }

    this.setupErrorTracking()
    this.setupSSETracking()
  }

  setupErrorTracking() {
    const originalError = console.error
    console.error = (...args) => {
      this.data.errors.push({
        timestamp: Date.now(),
        message: args.join(' '),
        type: 'console.error',
      })
      originalError.apply(console, args)
    }

    window.addEventListener('error', (event) => {
      this.data.errors.push({
        timestamp: Date.now(),
        message: event.message,
        source: event.filename,
        line: event.lineno,
        type: 'javascript.error',
      })
    })

    window.addEventListener('unhandledrejection', (event) => {
      this.data.errors.push({
        timestamp: Date.now(),
        message: event.reason.toString(),
        type: 'promise.rejection',
      })
    })
  }

  setupSSETracking() {
    // Monitor SSE connections by intercepting EventSource
    const originalEventSource = window.EventSource
    const monitor = this

    window.EventSource = function (...args) {
      const eventSource = new originalEventSource(...args)

      eventSource.addEventListener('open', () => {
        monitor.data.sse.connections++
        console.log(
          `[SSE Monitor] Connection opened. Total: ${monitor.data.sse.connections}`
        )
      })

      eventSource.addEventListener('error', () => {
        monitor.data.sse.disconnections++
        console.log(
          `[SSE Monitor] Connection error. Total disconnections: ${monitor.data.sse.disconnections}`
        )
      })

      // Track all events
      const originalAddEventListener = eventSource.addEventListener
      eventSource.addEventListener = function (type, listener, ...rest) {
        const wrappedListener = (event) => {
          monitor.data.sse.events++
          if (type !== 'error' && type !== 'open') {
            console.log(`[SSE Monitor] Event received: ${type}`)
          }
          listener(event)
        }
        originalAddEventListener.call(this, type, wrappedListener, ...rest)
      }

      return eventSource
    }
  }

  collectMemoryData() {
    const memoryInfo = performance.memory
    if (!memoryInfo) {
      console.warn(
        '[Monitor] Performance.memory not available in this browser'
      )
      return null
    }

    const data = {
      timestamp: Date.now(),
      used: Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024), // MB
      total: Math.round(memoryInfo.totalJSHeapSize / 1024 / 1024), // MB
      limit: Math.round(memoryInfo.jsHeapSizeLimit / 1024 / 1024), // MB
      domNodes: document.querySelectorAll('*').length,
      eventListeners: this.countEventListeners(),
    }

    this.data.memory.push(data)
    return data
  }

  countEventListeners() {
    // This is a placeholder to avoid performance issues.
    return -1;
  }

  collectPerformanceData() {
    const data = {
      timestamp: Date.now(),
      navigation: performance.getEntriesByType('navigation')[0] || {},
      resources: performance.getEntriesByType('resource').length,
      measures: performance.getEntriesByType('measure').length,
    }

    this.data.performance.push(data)
    return data
  }

  analyzeWidgets() {
    const widgets = []

    // Look for widget containers
    const widgetElements = document.querySelectorAll(
      '.widget-wrapper, [class*="widget"]'
    )

    widgetElements.forEach((el) => {
      const widget = {
        timestamp: Date.now(),
        type: this.detectWidgetType(el),
        visible: this.isElementVisible(el),
        size: {
          width: el.offsetWidth,
          height: el.offsetHeight,
        },
        children: el.children.length,
        hasErrors: el.querySelector('.error, [class*="error"]') !== null,
      }
      widgets.push(widget)
    })

    this.data.widgets = widgets
    return widgets
  }

  detectWidgetType(element) {
    // Try to detect widget type from class names or content
    const className = element.className
    if (className.includes('slideshow')) return 'slideshow'
    if (className.includes('weather')) return 'weather'
    if (className.includes('youtube')) return 'youtube'
    if (className.includes('web')) return 'web'
    if (className.includes('announcement')) return 'announcement'
    if (className.includes('congrats')) return 'congrats'
    if (className.includes('image')) return 'image'
    if (className.includes('list')) return 'list'

    // Try to detect from content
    if (element.querySelector('iframe')) return 'web'
    if (element.querySelector('img')) return 'slideshow'
    if (element.querySelector('[class*="weather"]')) return 'weather'

    return 'unknown'
  }

  isElementVisible(element) {
    const rect = element.getBoundingClientRect()
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      rect.top < window.innerHeight &&
      rect.bottom > 0
    )
  }

  checkThresholds() {
    const warnings = []
    const latest = this.data.memory[this.data.memory.length - 1]

    if (!latest) return warnings

    // Memory usage check
    if (latest.used > this.thresholds.maxMemoryMB) {
      warnings.push(
        `HIGH MEMORY USAGE: ${latest.used}MB exceeds threshold of ${this.thresholds.maxMemoryMB}MB`
      )
    }

    // Memory growth rate check
    if (this.data.memory.length > 4) {
      const hourAgo = latest.timestamp - 60 * 60 * 1000
      const oldMemory = this.data.memory.find((m) => m.timestamp >= hourAgo)
      if (oldMemory) {
        const growthRate = latest.used - oldMemory.used
        if (growthRate > this.thresholds.memoryGrowthRateMB) {
          warnings.push(
            `MEMORY LEAK DETECTED: Growing at ${growthRate}MB/hour (threshold: ${this.thresholds.memoryGrowthRateMB}MB/hour)`
          )
        }
      }
    }

    // Error rate check
    const hoursRunning = (Date.now() - this.startTime) / (1000 * 60 * 60)
    const errorRate = this.data.errors.length / Math.max(hoursRunning, 0.1)
    if (errorRate > this.thresholds.maxErrorsPerHour) {
      warnings.push(
        `HIGH ERROR RATE: ${errorRate.toFixed(1)} errors/hour (threshold: ${
          this.thresholds.maxErrorsPerHour
        }/hour)`
      )
    }

    return warnings
  }

  generateReport() {
    const runningTime = this.startTime
      ? (Date.now() - this.startTime) / 1000 / 60
      : 0 // minutes
    const latest = this.data.memory[this.data.memory.length - 1]

    const report = {
      summary: {
        runningTimeMinutes: Math.round(runningTime),
        currentMemoryMB: latest ? latest.used : 'N/A',
        totalErrors: this.data.errors.length,
        sseConnections: this.data.sse.connections,
        sseDisconnections: this.data.sse.disconnections,
        sseEvents: this.data.sse.events,
      },
      memory: {
        samples: this.data.memory.length,
        peak: this.data.memory.reduce(
          (max, m) => (m.used > max ? m.used : max),
          0
        ),
        trend: this.calculateMemoryTrend(),
      },
      errors: this.data.errors.slice(-10), // Last 10 errors
      warnings: this.checkThresholds(),
      widgets: {
        total: this.data.widgets.length,
        types: this.getWidgetTypeCounts(),
      },
    }

    return report
  }

  calculateMemoryTrend() {
    if (this.data.memory.length < 2) return 'insufficient_data'

    const recent = this.data.memory.slice(-5)
    const trend = recent[recent.length - 1].used - recent[0].used

    if (trend > 5) return 'increasing'
    if (trend < -5) return 'decreasing'
    return 'stable'
  }

  getWidgetTypeCounts() {
    const counts = {}
    this.data.widgets.forEach((w) => {
      counts[w.type] = (counts[w.type] || 0) + 1
    })
    return counts
  }

  start(intervalMinutes = 5) {
    if (this.isRunning) {
      console.warn('[Monitor] Already running!')
      return
    }

    this.isRunning = true
    this.startTime = Date.now()

    console.log(
      `[Monitor] Starting stress test monitoring with ${intervalMinutes} minute intervals`
    )
    console.log('[Monitor] Use stopStressTestMonitoring() to stop')

    // Initial data collection
    this.collectMemoryData()
    this.collectPerformanceData()
    this.analyzeWidgets()

    // Set up periodic collection
    const interval = setInterval(() => {
      try {
        const memory = this.collectMemoryData()
        this.collectPerformanceData()
        this.analyzeWidgets()

        if (memory) {
          console.log(
            `[Monitor] Memory: ${memory.used}MB used, ${memory.domNodes} DOM nodes`
          )
        }

        const warnings = this.checkThresholds()
        warnings.forEach((warning) => {
          console.warn(`[Monitor] ⚠️ ${warning}`)
        })

        // Auto-export data if running for more than 2 hours
        const runningHours = (Date.now() - this.startTime) / 1000 / 60 / 60
        if (runningHours > 2 && runningHours % 2 < intervalMinutes / 60) {
          this.exportData()
        }
      } catch (error) {
        console.error('[Monitor] Error during data collection:', error)
      }
    }, intervalMinutes * 60 * 1000)

    this.intervals.push(interval)
  }

  stop() {
    if (!this.isRunning) {
      console.warn('[Monitor] Not currently running!')
      return
    }

    this.isRunning = false
    this.intervals.forEach((interval) => clearInterval(interval))
    this.intervals = []

    console.log('[Monitor] Stopped monitoring')
    console.log('[Monitor] Final report:')
    console.table(this.generateReport().summary)

    return this.generateReport()
  }

  exportData() {
    const report = this.generateReport()
    const filename = `stress-test-${new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/:/g, '-')}.json`

    try {
      const blob = new Blob([JSON.stringify(report, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      console.log(`[Monitor] Data exported to ${filename}`)
    } catch (error) {
      console.error('[Monitor] Failed to export data:', error)
      console.log('[Monitor] Raw data:', report)
    }
  }

  getReport() {
    return this.generateReport()
  }
}

// Global instance
window.stressTestMonitor = new StressTestMonitor()

// Convenience functions for console use
function startStressTestMonitoring(intervalMinutes = 5) {
  window.stressTestMonitor.start(intervalMinutes)
}

function stopStressTestMonitoring() {
  return window.stressTestMonitor.stop()
}

function getStressTestReport() {
  return window.stressTestMonitor.getReport()
}

function exportStressTestData() {
  window.stressTestMonitor.exportData()
}

// Display help
console.log(`
🧪 Digital Signage Stress Test Monitor loaded!

Available commands:
- startStressTestMonitoring(minutes) - Start monitoring (default: 5 min intervals)
- stopStressTestMonitoring() - Stop monitoring and get final report
- getStressTestReport() - Get current status report
- exportStressTestData() - Export data to JSON file

Example:
startStressTestMonitoring(2); // Start with 2-minute intervals
`)
