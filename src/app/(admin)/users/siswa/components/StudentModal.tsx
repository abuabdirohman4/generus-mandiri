'use client'

import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/modal'
import Button from '@/components/ui/button/Button'
import Input from '@/components/form/input/InputField'
import Label from '@/components/form/Label'
import InputFilter from '@/components/form/input/InputFilter'
import MultiSelectCheckbox from '@/components/form/input/MultiSelectCheckbox'
import DataFilter from '@/components/shared/DataFilter'
import {
  isAdminLegacy,
  isAdminKelompok,
  isTeacherKelompok,
  modalShouldShowDesaFilter,
  modalShouldShowKelompokFilter,
  shouldShowDaerahFilter,
  getAutoFilledOrgValues
} from '@/lib/userUtils'
import { getStudentClasses, type Student } from '../actions'
import type { UserProfile } from '@/types/user'
import type { Class } from '@/types/class'
import type { DaerahBase, DesaBase, KelompokBase } from '@/types/organization'

// Extend KelompokBase with optional display names for UI
interface KelompokWithNames extends KelompokBase {
  desa_name?: string
  daerah_name?: string
}

interface StudentModalProps {
  isOpen: boolean
  onClose: () => void
  mode: 'create' | 'edit'
  student?: Student | null | undefined
  userProfile: UserProfile | null | undefined
  classes: Class[]
  daerah?: DaerahBase[]
  desa?: DesaBase[]
  kelompok?: KelompokWithNames[]
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
  daerah = [],
  desa = [],
  kelompok = [],
  onSubmit,
  submitting
}: StudentModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    gender: '',
    classId: '',
    kelompokId: ''
  })
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([])
  const [loadingClasses, setLoadingClasses] = useState(false)

  // State for DataFilter
  const [filters, setFilters] = useState({
    daerah: [] as string[],
    desa: [] as string[],
    kelompok: [] as string[],
    kelas: [] as string[]
  })

  // Initialize filters and formData when modal opens
  useEffect(() => {
    if (!isOpen) return

    const autoFilled = userProfile ? getAutoFilledOrgValues(userProfile) : {}
    const base = {
      daerah: autoFilled.daerah_id ? [autoFilled.daerah_id] : [],
      desa: autoFilled.desa_id ? [autoFilled.desa_id] : [],
      kelompok: autoFilled.kelompok_id ? [autoFilled.kelompok_id] : [],
      kelas: [] as string[]
    }

    if (mode === 'edit' && student) {
      setFormData({
        name: student.name,
        gender: student.gender || '',
        classId: student.class_id || '',
        kelompokId: student.kelompok_id || ''
      })

      // Set filters from student data, falling back to auto-filled values
      setFilters({
        daerah: student.daerah_id ? [student.daerah_id] : base.daerah,
        desa: student.desa_id ? [student.desa_id] : base.desa,
        kelompok: student.kelompok_id ? [student.kelompok_id] : base.kelompok,
        kelas: [] as string[]
      })

      // Fetch current classes for admin in edit mode
      if (isAdminLegacy(userProfile?.role)) {
        setLoadingClasses(true)
        getStudentClasses(student.id)
          .then(classes => {
            setSelectedClassIds(classes.map(c => c.id))
            // Sync selectedClassIds to filters.kelas
            setFilters(prev => ({
              ...prev,
              kelas: classes.map(c => c.id)
            }))
          })
          .catch(err => {
            console.error('Error loading classes:', err)
            // Fallback to single class_id if fetch fails
            if (student.class_id) {
              setSelectedClassIds([student.class_id])
              setFilters(prev => ({
                ...prev,
                kelas: [student.class_id].filter(Boolean) as string[]
              }))
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
        classId: classId,
        kelompokId: ''
      })
      setSelectedClassIds([])
      setFilters(base)
    }
  }, [mode, student, userProfile, isOpen])

  const handleClose = () => {
    setFormData({
      name: '',
      gender: '',
      classId: '',
      kelompokId: ''
    })
    setSelectedClassIds([])
    setFilters({
      daerah: [],
      desa: [],
      kelompok: [],
      kelas: []
    })
    onClose()
  }

  // Sync filters.kelompok[0] → formData.kelompokId
  useEffect(() => {
    if (filters.kelompok.length > 0) {
      setFormData(prev => ({ ...prev, kelompokId: filters.kelompok[0] }))
    } else {
      setFormData(prev => ({ ...prev, kelompokId: '' }))
    }
  }, [filters.kelompok])

  // Sync selectedClassIds → filters.kelas (edit mode)
  useEffect(() => {
    if (mode === 'edit' && isAdminLegacy(userProfile?.role)) {
      // Only update if different to prevent circular updates
      setFilters(prev => {
        const currentKelas = prev.kelas
        const newKelas = selectedClassIds
        // Check if arrays are different
        if (currentKelas.length !== newKelas.length || 
            !currentKelas.every((id, idx) => id === newKelas[idx])) {
          return { ...prev, kelas: newKelas }
        }
        return prev
      })
    }
  }, [selectedClassIds, mode, userProfile?.role])

  // Sync formData.classId → filters.kelas (create mode)
  useEffect(() => {
    if (mode !== 'edit' || !isAdminLegacy(userProfile?.role)) {
      if (formData.classId) {
        setFilters(prev => ({ ...prev, kelas: [formData.classId] }))
      } else {
        setFilters(prev => ({ ...prev, kelas: [] }))
      }
    }
  }, [formData.classId, mode, userProfile?.role])

  // Handler for DataFilter changes
  const handleFilterChange = (newFilters: {
    daerah: string[]
    desa: string[]
    kelompok: string[]
    kelas: string[]
  }) => {
    const kelompokChanged = filters.kelompok.length > 0 && 
      (newFilters.kelompok.length === 0 || newFilters.kelompok[0] !== filters.kelompok[0])
    
    setFilters(newFilters)
    
    // Reset kelas selection when kelompok changes (DataFilter already resets filters.kelas)
    if (kelompokChanged) {
      setFormData(prev => ({ ...prev, classId: '' }))
      setSelectedClassIds([])
    }
  }

  // Get filtered classes based on selected kelompok (for MultiSelectCheckbox and InputFilter)
  const filteredClasses = useMemo(() => {
    if (filters.kelompok.length > 0) {
      return classes.filter(cls => cls.kelompok_id === filters.kelompok[0])
    }
    if (userProfile && isAdminKelompok(userProfile)) return classes  // server-side scoped
    if (userProfile && isTeacherKelompok(userProfile)) {
      return classes.filter(cls => userProfile.classes?.some(tc => tc.id === cls.id))
    }
    return classes
  }, [classes, filters.kelompok, userProfile])

  // Filter selectedClassIds to only include classes from selected kelompok (in edit mode)
  useEffect(() => {
    if (filters.kelompok.length > 0 && mode === 'edit' && selectedClassIds.length > 0) {
      const validClassIds = filteredClasses.map(cls => cls.id)
      const filteredSelectedIds = selectedClassIds.filter(id => validClassIds.includes(id))
      if (filteredSelectedIds.length !== selectedClassIds.length) {
        setSelectedClassIds(filteredSelectedIds)
      }
    }
  }, [filters.kelompok, filteredClasses, mode, selectedClassIds])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.gender) {
      return
    }

    // Validate kelompok when it should be shown (not for admin/teacher kelompok)
    if (
      userProfile &&
      !isAdminKelompok(userProfile) &&
      !isTeacherKelompok(userProfile) &&
      modalShouldShowKelompokFilter(userProfile) &&
      !formData.kelompokId
    ) {
      toast.error('Pilih kelompok')
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
    
    // Add kelompok_id whenever available
    if (formData.kelompokId) {
      formDataObj.append('kelompok_id', formData.kelompokId)
    }
    
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
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white appearance-none bg-no-repeat bg-right bg-size-[16px] pr-8"
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

          {/* Cascading org selector for all roles that need it */}
          {userProfile && !isAdminKelompok(userProfile) && !isTeacherKelompok(userProfile) && (
            <DataFilter
              filters={filters}
              onFilterChange={handleFilterChange}
              userProfile={userProfile}
              daerahList={daerah}
              desaList={desa}
              kelompokList={kelompok}
              classList={classes}
              showDaerah={shouldShowDaerahFilter(userProfile)}
              showDesa={modalShouldShowDesaFilter(userProfile)}
              showKelompok={modalShouldShowKelompokFilter(userProfile)}
              showKelas={false}
              variant="modal"
              compact={true}
              hideAllOption={true}
              cascadeFilters={true}
              requiredFields={{ kelompok: modalShouldShowKelompokFilter(userProfile) }}
            />
          )}

          {/* Only show class selection for admins or superadmins */}
          {isAdminLegacy(userProfile?.role) && (
            <div>
              {mode === 'edit' ? (
                <MultiSelectCheckbox
                  label="Kelas"
                  items={filteredClasses.map((cls) => ({
                    id: cls.id,
                    label: cls.name,
                  }))}
                  selectedIds={selectedClassIds}
                  onChange={(ids) => {
                    setSelectedClassIds(ids)
                    // Sync to filters.kelas
                    setFilters(prev => ({ ...prev, kelas: ids }))
                  }}
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
                  options={filteredClasses.map((cls) => ({
                    value: cls.id,
                    label: cls.name,
                  }))}
                  allOptionLabel="Pilih kelas"
                  widthClassName="!max-w-full"
                  disabled={!!userProfile && modalShouldShowKelompokFilter(userProfile) && filters.kelompok.length === 0}
                />
              )}
            </div>
          )}

          {/* Show class selector for teachers */}
          {userProfile?.role === 'teacher' && (
            <div>
              <InputFilter
                id="classId"
                label="Kelas"
                value={formData.classId}
                onChange={(value: string) => setFormData({ ...formData, classId: value })}
                options={filteredClasses.map((cls) => ({
                  value: cls.id,
                  label: cls.name,
                }))}
                widthClassName="!max-w-full"
                disabled={!!userProfile && modalShouldShowKelompokFilter(userProfile) && filters.kelompok.length === 0}
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

