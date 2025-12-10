// src/app/(admin)/users/siswa/[studentId]/biodata/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getStudentBiodata } from '../../actions'
import { StudentProfileView } from '../../components/StudentProfileView'
import { StudentBiodataModal } from '../../components/StudentBiodataModal'
import { StudentBiodata } from '../../types'
import Button from '@/components/ui/button/Button'

export default function StudentBiodataPage() {
  const params = useParams()
  const router = useRouter()
  const studentId = params.studentId as string

  const [student, setStudent] = useState<StudentBiodata | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const loadStudent = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await getStudentBiodata(studentId)
      if (result.success && result.data) {
        setStudent(result.data)
      } else {
        setError(result.error || 'Failed to load student data')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadStudent()
  }, [studentId])

  const handleEditSuccess = () => {
    loadStudent() // Reload data after successful edit
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="space-y-6">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-48 animate-pulse rounded-lg bg-gray-200"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !student) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto px-4 pb-28 md:pb-0 md:px-6 lg:px-8">
          <div className="text-center">
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
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto px-4 pb-28 md:pb-0 md:px-6 lg:px-8">

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
    </div>
  )
}
