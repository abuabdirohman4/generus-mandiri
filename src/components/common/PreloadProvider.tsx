"use client";

import { SWRConfig } from 'swr';

import { swrConfig } from '@/lib/swr';
import { usePresence } from '@/hooks/usePresence';

interface PreloadProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component that handles SWR configuration
 * SIMPLIFIED: No critical data prefetching needed since dashboard is static
 */
export default function PreloadProvider({ children }: PreloadProviderProps) {
  // Real-time presence tracking
  usePresence();

  // Wrap children with SWRConfig - no prefetching needed
  return (
    <SWRConfig value={swrConfig}>
      {children}
    </SWRConfig>
  );
}
