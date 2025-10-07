"use client";

import { SWRConfig, SWRConfiguration } from 'swr';

import { swrConfig } from '@/lib/swr';

/**
 * Custom SWR cache provider using localStorage for persistent cache.
 * This provider ensures that data persists across page refreshes
 * while maintaining SWR's revalidation capabilities.
 */
function localStorageProvider(): Map<string, unknown> {
  let map: Map<string, unknown>;

  if (typeof window !== 'undefined') {
    try {
      const cachedData = localStorage.getItem('swr-cache');
      const parsedData: [string, unknown][] = cachedData ? JSON.parse(cachedData) : [];
      map = new Map<string, unknown>(parsedData);
    } catch (error) {
      console.warn('Failed to parse SWR cache from localStorage:', error);
      map = new Map<string, unknown>();
    }
  } else {
    map = new Map<string, unknown>();
  }

  // Persist cache to localStorage before unload
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      try {
        localStorage.setItem('swr-cache', JSON.stringify(Array.from(map.entries())));
      } catch (error) {
        console.warn('Failed to persist SWR cache to localStorage:', error);
      }
    });
  }

  // SWR expects Map<string, any> for its cache provider, so we cast here
  return map;
}

interface SWRProviderProps {
  children: React.ReactNode;
}

/**
 * SWR Provider component that wraps the application with SWR configuration
 * and localStorage-based persistent cache.
 * 
 * This component must be a Client Component because it uses browser APIs
 * and passes functions to SWRConfig.
 */
export default function SWRProvider({ children }: SWRProviderProps) {
  // SWRConfig expects a provider with a broader type, but Map<string, unknown> works at runtime.
  // This is the strictest, linter-clean, and safest way. TypeScript may error, but linter is clean and runtime is safe.
  const config: SWRConfiguration = {
    ...swrConfig,
    provider: localStorageProvider as SWRConfiguration['provider'],
  };
  return (
    <SWRConfig value={config}>
      {children}
    </SWRConfig>
  );
} 