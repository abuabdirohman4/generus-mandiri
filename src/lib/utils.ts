import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Detects if the user is on a Mac system
 * @returns {boolean} True if running on Mac, false otherwise
 */
export function isMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
}

/**
 * Checks if the correct modifier key is pressed for keyboard shortcuts
 * @param event - Keyboard event
 * @returns {boolean} True if the correct modifier key is pressed
 */
export function isModifierKeyPressed(event: KeyboardEvent): boolean {
  return isMac() ? event.metaKey : event.ctrlKey;
}

/**
 * Detects if the current screen size is desktop (≥ 768px)
 * @returns {boolean} True if screen width is desktop size, false otherwise
 */
export function isDesktop(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth >= 768;
}

/**
 * Detects if the current screen size is mobile (< 768px)
 * @returns {boolean} True if screen width is mobile size, false otherwise
 */
export function isMobile(): boolean {
  return !isDesktop();
}

/**
 * Detects if the user is on a real mobile device (not just small screen)
 * Combines screen size check with touch capability detection
 * @returns {boolean} True if on actual mobile device
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0
  );
}

/**
 * Detects if should use mobile UI (actual mobile device)
 * @returns {boolean} True if should use mobile native inputs
 */
export function shouldUseMobileUI(): boolean {
  return isMobile() && isTouchDevice();
}

