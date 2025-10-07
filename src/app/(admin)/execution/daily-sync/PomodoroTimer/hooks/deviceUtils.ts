// Device and browser utilities for timer persistence

// Helper function to get client-side device ID
export function getClientDeviceId(): string {
  if (typeof window === 'undefined') return 'server-unknown';
  
  let deviceId = localStorage.getItem('device-id');
  if (!deviceId) {
    // Create more meaningful device ID
    const userAgent = navigator.userAgent;
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const browser = getBrowserName(userAgent);
    const deviceType = isMobile ? 'mobile' : 'desktop';
    
    // Generate UUID but prefix with device info
    const uuid = crypto.randomUUID();
    deviceId = `${deviceType}-${browser}-${uuid.substring(0, 8)}`;
    localStorage.setItem('device-id', deviceId);
  }
  return deviceId;
}

// Helper function to detect browser (internal use only)
function getBrowserName(userAgent: string): string {
  if (userAgent.includes('Chrome')) return 'chrome';
  if (userAgent.includes('Firefox')) return 'firefox';
  if (userAgent.includes('Safari')) return 'safari';
  if (userAgent.includes('Edge')) return 'edge';
  if (userAgent.includes('Arc')) return 'arc';
  return 'unknown';
}

