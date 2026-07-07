'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { AttendanceMap } from '@/hooks/useAttendanceRealtime.logic'
import { getNewlyPresentIds } from '@/hooks/useAttendanceRealtime.logic'
import { getRateStyle } from '@/lib/percentages'
import { toTitleCase } from '@/lib/utils'
import Button from '@/components/ui/button/Button'

interface Student {
  id: string
  name: string
  class_name?: string
}

interface LivePresensiTabProps {
  students: Student[]
  /**
   * Live attendance map — owned and subscribed by the parent (meeting detail
   * page), NOT by this component. Do not subscribe to realtime here: the
   * parent already holds a single `useAttendanceRealtime` channel for this
   * meeting (reused for both this tab and the Daftar Hadir cross-device
   * sync). A second subscription from this component would create a second
   * Supabase channel with the *same* channel name (`attendance-realtime-${meetingId}`),
   * and unmounting this tab (e.g. switching tabs) would tear down the
   * parent's channel too since Supabase treats same-named channels as one.
   */
  attendanceMap: AttendanceMap
  connectionStatus: string
}

const STATUS_LABEL: Record<string, string> = {
  H: 'Hadir',
  I: 'Izin',
  S: 'Sakit',
  A: 'Alfa',
}

const STATUS_DOT: Record<string, string> = {
  H: 'bg-green-500',
  I: 'bg-blue-500',
  S: 'bg-yellow-500',
  A: 'bg-gray-400',
}

/** How long (ms) a just-marked-hadir card keeps its highlight ring. */
const HIGHLIGHT_MS = 3000

/**
 * Read-only "Presentasi" view of meeting attendance. Designed for projection
 * during pengajian: large fonts, a big hadir/total counter, and a name grid
 * that updates in realtime (via useAttendanceRealtime) as teachers mark
 * attendance elsewhere — no manual refresh needed.
 *
 * Supports an in-app fullscreen "Mode Presentasi" overlay (fixed inset-0) that
 * covers the admin chrome (sidebar/header) for a clean projector view.
 */
export default function LivePresensiTab({ students, attendanceMap, connectionStatus }: LivePresensiTabProps) {
  const [isPresentationMode, setIsPresentationMode] = useState(false)

  // Track students who *just* became hadir via realtime, to briefly highlight them.
  const [recentlyMarked, setRecentlyMarked] = useState<Set<string>>(new Set())
  const prevMapRef = useRef<AttendanceMap>(attendanceMap)
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => {
    const newlyPresent = getNewlyPresentIds(prevMapRef.current, attendanceMap)
    prevMapRef.current = attendanceMap
    if (newlyPresent.length === 0) return

    setRecentlyMarked((prev) => {
      const next = new Set(prev)
      newlyPresent.forEach((id) => next.add(id))
      return next
    })

    const timers = timersRef.current
    newlyPresent.forEach((id) => {
      const existing = timers.get(id)
      if (existing) clearTimeout(existing)
      const t = setTimeout(() => {
        setRecentlyMarked((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
        timers.delete(id)
      }, HIGHLIGHT_MS)
      timers.set(id, t)
    })
  }, [attendanceMap])

  // Clear any pending highlight timers on unmount.
  useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.forEach((t) => clearTimeout(t))
      timers.clear()
    }
  }, [])

  // Body-scroll-lock + Escape-to-exit while presentation overlay is open.
  useEffect(() => {
    if (!isPresentationMode) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsPresentationMode(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [isPresentationMode])

  const total = students.length
  const hadirCount = useMemo(
    () => students.filter((s) => attendanceMap[s.id]?.status === 'H').length,
    [students, attendanceMap]
  )
  const percentage = total > 0 ? Math.round((hadirCount / total) * 100) : 0

  const sortedStudents = useMemo(() => {
    // Hadir students first (most relevant during live roll-call), then by name.
    return [...students].sort((a, b) => {
      const aHadir = attendanceMap[a.id]?.status === 'H' ? 0 : 1
      const bHadir = attendanceMap[b.id]?.status === 'H' ? 0 : 1
      if (aHadir !== bHadir) return aHadir - bHadir
      return a.name.localeCompare(b.name)
    })
  }, [students, attendanceMap])

  const big = isPresentationMode

  const content = (
    <div className={big ? 'space-y-8' : 'space-y-6'}>
      {/* Big counter — readable from across a room on a projector */}
      <div className={`rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-center ${big ? 'px-8 py-12' : 'px-6 py-8'}`}>
        <div className={`font-medium text-gray-500 dark:text-gray-400 ${big ? 'text-2xl' : 'text-lg'}`}>Hadir</div>
        <div className={`font-extrabold ${getRateStyle(percentage, 'text')} ${big ? 'text-7xl md:text-8xl' : 'text-6xl sm:text-7xl'}`}>
          {hadirCount} <span className={`text-gray-400 dark:text-gray-500 ${big ? 'text-4xl md:text-5xl' : 'text-3xl sm:text-4xl'}`}>/ {total}</span>
        </div>
        <div className={`mt-2 inline-block rounded-full font-bold ${getRateStyle(percentage, 'bg')} ${getRateStyle(percentage, 'text')} ${big ? 'px-6 py-2 text-2xl' : 'px-4 py-1 text-lg'}`}>
          {percentage}%
        </div>
        {connectionStatus !== 'SUBSCRIBED' && (
          <div className="mt-3 text-sm text-yellow-600 dark:text-yellow-400">
            {connectionStatus === 'DISCONNECTED' ? 'Menghubungkan...' : `Status: ${connectionStatus}`}
          </div>
        )}
      </div>

      {/* Name grid — read-only, large text for projection legibility */}
      <div className={`grid gap-3 ${big ? 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'}`}>
        {sortedStudents.map((student) => {
          const status = attendanceMap[student.id]?.status
          const isHadir = status === 'H'
          const isNew = recentlyMarked.has(student.id)
          return (
            <div
              key={student.id}
              className={`rounded-lg border px-4 py-3 flex items-center gap-3 transition-all ${
                isHadir
                  ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
              } ${isNew ? 'ring-2 ring-green-400 dark:ring-green-500 animate-pulse' : ''}`}
            >
              <span
                className={`w-3 h-3 rounded-full shrink-0 ${status ? STATUS_DOT[status] : 'bg-gray-300 dark:bg-gray-600'}`}
                aria-hidden
              />
              <div className="min-w-0">
                <div className={`font-semibold text-gray-900 dark:text-white truncate ${big ? 'text-lg md:text-xl' : 'text-base sm:text-lg'}`}>
                  {toTitleCase(student.name)}
                </div>
                <div className={`text-gray-500 dark:text-gray-400 ${big ? 'text-sm md:text-base' : 'text-xs sm:text-sm'}`}>
                  {status ? STATUS_LABEL[status] : 'Belum absen'}
                </div>
              </div>
            </div>
          )
        })}
        {sortedStudents.length === 0 && (
          <div className="col-span-full text-center text-gray-400 dark:text-gray-500 py-8">
            Tidak ada siswa untuk pertemuan ini.
          </div>
        )}
      </div>
    </div>
  )

  if (isPresentationMode) {
    return (
      <div className="fixed inset-0 z-99999 overflow-auto bg-white dark:bg-gray-900 p-6 md:p-10">
        <button
          type="button"
          onClick={() => setIsPresentationMode(false)}
          aria-label="Keluar mode presentasi"
          className="fixed top-4 right-4 z-10 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 w-10 h-10 flex items-center justify-center text-xl shadow"
        >
          ✕
        </button>
        {content}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" startIcon={<span aria-hidden>🖥️</span>} onClick={() => setIsPresentationMode(true)}>
          Mode Presentasi
        </Button>
      </div>
      {content}
    </div>
  )
}
