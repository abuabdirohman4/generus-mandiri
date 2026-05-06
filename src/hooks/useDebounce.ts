import { useState, useEffect } from 'react';

/**
 * Debounces a value — only updates after `delay` ms of inactivity.
 * Useful for delaying expensive side-effects (e.g. SWR key changes / API calls)
 * while keeping UI state (dropdowns, inputs) immediately responsive.
 *
 * @param value The value to debounce
 * @param delay Delay in milliseconds
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
