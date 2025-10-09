'use client'

import { useState, useEffect } from 'react'
import { createStudent, updateStudent, deleteStudent, getStudents, getClasses, getCurrentUserRole, getUserProfile, type Student, type Class } from './actions'
import { toast } from 'sonner'
import DataTable from '@/components/table/Table'
import { Modal } from '@/components/ui/modal'
import Button from '@/components/ui/button/Button'
import Input from '@/components/form/input/InputField'
import Label from '@/components/form/Label'
import { PencilIcon, TrashBinIcon } from '@/lib/icons'

export default function SiswaPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<{role: string, class_id: string | null, class_name: string | null} | null>(null)
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    gender: '',
    classId: ''
  })

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
      setUserRole(profileData.role)
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
        // For teachers, use their class
        classId = userProfile.class_id || undefined
      } else if (userProfile?.role === 'admin' && selectedClassFilter) {
        // For admins, use selected filter
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
    
    if (mode === 'edit' && student) {
      setFormData({
        name: student.name,
        gender: student.gender || '',
        classId: student.class_id
      })
    } else {
      // Auto-fill class for teachers
      const classId = userProfile?.role === 'teacher' ? userProfile.class_id || '' : ''
      setFormData({
        name: '',
        gender: '',
        classId: classId
      })
    }
    
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setSelectedStudent(null)
    setFormData({
      name: '',
      gender: '',
      classId: ''
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.gender || !formData.classId) {
      toast.error('Semua field harus diisi')
      return
    }

    try {
      setSubmitting(true)
      const formDataObj = new FormData()
      formDataObj.append('name', formData.name)
      formDataObj.append('gender', formData.gender)
      formDataObj.append('classId', formData.classId)

      if (modalMode === 'create') {
        await createStudent(formDataObj)
        toast.success('Siswa berhasil ditambahkan')
      } else {
        if (selectedStudent) {
          await updateStudent(selectedStudent.id, formDataObj)
          toast.success('Siswa berhasil diupdate')
        }
      }
      
      handleCloseModal()
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

  // Conditional columns based on user role
  const baseColumns = [
    {
      key: 'no',
      label: 'No',
      width: '16',
      align: 'center' as const,
    },
    {
      key: 'name',
      label: 'Nama',
      align: 'left' as const,
    },
    {
      key: 'gender',
      label: 'Jenis Kelamin',
      align: 'center' as const,
    },
  ]

  const classColumn = {
    key: 'class_name',
    label: 'Kelas',
    align: 'center' as const,
  }

  const actionsColumn = {
    key: 'actions',
    label: 'Aksi',
    align: 'center' as const,
    width: '24',
  }

  const columns = userProfile?.role === 'admin' 
    ? [...baseColumns, classColumn, actionsColumn]
    : [...baseColumns, actionsColumn]

  const tableData = students.map((student, index) => ({
    no: index + 1,
    name: student.name,
    gender: student.gender || '-',
    class_name: student.classes.name || '-',
    actions: student.id, // We'll use this in renderCell
  }))

  const renderCell = (column: any, item: any, index: number) => {
    if (column.key === 'actions') {
      return (
        <div className="flex gap-4 justify-center items-center">
          <button
            onClick={() => handleOpenModal('edit', students.find(s => s.id === item.actions))}
            className="text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
            title="Edit"
          >
            <PencilIcon className="w-5 h-5" />
          </button>
          {userRole === 'admin' && (
            <button
              onClick={() => handleDelete(item.actions, students.find(s => s.id === item.actions)?.name || '')}
              className="text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
              title="Hapus"
            >
              <TrashBinIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      )
    }
    return item[column.key] || '-'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
      </div>
    )
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
        {userProfile?.role === 'admin' && (
          <div className="mb-6">
            <div className="max-w-xs">
              <Label htmlFor="classFilter">Filter Kelas</Label>
              <select
                id="classFilter"
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="w-full px-3 py-2 border bg-white border-gray-100 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white appearance-none bg-no-repeat bg-right bg-[length:16px] pr-8"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 8px center'
                }}
              >
                <option value="">Semua Kelas</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="space-y-6 mb-8">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="col-span-2 md:col-span-1 bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        Total Siswa
                      </dt>
                      <dd className="text-lg font-medium text-gray-900 dark:text-white">
                        {students.length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        Laki-laki
                      </dt>
                      <dd className="text-lg font-medium text-gray-900 dark:text-white">
                        {students.filter(s => s.gender === 'Laki-laki').length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-pink-600 dark:text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        Perempuan
                      </dt>
                      <dd className="text-lg font-medium text-gray-900 dark:text-white">
                        {students.filter(s => s.gender === 'Perempuan').length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Students Table */}
        {tableData.length > 0 ? (
          <div className="overflow-x-auto">
            <div className="min-w-full">
              <DataTable
                columns={columns}
                data={tableData}
                renderCell={renderCell}
                className="bg-white dark:bg-gray-800"
                headerClassName="bg-gray-50 dark:bg-gray-700"
                rowClassName="hover:bg-gray-50 dark:hover:bg-gray-700"
              />
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              Tidak ada data siswa
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Belum ada siswa yang terdaftar dalam sistem.
            </p>
          </div>
        )}

        {/* Modal Form */}
        <Modal isOpen={showModal} onClose={handleCloseModal} className="max-w-[600px] m-4">
          <div className="p-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
              {modalMode === 'create' ? 'Tambah' : 'Edit'} Siswa
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nama Lengkap</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Masukkan nama lengkap"
                  required
                />
              </div>

              <div>
                <Label htmlFor="gender">Jenis Kelamin</Label>
                <select
                  id="gender"
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white appearance-none bg-no-repeat bg-right bg-[length:16px] pr-8"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 8px center'
                  }}
                  required
                >
                  <option value="">Pilih jenis kelamin</option>
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
              </div>

              {/* Only show class selection for admins */}
              {userProfile?.role === 'admin' && (
                <div>
                  <Label htmlFor="classId">Kelas</Label>
                  <select
                    id="classId"
                    value={formData.classId}
                    onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white appearance-none bg-no-repeat bg-right bg-[length:16px] pr-8"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 8px center'
                    }}
                    required
                  >
                    <option value="">Pilih kelas</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Show class info for teachers */}
              {userProfile?.role === 'teacher' && userProfile.class_name && (
                <div>
                  <Label>Kelas</Label>
                  <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-md text-sm text-gray-700 dark:text-gray-300">
                    {userProfile.class_name}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan'}
                </Button>
                <Button
                  type="button"
                  onClick={handleCloseModal}
                  variant="outline"
                  className="px-4 py-2"
                >
                  Batal
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      </div>
    </div>
  )
}
