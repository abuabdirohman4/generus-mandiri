// Timer development utilities

/**
 * Check if timer functionality is enabled in development
 * @returns true if timer is enabled, false if disabled
 */
export function isTimerEnabledInDev(): boolean {
  // In production, always enable timer
  if (process.env.NODE_ENV === 'production') {
    return true;
  }
  
  // In development, check environment variable
  const enableTimerDev = process.env.NEXT_PUBLIC_ENABLE_TIMER_DEV;
  return enableTimerDev === 'true';
}

/**
 * Check if timer should be disabled (for UI display)
 * @returns true if timer should be disabled
 */
export function isTimerDisabled(): boolean {
  return process.env.NODE_ENV === 'development' && !isTimerEnabledInDev();
}

/**
 * Get timer status message for development
 * @returns status message or null
 */
export function getTimerDevStatusMessage(): string | null {
  if (process.env.NODE_ENV === 'development' && !isTimerEnabledInDev()) {
    return 'Timer disabled in development mode. Set NEXT_PUBLIC_ENABLE_TIMER_DEV=true in .env.local to enable.';
  }
  return null;
}
