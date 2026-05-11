// src/app/(admin)/users/siswa/[studentId]/biodata/page.tsx
'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import useSWR, { mutate } from 'swr'
import { getStudentBiodata } from '../../actions'
import { StudentProfileView } from '../../components/StudentProfileView'
import { StudentBiodataModal } from '../../components/StudentBiodataModal'
import Button from '@/components/ui/button/Button'

export default function StudentBiodataPage() {
  const params = useParams()
  const router = useRouter()
  const studentId = params.studentId as string
  const [isModalOpen, setIsModalOpen] = useState(false)

  const SWR_KEY = `student-biodata-${studentId}`

  const { data: result, isLoading } = useSWR(
    SWR_KEY,
    () => getStudentBiodata(studentId),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  )

  const student = result?.success ? result.data ?? null : null
  const error = result?.success === false ? (result.error ?? 'Failed to load student data') : null

  const handleEditSuccess = () => {
    mutate(SWR_KEY) // Reload data after successful edit
  }

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-xl" />
        <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-xl" />
        <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-xl" />
      </div>
    )
  }

  if (error || !student) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-12 shadow-sm text-center">
        <div className="mb-4 text-red-500">
          <svg
            className="mx-auto h-16 w-16"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
          Siswa tidak ditemukan
        </h3>
        <p className="mb-4 text-gray-500 dark:text-gray-400">
          {error || 'Siswa yang Anda cari tidak ditemukan'}
        </p>
        <Button
          onClick={() => router.push('/users/siswa')}
          variant="outline"
          className="px-4 py-2"
        >
          Kembali
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 mx-auto px-0 pb-28 md:pb-0">
      {/* Student Profile View */}
      <StudentProfileView student={student} onEdit={() => setIsModalOpen(true)} />

      {/* Edit Modal */}
      {isModalOpen && (
        <StudentBiodataModal
          student={student}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  )
}
