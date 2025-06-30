import React, { useEffect, useRef, useCallback } from 'react';

interface DisplayHeartbeatProps {
  displayId: string;
  interval?: number; // Heartbeat interval in milliseconds
  enabled?: boolean;
  onHeartbeatSent?: (success: boolean, responseTime?: number) => void;
  onConnectionStatusChange?: (isConnected: boolean) => void;
}

interface ClientInfo {
  screenResolution: string;
  browserVersion: string;
  platform: string;
  memoryUsage?: number;
  cpuUsage?: number;
  networkType?: string;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

interface PerformanceMetrics {
  renderTime?: number;
  loadTime?: number;
  errorCount: number;
}

/**
 * DisplayHeartbeat component for sending periodic heartbeats to the server
 * Optimized for Android TV browsers and various hardware platforms
 */
const DisplayHeartbeat: React.FC<DisplayHeartbeatProps> = ({
  displayId,
  interval = 30000, // 30 seconds default
  enabled = true,
  onHeartbeatSent,
  onConnectionStatusChange,
}) => {
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const lastHeartbeatRef = useRef<number>(0);
  const consecutiveFailuresRef = useRef<number>(0);
  const errorCountRef = useRef<number>(0);
  const isConnectedRef = useRef<boolean>(false);

  // Get client IP address (best effort)
  const getClientIPAddress = useCallback(async (): Promise<string | undefined> => {
    try {
      // Try to get IP from WebRTC (works in most browsers)
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      return new Promise((resolve) => {
        pc.createDataChannel('');
        pc.createOffer().then(offer => pc.setLocalDescription(offer));

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            const candidate = event.candidate.candidate;
            const ipMatch = candidate.match(/(\d+\.\d+\.\d+\.\d+)/);
            if (ipMatch) {
              pc.close();
              resolve(ipMatch[1]);
              return;
            }
          }
        };

        // Fallback after timeout
        setTimeout(() => {
          pc.close();
          resolve(undefined);
        }, 3000);
      });
    } catch (error) {
      console.warn('Could not determine client IP address:', error);
      return undefined;
    }
  }, []);

  // Get client information
  const getClientInfo = useCallback(async (): Promise<ClientInfo & { ipAddress?: string }> => {
    // Type assertion for navigator with additional properties
    const nav = navigator as Navigator & {
      userAgent: string;
      platform: string;
    };

    // Get screen resolution
    const screenResolution = `${screen.width}x${screen.height}`;

    // Get browser version (simplified)
    const browserVersion = nav.userAgent || 'Unknown';

    // Get platform
    const platform = nav.platform || 'Unknown';

    // Get client IP address
    const ipAddress = await getClientIPAddress();
    
    // Get memory usage (if available)
    let memoryUsage: number | undefined;
    if ('memory' in performance) {
      const memory = (performance as Performance & {
        memory: {
          usedJSHeapSize: number;
          totalJSHeapSize: number;
        };
      }).memory;
      memoryUsage = memory.usedJSHeapSize / memory.totalJSHeapSize;
    }
    
    // Get network type (if available)
    let networkType: string | undefined;
    let connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' = 'good';
    
    if ('connection' in nav) {
      // Type the connection object with proper interface
      const connection = nav.connection as {
        effectiveType?: string;
        type?: string;
      };
      networkType = connection.effectiveType || connection.type;
      
      // Determine connection quality based on effective type
      switch (connection.effectiveType) {
        case '4g':
          connectionQuality = 'excellent';
          break;
        case '3g':
          connectionQuality = 'good';
          break;
        case '2g':
          connectionQuality = 'fair';
          break;
        case 'slow-2g':
          connectionQuality = 'poor';
          break;
        default:
          connectionQuality = 'good';
      }
    }
    
    return {
      screenResolution,
      browserVersion,
      platform,
      memoryUsage,
      networkType,
      connectionQuality,
      ipAddress,
    };
  }, [getClientIPAddress]);

  // Get performance metrics
  const getPerformanceMetrics = useCallback((): PerformanceMetrics => {
    const metrics: PerformanceMetrics = {
      errorCount: errorCountRef.current,
    };

    // Get render time (if available)
    if ('getEntriesByType' in performance) {
      const paintEntries = performance.getEntriesByType('paint');
      const firstContentfulPaint = paintEntries.find(
        entry => entry.name === 'first-contentful-paint'
      );
      if (firstContentfulPaint) {
        metrics.renderTime = firstContentfulPaint.startTime;
      }
    }

    // Get load time
    if ('timing' in performance) {
      const timing = performance.timing;
      if (timing.loadEventEnd && timing.navigationStart) {
        metrics.loadTime = timing.loadEventEnd - timing.navigationStart;
      }
    }

    return metrics;
  }, []);

  // Send heartbeat to server
  const sendHeartbeat = useCallback(async (): Promise<boolean> => {
    if (!displayId || !enabled) return false;

    const startTime = Date.now();
    
    try {
      const clientInfo = await getClientInfo();
      const performanceMetrics = getPerformanceMetrics();

      const response = await fetch(`/api/v1/displays/${displayId}/heartbeat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          clientInfo,
          performanceMetrics,
        }),
        // Add timeout for Android TV browsers
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      const responseTime = Date.now() - startTime;
      lastHeartbeatRef.current = Date.now();

      if (response.ok) {
        consecutiveFailuresRef.current = 0;
        
        // Update connection status
        if (!isConnectedRef.current) {
          isConnectedRef.current = true;
          onConnectionStatusChange?.(true);
        }
        
        onHeartbeatSent?.(true, responseTime);
        return true;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
    } catch (error) {
      console.error('Heartbeat failed:', error);
      consecutiveFailuresRef.current += 1;
      errorCountRef.current += 1;
      
      // Update connection status after multiple failures
      if (consecutiveFailuresRef.current >= 3 && isConnectedRef.current) {
        isConnectedRef.current = false;
        onConnectionStatusChange?.(false);
      }
      
      onHeartbeatSent?.(false);
      return false;
    }
  }, [displayId, enabled, getClientInfo, getPerformanceMetrics, onHeartbeatSent, onConnectionStatusChange]);

  // Start heartbeat interval
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    // Send initial heartbeat
    sendHeartbeat();

    // Set up interval
    heartbeatIntervalRef.current = setInterval(() => {
      sendHeartbeat();
    }, interval);
  }, [sendHeartbeat, interval]);

  // Stop heartbeat interval
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = undefined;
    }
  }, []);

  // Handle visibility change (pause heartbeat when tab is hidden)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopHeartbeat();
      } else if (enabled) {
        startHeartbeat();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, startHeartbeat, stopHeartbeat]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      if (enabled) {
        startHeartbeat();
      }
    };

    const handleOffline = () => {
      stopHeartbeat();
      isConnectedRef.current = false;
      onConnectionStatusChange?.(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [enabled, startHeartbeat, stopHeartbeat, onConnectionStatusChange]);

  // Main effect to control heartbeat
  useEffect(() => {
    if (enabled && displayId) {
      startHeartbeat();
    } else {
      stopHeartbeat();
    }

    return () => {
      stopHeartbeat();
    };
  }, [enabled, displayId, startHeartbeat, stopHeartbeat]);

  // Handle page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Send final heartbeat with disconnect signal
      if (displayId && enabled) {
        navigator.sendBeacon(
          `/api/v1/displays/${displayId}/heartbeat`,
          JSON.stringify({
            timestamp: new Date().toISOString(),
            disconnect: true,
          })
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [displayId, enabled]);

  // This component doesn't render anything visible
  return null;
};

export default DisplayHeartbeat;
