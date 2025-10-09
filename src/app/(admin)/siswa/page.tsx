'use client'

import { useState, useEffect } from 'react'
import { createStudent, updateStudent, deleteStudent, getStudents, getClasses, getUserProfile, type Student, type Class } from './actions'
import { toast } from 'sonner'
import Button from '@/components/ui/button/Button'
import SiswaSkeleton from '@/components/ui/skeleton/SiswaSkeleton'
import { StatsCards, ClassFilter, StudentModal, StudentsTable } from './components'

export default function SiswaPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [userProfile, setUserProfile] = useState<{role: string, class_id: string | null, class_name: string | null} | null>(null)
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)

  // Load data on component mount
  useEffect(() => {
    loadUserProfile()
  }, [])

  // Load students when user profile or class filter changes
  useEffect(() => {
    if (userProfile) {
      loadStudents()
    }
  }, [userProfile, selectedClassFilter])

  const loadUserProfile = async () => {
    try {
      setLoading(true)
      const [profileData, classesData] = await Promise.all([
        getUserProfile(),
        getClasses()
      ])
      setUserProfile(profileData)
      setClasses(classesData)
    } catch (error) {
      toast.error('Gagal memuat data')
      console.error('Error loading user profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStudents = async () => {
    try {
      let classId: string | undefined
      
      if (userProfile?.role === 'teacher') {
        classId = userProfile.class_id || undefined
      } else if (userProfile?.role === 'admin' && selectedClassFilter) {
        classId = selectedClassFilter
      }
      
      const studentsData = await getStudents(classId)
      setStudents(studentsData)
    } catch (error) {
      toast.error('Gagal memuat data siswa')
      console.error('Error loading students:', error)
    }
  }

  const handleOpenModal = (mode: 'create' | 'edit', student?: Student) => {
    setModalMode(mode)
    setSelectedStudent(student || null)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setSelectedStudent(null)
  }

  const handleSubmit = async (formData: FormData) => {
    try {
      setSubmitting(true)

      if (modalMode === 'create') {
        await createStudent(formData)
        toast.success('Siswa berhasil ditambahkan')
      } else {
        if (selectedStudent) {
          await updateStudent(selectedStudent.id, formData)
          toast.success('Siswa berhasil diupdate')
        }
      }
      
      loadStudents() // Reload students data
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan'
      toast.error(errorMessage)
      console.error('Error submitting form:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (studentId: string, studentName: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus siswa ${studentName}?`)) {
      return
    }

    try {
      await deleteStudent(studentId)
      toast.success('Siswa berhasil dihapus')
      loadStudents() // Reload students data
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan'
      toast.error(errorMessage)
      console.error('Error deleting student:', error)
    }
  }

  if (loading) {
    return <SiswaSkeleton />
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Siswa
                {userProfile?.role === 'teacher' && userProfile.class_name && (
                  <> {userProfile.class_name}</>
                )}
              </h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Kelola data siswa
              </p>
            </div>
            <Button
              onClick={() => handleOpenModal('create')}
              className="px-4 py-2"
            >
              Tambah Siswa
            </Button>
          </div>
        </div>

        {/* Filter Section */}
        <ClassFilter
          userProfile={userProfile}
          classes={classes}
          selectedClassFilter={selectedClassFilter}
          onClassFilterChange={setSelectedClassFilter}
        />

        {/* Stats Cards */}
        <StatsCards students={students} userProfile={userProfile} />

        {/* Students Table */}
        <StudentsTable
          students={students}
          userRole={userProfile?.role || null}
          onEdit={(student) => handleOpenModal('edit', student)}
          onDelete={handleDelete}
          userProfile={userProfile}
        />

        {/* Modal Form */}
        <StudentModal
          isOpen={showModal}
          onClose={handleCloseModal}
          mode={modalMode}
          student={selectedStudent}
          userProfile={userProfile}
          classes={classes}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      </div>
    </div>
  )
}
