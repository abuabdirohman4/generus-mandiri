/**
 * Toggle-able debug logging for the attendance realtime/polling sync.
 *
 * OFF by default (production + normal dev stays clean). Turn ON when debugging
 * the live-sync count (e.g. the 72↔71 divergence) — no need to re-add logs.
 *
 * Enable, either:
 *   1) Set NEXT_PUBLIC_DEBUG_ATTENDANCE=1 in .env.local (persists), OR
 *   2) In the browser console: localStorage.setItem('debug:attendance', '1')
 *      then reload. Disable: localStorage.removeItem('debug:attendance').
 */
function isEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_DEBUG_ATTENDANCE === '1') return true
  if (typeof window !== 'undefined') {
    try {
      return window.localStorage.getItem('debug:attendance') === '1'
    } catch {
      return false
    }
  }
  return false
}

export function attendanceDebug(...args: unknown[]): void {
  if (!isEnabled()) return
  // eslint-disable-next-line no-console
  console.log('[attendance]', new Date().toLocaleTimeString(), ...args)
}
