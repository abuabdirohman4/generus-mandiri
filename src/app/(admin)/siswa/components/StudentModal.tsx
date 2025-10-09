'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import Button from '@/components/ui/button/Button'
import Input from '@/components/form/input/InputField'
import Label from '@/components/form/Label'

interface Student {
  id: string
  name: string
  gender: string | null
  class_id: string
  classes: {
    id: string
    name: string
  } | null
}

interface Class {
  id: string
  name: string
}

interface StudentModalProps {
  isOpen: boolean
  onClose: () => void
  mode: 'create' | 'edit'
  student?: Student | null
  userProfile: { role: string; class_id: string | null; class_name: string | null } | null | undefined
  classes: Class[]
  onSubmit: (formData: FormData) => Promise<void>
  submitting: boolean
}

export default function StudentModal({
  isOpen,
  onClose,
  mode,
  student,
  userProfile,
  classes,
  onSubmit,
  submitting
}: StudentModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    gender: '',
    classId: ''
  })

  useEffect(() => {
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
  }, [mode, student, userProfile])

  const handleClose = () => {
    setFormData({
      name: '',
      gender: '',
      classId: ''
    })
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.gender || !formData.classId) {
      return
    }

    const formDataObj = new FormData()
    formDataObj.append('name', formData.name)
    formDataObj.append('gender', formData.gender)
    formDataObj.append('classId', formData.classId)

    await onSubmit(formDataObj)
    handleClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-[600px] m-4">
      <div className="p-6">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
          {mode === 'create' ? 'Tambah' : 'Edit'} Siswa
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
              onClick={handleClose}
              variant="outline"
              className="px-4 py-2"
            >
              Batal
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
