'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/modal'
import Button from '@/components/ui/button/Button'
import Input from '@/components/form/input/InputField'
import Label from '@/components/form/Label'
import InputFilter from '@/components/form/input/InputFilter'
import MultiSelectCheckbox from '@/components/form/input/MultiSelectCheckbox'
import { isAdminLegacy } from '@/lib/userUtils'
import { getStudentClasses, type Student } from '../actions'

interface Class {
  id: string
  name: string
}

interface StudentModalProps {
  isOpen: boolean
  onClose: () => void
  mode: 'create' | 'edit'
  student?: Student | null | undefined
  userProfile: { 
    role: string; 
    classes?: Array<{ id: string; name: string }> 
  } | null | undefined
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
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([])
  const [loadingClasses, setLoadingClasses] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && student) {
        setFormData({
          name: student.name,
          gender: student.gender || '',
          classId: student.class_id || ''
        })
        
        // Fetch current classes for admin in edit mode
        if (isAdminLegacy(userProfile?.role)) {
          setLoadingClasses(true)
          getStudentClasses(student.id)
            .then(classes => {
              setSelectedClassIds(classes.map(c => c.id))
            })
            .catch(err => {
              console.error('Error loading classes:', err)
              // Fallback to single class_id if fetch fails
              if (student.class_id) {
                setSelectedClassIds([student.class_id])
              }
            })
            .finally(() => setLoadingClasses(false))
        }
      } else {
        // Auto-fill class for teachers
        const classId = userProfile?.role === 'teacher' ? userProfile.classes?.[0]?.id || '' : ''
        setFormData({
          name: '',
          gender: '',
          classId: classId
        })
        setSelectedClassIds([])
      }
    }
  }, [mode, student, userProfile, isOpen])

  const handleClose = () => {
    setFormData({
      name: '',
      gender: '',
      classId: ''
    })
    setSelectedClassIds([])
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.gender) {
      return
    }

    // For admin edit mode, use multiple classes
    if (mode === 'edit' && isAdminLegacy(userProfile?.role)) {
      if (selectedClassIds.length === 0) {
        toast.error('Pilih minimal satu kelas')
        return
      }
    } else {
      // For create mode or teacher, use single classId
      if (!formData.classId) {
        return
      }
    }

    const formDataObj = new FormData()
    formDataObj.append('name', formData.name)
    formDataObj.append('gender', formData.gender)
    
    if (mode === 'edit' && isAdminLegacy(userProfile?.role)) {
      formDataObj.append('classIds', selectedClassIds.join(','))
    } else {
      formDataObj.append('classId', formData.classId)
    }

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

          {/* Only show class selection for admins or superadmins */}
          {isAdminLegacy(userProfile?.role) && (
            <div>
              {mode === 'edit' ? (
                <MultiSelectCheckbox
                  label="Kelas"
                  items={classes.map((cls) => ({
                    id: cls.id,
                    label: cls.name,
                  }))}
                  selectedIds={selectedClassIds}
                  onChange={setSelectedClassIds}
                  isLoading={loadingClasses}
                  maxHeight="12rem"
                  hint="Pilih minimal satu kelas"
                />
              ) : (
                <InputFilter
                  id="classId"
                  label="Kelas"
                  value={formData.classId}
                  onChange={(value: string) => setFormData({ ...formData, classId: value })}
                  options={classes.map((cls) => ({
                    value: cls.id,
                    label: cls.name,
                  }))}
                  allOptionLabel="Pilih kelas"
                  widthClassName="!max-w-full"
                />
              )}
            </div>
          )}

          {/* Show class info for teachers */}
          {userProfile?.role === 'teacher' && userProfile.classes?.[0]?.name && (
            <div>
              {/* <Label>Kelas</Label>
              <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-md text-sm text-gray-700 dark:text-gray-300">
                {userProfile.classes[0].name}
              </div> */}
              <InputFilter
                id="classId"
                label="Kelas"
                value={formData.classId}
                onChange={(value: string) => setFormData({ ...formData, classId: value })}
                options={classes
                  .filter((cls) =>
                    userProfile?.classes?.some((teacherClass) => teacherClass.id === cls.id)
                  )
                  .map((cls) => ({
                    value: cls.id,
                    label: cls.name,
                  }))
                }
                widthClassName="!max-w-full"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              onClick={handleClose}
              variant="outline"
              className="px-4 py-2"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="px-4 py-2"
              loading={submitting}
              loadingText="Menyimpan..."
            >
              Simpan
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
