'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
/**
 * Global error boundary.
 *
 * Self-hosted (non-Vercel) tidak punya "skew protection": saat deploy baru,
 * ID Server Action & hash chunk berubah. Client yang masih jalan build lama
 * akan kena "Failed to find Server Action" atau ChunkLoadError sampai reload.
 *
 * Boundary ini deteksi error skew-deploy itu lalu auto-reload SEKALI (build baru
 * ke-load, error hilang tanpa aksi user). Guard sessionStorage cegah loop reload.
 */

const SKEW_PATTERNS = [
  'Failed to find Server Action',
  'older or newer deployment',
  'ChunkLoadError',
  'Loading chunk',
  'Loading CSS chunk',
];

const RELOAD_GUARD_KEY = 'skew-reload-at';
const RELOAD_GUARD_WINDOW_MS = 15_000;

function isSkewError(error: Error & { digest?: string }): boolean {
  const haystack = `${error?.message || ''} ${error?.name || ''} ${error?.digest || ''}`;
  return SKEW_PATTERNS.some((p) => haystack.includes(p));
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (!isSkewError(error)) {
      Sentry.captureException(error);
      return;
    }

    // Cegah loop: kalau baru saja reload karena skew, jangan reload lagi.
    const last = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) || 0);
    if (Date.now() - last < RELOAD_GUARD_WINDOW_MS) return;

    sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
    window.location.reload();
  }, [error]);

  const skew = isSkewError(error);

  return (
    <html lang="id">
      <body
        style={{
          display: 'flex',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          fontFamily: 'system-ui, sans-serif',
          padding: '24px',
          textAlign: 'center',
          color: '#374151',
        }}
      >
        <h1 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>
          {skew ? 'Memperbarui aplikasi…' : 'Terjadi kesalahan'}
        </h1>
        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px' }}>
          {skew
            ? 'Versi baru terdeteksi, memuat ulang otomatis.'
            : 'Maaf, ada masalah saat memuat halaman.'}
        </p>
        <button
          onClick={() => (skew ? window.location.reload() : reset())}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            background: '#4f46e5',
            color: '#fff',
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          Muat ulang
        </button>
      </body>
    </html>
  );
}
