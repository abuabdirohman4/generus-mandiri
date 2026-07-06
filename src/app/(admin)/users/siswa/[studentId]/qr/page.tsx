// src/app/(admin)/users/siswa/[studentId]/qr/page.tsx
'use client'

import { useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import useSWR from 'swr'
import { QRCodeCanvas } from 'qrcode.react'
import { getStudentBiodata } from '../../actions'
import { buildStudentQrPayload } from '@/lib/qr/qrPayload'
import Button from '@/components/ui/button/Button'

export default function StudentQrPage() {
  const params = useParams()
  const router = useRouter()
  const studentId = params.studentId as string
  const qrWrapperRef = useRef<HTMLDivElement>(null)

  const SWR_KEY = `student-biodata-${studentId}`

  const { data: result, isLoading } = useSWR(SWR_KEY, () => getStudentBiodata(studentId), {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  })

  const student = result?.success ? (result.data ?? null) : null
  const error = result?.success === false ? (result.error ?? 'Failed to load student data') : null

  const handleDownload = () => {
    const canvas = qrWrapperRef.current?.querySelector('canvas')
    if (!canvas) return
    const url = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.href = url
    link.download = `${(student?.name || 'siswa').replace(/\s+/g, '_')}_qr-code.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-96 bg-gray-100 dark:bg-gray-800 rounded-xl" />
      </div>
    )
  }

  if (error || !student) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-12 shadow-sm text-center">
        <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">Siswa tidak ditemukan</h3>
        <p className="mb-4 text-gray-500 dark:text-gray-400">{error || 'Siswa yang Anda cari tidak ditemukan'}</p>
        <Button onClick={() => router.push('/users/siswa')} variant="outline" className="px-4 py-2">
          Kembali
        </Button>
      </div>
    )
  }

  const qrPayload = buildStudentQrPayload(student.id)

  return (
    <div className="space-y-6 mx-auto px-0 pb-28 md:pb-0 max-w-md">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 sm:p-8">
        <div className="flex justify-center mb-5">
          <div
            ref={qrWrapperRef}
            className="p-3 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700"
          >
            <QRCodeCanvas value={qrPayload} size={240} />
          </div>
        </div>

        <div className="flex flex-col gap-2 text-center mb-6">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Nama Lengkap</p>
            <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">{student.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Kelompok</p>
            <p className="text-lg font-medium text-brand-600 dark:text-brand-300">
              {student.kelompok?.name || 'Belum ada kelompok'}
            </p>
          </div>
        </div>

        <Button onClick={handleDownload} className="w-full">
          Download QR (PNG)
        </Button>
      </div>

      <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
        <p className="text-sm text-blue-700 dark:text-blue-200 text-center">
          <strong>Petunjuk:</strong> Tunjukkan QR Code ini ke admin/guru untuk melakukan presensi.
        </p>
      </div>
    </div>
  )
}
