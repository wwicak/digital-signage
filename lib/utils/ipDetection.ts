/**
 * IP Address Detection Utilities
 * Provides multiple methods to detect the client's IP address
 */

export interface IPDetectionResult {
  ip: string | null;
  method: 'webrtc' | 'api' | 'local' | 'fallback';
  error?: string;
}

/**
 * Detect IP address using WebRTC (most reliable for local IP)
 */
export const detectIPViaWebRTC = (): Promise<IPDetectionResult> => {
  return new Promise((resolve) => {
    try {
      const rtc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      rtc.createDataChannel('');
      
      rtc.onicecandidate = (event) => {
        if (event.candidate) {
          const candidate = event.candidate.candidate;
          const ipMatch = candidate.match(/(\d+\.\d+\.\d+\.\d+)/);
          if (ipMatch) {
            const ip = ipMatch[1];
            // Filter out common non-local IPs
            if (!ip.startsWith('0.') && !ip.startsWith('169.254.')) {
              rtc.close();
              resolve({ ip, method: 'webrtc' });
              return;
            }
          }
        }
      };

      rtc.createOffer()
        .then(offer => rtc.setLocalDescription(offer))
        .catch(() => resolve({ ip: null, method: 'webrtc', error: 'Failed to create offer' }));

      // Timeout after 5 seconds
      setTimeout(() => {
        rtc.close();
        resolve({ ip: null, method: 'webrtc', error: 'Timeout' });
      }, 5000);

    } catch (error) {
      resolve({ ip: null, method: 'webrtc', error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });
};

/**
 * Detect IP address using external API services
 */
export const detectIPViaAPI = async (): Promise<IPDetectionResult> => {
  const apis = [
    'https://api.ipify.org?format=json',
    'https://ipapi.co/json/',
    'https://httpbin.org/ip'
  ];

  for (const apiUrl of apis) {
    try {
      const response = await fetch(apiUrl, { 
        method: 'GET',
        // Note: fetch doesn't support timeout directly, would need AbortController
        // timeout: 3000 
      });
      
      if (response.ok) {
        const data = await response.json();
        const ip = data.ip || data.origin;
        if (ip) {
          return { ip, method: 'api' };
        }
      }
    } catch (error) {
      // Continue to next API
      continue;
    }
  }

  return { ip: null, method: 'api', error: 'All API services failed' };
};

/**
 * Detect local network information
 */
export const detectLocalNetworkInfo = (): Promise<IPDetectionResult> => {
  return new Promise((resolve) => {
    try {
      // Try to get network information if available
      if ('connection' in navigator) {
        // NetworkInformation API type
        const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
        if (connection && 'effectiveType' in connection) {
          // This doesn't give us IP but gives us network info
          resolve({ ip: null, method: 'local', error: 'Network info available but no IP' });
          return;
        }
      }

      // Fallback: try to detect if we're on localhost
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        resolve({ ip: '127.0.0.1', method: 'local' });
        return;
      }

      // Try to extract IP from hostname if it's an IP
      const ipRegex = /^(\d+\.\d+\.\d+\.\d+)$/;
      const ipMatch = hostname.match(ipRegex);
      if (ipMatch) {
        resolve({ ip: ipMatch[1], method: 'local' });
        return;
      }

      resolve({ ip: null, method: 'local', error: 'No local IP detection method available' });
    } catch (error) {
      resolve({ ip: null, method: 'local', error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });
};

/**
 * Comprehensive IP detection using multiple methods
 */
export const detectIPAddress = async (): Promise<IPDetectionResult> => {
  // Try WebRTC first (best for local network IP)
  const webrtcResult = await detectIPViaWebRTC();
  if (webrtcResult.ip) {
    return webrtcResult;
  }

  // Try local network detection
  const localResult = await detectLocalNetworkInfo();
  if (localResult.ip) {
    return localResult;
  }

  // Try external API as fallback
  const apiResult = await detectIPViaAPI();
  if (apiResult.ip) {
    return apiResult;
  }

  // Final fallback
  return { 
    ip: 'Unable to detect', 
    method: 'fallback', 
    error: 'All detection methods failed' 
  };
};

/**
 * Get device network information
 */
export const getDeviceNetworkInfo = () => {
  const info = {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    cookieEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine,
    screenResolution: `${screen.width}x${screen.height}`,
    colorDepth: screen.colorDepth,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    hostname: window.location.hostname,
    port: window.location.port,
    protocol: window.location.protocol,
  };

  // Add connection info if available
  if ('connection' in navigator) {
    const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
    if (connection) {
      return {
        ...info,
        connection: {
          effectiveType: 'effectiveType' in connection ? connection.effectiveType : undefined,
          downlink: 'downlink' in connection ? connection.downlink : undefined,
          rtt: 'rtt' in connection ? connection.rtt : undefined,
        }
      };
    }
  }

  return info;
};
