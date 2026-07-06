'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { toast } from 'sonner'
import { useQrScanCooldown, type ScanResult } from '../hooks/useQrScanCooldown'
import { playBeep } from '../utils/playBeep'

interface Student {
  id: string
  name: string
}

interface QrScannerTabProps {
  meetingId: string
  students: Student[]
  onAttendanceChange?: (studentId: string) => void
}

const STATUS_LABEL: Record<ScanResult['status'], string> = {
  marked: 'Hadir',
  already_marked: 'Sudah hadir',
  not_in_meeting: 'Bukan peserta',
  invalid_qr: 'QR tidak valid',
  error: 'Gagal',
}

const QR_ELEMENT_ID = 'qr-reader-presensi'

// html5-qrcode calls the error callback for every frame where no QR code is
// found — this is normal ("not found yet"), not a real error. Only surface
// genuinely unexpected failures to the user.
function isCommonScanError(errorMessage: string): boolean {
  return (
    errorMessage.includes('NotFound') ||
    errorMessage.includes('No barcode') ||
    errorMessage.includes('No QR code') ||
    errorMessage.includes('No MultiFormat Readers')
  )
}

export default function QrScannerTab({ meetingId, students, onAttendanceChange }: QrScannerTabProps) {
  const [history, setHistory] = useState<Array<ScanResult & { studentName?: string; at: number }>>([])
  const [cameraError, setCameraError] = useState<string | null>(null)
  const qrRef = useRef<HTMLDivElement>(null)
  const html5QrInstanceRef = useRef<Html5Qrcode | null>(null)
  const isProcessingRef = useRef(false)
  const isStoppingRef = useRef(false)

  const handleResult = (result: ScanResult) => {
    const studentName = students.find((s) => s.id === result.studentId)?.name

    if (result.status === 'marked') {
      playBeep()
      toast.success(`${studentName || 'Siswa'} — Hadir`)
      if (result.studentId) onAttendanceChange?.(result.studentId)
    } else if (result.status === 'already_marked') {
      playBeep()
      toast.info(`${studentName || 'Siswa'} sudah tercatat hadir`)
    } else if (result.status === 'not_in_meeting') {
      toast.warning(result.message || 'Siswa bukan peserta pertemuan ini')
    } else {
      toast.error(result.message || 'Gagal memproses QR')
    }

    setHistory((prev) => [{ ...result, studentName, at: Date.now() }, ...prev].slice(0, 10))
  }

  const { handleScan } = useQrScanCooldown(meetingId, handleResult)

  useEffect(() => {
    let cancelled = false

    const stopScanner = async () => {
      const instance = html5QrInstanceRef.current
      if (!instance || isStoppingRef.current) return

      isStoppingRef.current = true
      try {
        await instance.stop()
      } catch {
        // Ignore: already stopped
      }
      try {
        instance.clear()
      } catch {
        // Ignore
      }
      html5QrInstanceRef.current = null
      if (qrRef.current) qrRef.current.innerHTML = ''
      isStoppingRef.current = false
    }

    const startScanner = async () => {
      if (html5QrInstanceRef.current) return

      const instance = new Html5Qrcode(QR_ELEMENT_ID)
      html5QrInstanceRef.current = instance

      try {
        await instance.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: 250, aspectRatio: 1.0, disableFlip: false },
          (decodedText) => {
            if (isProcessingRef.current) return
            isProcessingRef.current = true
            void handleScan(decodedText).finally(() => {
              isProcessingRef.current = false
            })
          },
          (errorMessage) => {
            // html5-qrcode calls this for every frame with no detected code - normal, not an error.
            // Avoid console.error entirely (Next.js dev overlay treats it as a crash); use warn for
            // genuinely unexpected messages so scanning is never interrupted by frame-level noise.
            if (!isCommonScanError(errorMessage)) {
              console.warn('[QR Scanner] Unexpected scan error:', errorMessage)
            }
          }
        )
      } catch (e) {
        if (cancelled) return
        console.error('Scanner start error:', e)
        const message = e instanceof Error ? e.message : String(e)
        if (message.includes('Permission denied') || message.includes('NotAllowedError')) {
          setCameraError('Izin kamera ditolak. Silakan berikan izin kamera di pengaturan browser.')
        } else if (message.includes('NotFoundError') || message.includes('No camera')) {
          setCameraError('Kamera tidak ditemukan. Pastikan perangkat memiliki kamera.')
        } else {
          setCameraError('Gagal mengakses kamera. Pastikan izin kamera sudah diberikan.')
        }
      }
    }

    void startScanner()

    return () => {
      cancelled = true
      void stopScanner()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden max-w-md mx-auto p-2">
        {cameraError ? (
          <div className="p-6 text-center text-sm text-red-500 dark:text-red-400">{cameraError}</div>
        ) : (
          <div
            id={QR_ELEMENT_ID}
            ref={qrRef}
            className="aspect-square w-full overflow-hidden rounded-md [&_video]:h-full [&_video]:w-full [&_video]:object-cover"
          />
        )}
      </div>

      {history.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-4 max-w-md mx-auto">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-widest mb-3">
            Baru Discan
          </h3>
          <div className="space-y-2">
            {history.map((item) => (
              <div key={item.at} className="flex items-center justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300">{item.studentName || item.studentId || '-'}</span>
                <span
                  className={
                    item.status === 'marked'
                      ? 'text-green-600 dark:text-green-400'
                      : item.status === 'already_marked'
                        ? 'text-blue-500 dark:text-blue-400'
                        : 'text-red-500 dark:text-red-400'
                  }
                >
                  {STATUS_LABEL[item.status]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
