'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { trackPageView } from '@/app/(admin)/tracking/trackPageView'

// Halaman yang di-track (sesuai protectedRoutes di middleware)
const TRACKED_PATHS = [
  '/home',
  '/dashboard',
  '/presensi',
  '/laporan',
  '/users/siswa',
  '/users/guru',
  '/users/admin',
  '/organisasi',
  '/kelas',
  '/materi',
  '/tahun-ajaran',
  '/monitoring',
  '/rapot',
  '/kegiatan',
  '/settings',
  '/tracking',
]

/**
 * Client component to track page views on navigation.
 * Uses a ref to prevent double-firing in React Strict Mode.
 */
export default function PageViewTracker() {
  const pathname = usePathname()
  // Mencegah double-fire di React Strict Mode tanpa memicu re-render tambahan
  const lastTrackedRef = useRef<string | null>(null)

  useEffect(() => {
    // Cek apakah pathname ini masuk dalam daftar halaman yang di-track
    const isTracked = TRACKED_PATHS.some(p => pathname.startsWith(p))
    if (!isTracked) return

    // Jika pathname sama dengan yang terakhir di-track, lewati (Strict Mode fix)
    if (lastTrackedRef.current === pathname) return
    
    lastTrackedRef.current = pathname

    // Fire-and-forget: panggil server action tanpa menunggu (await)
    void trackPageView(pathname)
  }, [pathname])

  return null // Komponen ini tidak me-render apapun ke UI
}
