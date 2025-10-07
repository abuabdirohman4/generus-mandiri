// Device utilities for timer session actions

import { getClientDeviceId } from '../../hooks/deviceUtils';

// Generate unique device ID for server actions
export function getDeviceId(): string {
  if (typeof window !== 'undefined') {
    // CLIENT-SIDE: Use centralized device ID function
    return getClientDeviceId();
  }
  // SERVER-SIDE: Generate meaningful device ID based on request context
  // This will be called from server actions, so we need to generate a unique ID
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `server-${timestamp}-${random}`;
}
