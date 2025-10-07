"use client";

import { SWRConfig } from 'swr';

import { swrConfig } from '@/lib/swr';

interface PreloadProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component that handles SWR configuration
 * SIMPLIFIED: No critical data prefetching needed since dashboard is static
 */
export default function PreloadProvider({ children }: PreloadProviderProps) {
  // Wrap children with SWRConfig - no prefetching needed
  return (
    <SWRConfig value={swrConfig}>
      {children}
    </SWRConfig>
  );
}
