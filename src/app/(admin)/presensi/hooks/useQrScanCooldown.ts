'use client'

import { useCallback, useRef, useState } from 'react'
import { parseStudentQrPayload } from '@/lib/qr/qrPayload'
import { markAttendanceByQrScan } from '../actions'

type ScanStatus = 'marked' | 'already_marked' | 'not_in_meeting' | 'invalid_qr' | 'error'

export interface ScanResult {
  status: ScanStatus
  studentId?: string
  message?: string
}

const COOLDOWN_MS = 2000

/**
 * Debounces repeated decodes of the same QR payload (camera keeps decoding the
 * same frame for a moment) and calls markAttendanceByQrScan on genuinely new scans.
 */
export function useQrScanCooldown(meetingId: string, onResult?: (result: ScanResult) => void) {
  const [lastResult, setLastResult] = useState<ScanResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const lastPayloadRef = useRef<string | null>(null)
  const lastScanTimeRef = useRef(0)

  const handleScan = useCallback(
    async (rawValue: string) => {
      const now = Date.now()
      if (rawValue === lastPayloadRef.current && now - lastScanTimeRef.current < COOLDOWN_MS) {
        return
      }
      lastPayloadRef.current = rawValue
      lastScanTimeRef.current = now

      const parsed = parseStudentQrPayload(rawValue)
      if (!parsed) {
        const result: ScanResult = { status: 'invalid_qr', message: 'QR bukan kartu siswa yang valid' }
        setLastResult(result)
        onResult?.(result)
        return
      }

      setIsProcessing(true)
      try {
        const response = await markAttendanceByQrScan(meetingId, parsed.studentId)
        const result: ScanResult = {
          status: response.status,
          studentId: parsed.studentId,
          message: response.message,
        }
        setLastResult(result)
        onResult?.(result)
      } finally {
        setIsProcessing(false)
      }
    },
    [meetingId, onResult]
  )

  return { handleScan, lastResult, isProcessing }
}
