/**
 * Performance monitoring utility for drag and drop operations
 */

interface PerformanceMetrics {
  dragStartTime: number;
  dragEndTime: number;
  totalDragTime: number;
  frameCount: number;
  averageFPS: number;
  apiCallCount: number;
  apiCallTime: number;
}

class DragPerformanceMonitor {
  private metrics: Partial<PerformanceMetrics> = {};
  private frameStartTime: number = 0;
  private frameCount: number = 0;
  private animationFrameId: number | null = null;
  private apiCallStartTime: number = 0;
  private apiCallCount: number = 0;
  private totalApiTime: number = 0;

  startDragMonitoring(): void {
    this.metrics.dragStartTime = performance.now();
    this.frameCount = 0;
    this.frameStartTime = performance.now();
    this.startFrameMonitoring();
    console.log("[PERF] Drag monitoring started");
  }

  stopDragMonitoring(): void {
    this.metrics.dragEndTime = performance.now();
    this.metrics.totalDragTime =
      this.metrics.dragEndTime - (this.metrics.dragStartTime || 0);
    this.metrics.frameCount = this.frameCount;
    this.metrics.averageFPS = this.calculateAverageFPS();
    this.metrics.apiCallCount = this.apiCallCount;
    this.metrics.apiCallTime = this.totalApiTime;

    this.stopFrameMonitoring();
    this.logMetrics();
    this.resetMetrics();
  }

  startApiCall(): void {
    this.apiCallStartTime = performance.now();
  }

  endApiCall(): void {
    if (this.apiCallStartTime > 0) {
      const callTime = performance.now() - this.apiCallStartTime;
      this.totalApiTime += callTime;
      this.apiCallCount++;
      this.apiCallStartTime = 0;
    }
  }

  private startFrameMonitoring(): void {
    const monitorFrame = () => {
      this.frameCount++;
      this.animationFrameId = requestAnimationFrame(monitorFrame);
    };
    this.animationFrameId = requestAnimationFrame(monitorFrame);
  }

  private stopFrameMonitoring(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private calculateAverageFPS(): number {
    const totalTime =
      (this.metrics.dragEndTime || 0) - (this.metrics.dragStartTime || 0);
    if (totalTime === 0) return 0;
    return Math.round((this.frameCount * 1000) / totalTime);
  }

  private logMetrics(): void {
    console.group("[PERF] Drag Performance Metrics");
    console.log(`Total drag time: ${this.metrics.totalDragTime?.toFixed(2)}ms`);
    console.log(`Average FPS: ${this.metrics.averageFPS}`);
    console.log(`Frame count: ${this.metrics.frameCount}`);
    console.log(`API calls: ${this.metrics.apiCallCount}`);
    console.log(`Total API time: ${this.metrics.apiCallTime?.toFixed(2)}ms`);

    // Performance warnings
    if ((this.metrics.averageFPS || 0) < 30) {
      console.warn("⚠️ Low FPS detected during drag operation");
    }
    if ((this.metrics.totalDragTime || 0) > 5000) {
      console.warn("⚠️ Long drag operation detected");
    }
    if ((this.metrics.apiCallTime || 0) > 1000) {
      console.warn("⚠️ High API call time detected");
    }

    console.groupEnd();
  }

  private resetMetrics(): void {
    this.metrics = {};
    this.frameCount = 0;
    this.apiCallCount = 0;
    this.totalApiTime = 0;
  }

  // Get current metrics without stopping monitoring
  getCurrentMetrics(): Partial<PerformanceMetrics> {
    const currentTime = performance.now();
    return {
      ...this.metrics,
      totalDragTime: currentTime - (this.metrics.dragStartTime || currentTime),
      frameCount: this.frameCount,
      averageFPS: this.calculateCurrentFPS(currentTime),
      apiCallCount: this.apiCallCount,
      apiCallTime: this.totalApiTime,
    };
  }

  private calculateCurrentFPS(currentTime: number): number {
    const totalTime = currentTime - (this.metrics.dragStartTime || currentTime);
    if (totalTime === 0) return 0;
    return Math.round((this.frameCount * 1000) / totalTime);
  }
}

// Singleton instance
export const dragPerformanceMonitor = new DragPerformanceMonitor();

// Utility functions for easy integration
export const startDragPerformanceMonitoring = () =>
  dragPerformanceMonitor.startDragMonitoring();
export const stopDragPerformanceMonitoring = () =>
  dragPerformanceMonitor.stopDragMonitoring();
export const startApiCallMonitoring = () =>
  dragPerformanceMonitor.startApiCall();
export const endApiCallMonitoring = () => dragPerformanceMonitor.endApiCall();
export const getCurrentDragMetrics = () =>
  dragPerformanceMonitor.getCurrentMetrics();

// React hook for performance monitoring
export const useDragPerformanceMonitoring = () => {
  return {
    startMonitoring: startDragPerformanceMonitoring,
    stopMonitoring: stopDragPerformanceMonitoring,
    startApiCall: startApiCallMonitoring,
    endApiCall: endApiCallMonitoring,
    getCurrentMetrics: getCurrentDragMetrics,
  };
};
