'use client'

import { useState, useMemo, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import Button from '@/components/ui/button/Button'
import InputFilter from '@/components/form/input/InputFilter'
import Input from '@/components/form/input/InputField'
import Label from '@/components/form/Label'
import { toast } from 'sonner'
import { useAssignStudentsStore } from '../stores/assignStudentsStore'
import { useClasses } from '@/hooks/useClasses'
import { useStudents } from '@/hooks/useStudents'
import { useClassMasters } from '@/hooks/useClassMasters'
import { assignStudentsToClass } from '../actions'
import { useUserProfile } from '@/stores/userProfileStore'
import {
  isAdminKelompok,
  isTeacherKelompok,
  shouldShowDaerahFilter,
  modalShouldShowDesaFilter,
  modalShouldShowKelompokFilter,
  getAutoFilledOrgValues,
} from '@/lib/userUtils'
import { canBulkAssignCrossKelompok } from '@/lib/accessControl'
import DataFilter, { type DataFilters } from '@/components/shared/DataFilter'
import { useDaerah } from '@/hooks/useDaerah'
import { useDesa } from '@/hooks/useDesa'
import { useKelompok } from '@/hooks/useKelompok'

interface AssignStudentsModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function AssignStudentsModal({ 
  isOpen, 
  onClose, 
  onSuccess 
}: AssignStudentsModalProps) {
  const {
    selectedClassId,
    selectedStudentIds,
    searchQuery,
    filterClassId,
    closeModal,
    setSelectedClassId,
    toggleStudent,
    selectAll,
    clearSelection,
    setSearchQuery,
    setFilterClassId
  } = useAssignStudentsStore()

  const { classes, isLoading: classesLoading } = useClasses()
  const { students, isLoading: studentsLoading } = useStudents({ enabled: isOpen })
  const { masters, isLoading: mastersLoading } = useClassMasters()
  const [isAssigning, setIsAssigning] = useState(false)
  const [studentsWithClasses, setStudentsWithClasses] = useState<Map<string, string[]>>(new Map())
  const { profile } = useUserProfile()

  const { daerah } = useDaerah()
  const { desa } = useDesa()
  const { kelompok } = useKelompok()

  const autoFilled = profile ? getAutoFilledOrgValues(profile) : {}
  const [orgFilters, setOrgFilters] = useState<DataFilters>({
    daerah: autoFilled.daerah_id ? [autoFilled.daerah_id] : [],
    desa: autoFilled.desa_id ? [autoFilled.desa_id] : [],
    kelompok: autoFilled.kelompok_id ? [autoFilled.kelompok_id] : [],
    kelas: [] as string[]
  })
  const [studentOrgFilters, setStudentOrgFilters] = useState<DataFilters>({
    daerah: autoFilled.daerah_id ? [autoFilled.daerah_id] : [],
    desa: autoFilled.desa_id ? [autoFilled.desa_id] : [],
    kelompok: autoFilled.kelompok_id ? [autoFilled.kelompok_id] : [],
    kelas: [] as string[]
  })

  const needsKelompok = !!profile && modalShouldShowKelompokFilter(profile) && !isAdminKelompok(profile) && !isTeacherKelompok(profile)
  const canBulkAssign = canBulkAssignCrossKelompok(profile)
  const kelompokReady = canBulkAssign || !needsKelompok || orgFilters.kelompok.length > 0
  const [selectedMasterId, setSelectedMasterId] = useState<string>('')
  const [customClassName, setCustomClassName] = useState('')

  // Load students' classes when class is selected - use existing classes from student data
  useEffect(() => {
    if (selectedClassId && students && students.length > 0) {
      const classMap = new Map<string, string[]>()
      students.forEach(student => {
        const classIds = (student.classes || []).map(c => c.id)
        classMap.set(student.id, classIds)
      })
      setStudentsWithClasses(classMap)
    }
  }, [selectedClassId, students])

  // Compute classes filtered by selected kelompok (for destination class selector)
  const kelompokFilteredClasses = useMemo(() => {
    if (orgFilters.kelompok.length > 0) {
      return classes.filter(cls => cls.kelompok_id === orgFilters.kelompok[0])
    }
    if (profile && isAdminKelompok(profile)) {
      return classes.filter(cls => cls.kelompok_id === profile.kelompok_id)
    }
    return classes
  }, [classes, orgFilters.kelompok, profile])

  // Reset selectedClassId when kelompok changes and the selected class is no longer valid
  useEffect(() => {
    if (selectedClassId && orgFilters.kelompok.length > 0) {
      const isValid = kelompokFilteredClasses.some(cls => cls.id === selectedClassId)
      if (!isValid) setSelectedClassId('')
    }
  }, [orgFilters.kelompok, kelompokFilteredClasses, selectedClassId, setSelectedClassId])

  // Filter students based on search query, class filter, and org filters
  const filteredStudents = useMemo(() => {
    let filtered = students || []
    
    // Apply org filters (daerah, desa, kelompok)
    if (studentOrgFilters.daerah.length > 0) {
      filtered = filtered.filter(student => studentOrgFilters.daerah.includes(student.daerah_id!))
    }
    if (studentOrgFilters.desa.length > 0) {
      filtered = filtered.filter(student => studentOrgFilters.desa.includes(student.desa_id!))
    }
    if (studentOrgFilters.kelompok.length > 0) {
      filtered = filtered.filter(student => studentOrgFilters.kelompok.includes(student.kelompok_id!))
    }

    // Apply search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(student => 
        student.name.toLowerCase().includes(query) ||
        student.classes?.some(c => c.name.toLowerCase().includes(query))
      )
    }
    
    // Apply class filter (filter by kelas siswa saat ini)
    if (filterClassId) {
      filtered = filtered.filter(student => {
        const studentClassIds = (student.classes || []).map(c => c.id)
        return studentClassIds.includes(filterClassId)
      })
    }
    
    return filtered
  }, [students, searchQuery, filterClassId, studentOrgFilters])

  // Filter out students already in selected class
  const availableStudents = useMemo(() => {
    if (!selectedClassId) return filteredStudents
    return filteredStudents.filter(student => {
      const studentClassIds = studentsWithClasses.get(student.id) || []
      return !studentClassIds.includes(selectedClassId)
    })
  }, [filteredStudents, selectedClassId, studentsWithClasses])

  // Get unique "Lainnya" class names available in the user's scope
  const lainnyaClassNames = useMemo(() => {
    if (!classes) return []
    const names = new Set<string>()
    classes.forEach(c => {
      const hasLainnyaMaster = c.class_master_mappings?.some(
        m => m.class_master?.name === 'Lainnya'
      )
      if (hasLainnyaMaster) {
        names.add(c.name)
      }
    })
    return Array.from(names).sort()
  }, [classes])

  const handleAssign = async () => {
    if (canBulkAssign) {
      if (!selectedMasterId) {
        toast.error('Pilih keluarga kelas tujuan')
        return
      }
      const selectedMaster = masters.find(m => m.id === selectedMasterId)
      if (selectedMaster?.name === 'Lainnya' && !customClassName.trim()) {
        toast.error('Masukkan nama kelas tujuan')
        return
      }
    } else {
      if (!selectedClassId) {
        toast.error('Pilih kelas terlebih dahulu')
        return
      }
    }

    if (selectedStudentIds.length === 0) {
      toast.error('Pilih minimal satu siswa')
      return
    }

    setIsAssigning(true)

    try {
      let result
      if (canBulkAssign) {
        const { assignStudentsToClassGroup } = await import('../actions')
        const selectedMaster = masters.find(m => m.id === selectedMasterId)
        const isLainnya = selectedMaster?.name === 'Lainnya'
        result = await assignStudentsToClassGroup(
          selectedStudentIds,
          isLainnya ? 'Lainnya' : selectedMasterId,
          isLainnya ? customClassName.trim() : undefined
        )
      } else {
        result = await assignStudentsToClass(selectedStudentIds, selectedClassId)
      }
      
      if (result.success && result.data) {
        if (result.data.skipped && result.data.skipped.length > 0) {
          const alreadyExistsCount = result.data.skipped.filter((s: any) => s.reason.includes('Sudah berada di kelas ini')).length
          const missingClassCount = result.data.skipped.filter((s: any) => s.reason.includes('tidak ditemukan')).length
          const otherCount = result.data.skipped.length - alreadyExistsCount - missingClassCount

          let messages = result.data.assigned > 0
            ? [`${result.data.assigned} siswa berhasil diassign.`]
            : ['Gagal melakukan assign.']
          if (alreadyExistsCount > 0) messages.push(`${alreadyExistsCount} siswa sudah ada di kelas ini.`)
          if (missingClassCount > 0) messages.push(`${missingClassCount} siswa dilewati karena kelas tujuan belum dibuat di kelompoknya.`)
          if (otherCount > 0) messages.push(`${otherCount} siswa gagal diproses.`)

          toast.warning(messages.join(' '))
        } else {
          toast.success(`${result.data.assigned} siswa berhasil diassign ke kelas`)
        }
        if (result.data.assigned > 0) {
          closeModal()
          // Trigger refresh dengan delay untuk memastikan data sudah diupdate
          setTimeout(() => {
            onSuccess?.()
          }, 500)
        }
      } else {
        toast.error(result.message || 'Terjadi kesalahan')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan'
      toast.error(errorMessage)
      console.error('Assign error:', error)
    } finally {
      setIsAssigning(false)
    }
  }

  const handleClose = () => {
    if (isAssigning) return
    closeModal()
    const autoFilledOnClose = profile ? getAutoFilledOrgValues(profile) : {}
    setOrgFilters({
      daerah: autoFilledOnClose.daerah_id ? [autoFilledOnClose.daerah_id] : [],
      desa: autoFilledOnClose.desa_id ? [autoFilledOnClose.desa_id] : [],
      kelompok: autoFilledOnClose.kelompok_id ? [autoFilledOnClose.kelompok_id] : [],
      kelas: [] as string[]
    })
    setStudentOrgFilters({
      daerah: autoFilledOnClose.daerah_id ? [autoFilledOnClose.daerah_id] : [],
      desa: autoFilledOnClose.desa_id ? [autoFilledOnClose.desa_id] : [],
      kelompok: autoFilledOnClose.kelompok_id ? [autoFilledOnClose.kelompok_id] : [],
      kelas: [] as string[]
    })
    setSelectedMasterId('')
    setCustomClassName('')
    onClose()
  }

  const selectedClass = classes.find(c => c.id === selectedClassId)
  const allFilteredSelected = availableStudents.length > 0 && 
    availableStudents.every(s => selectedStudentIds.includes(s.id))

  if (classesLoading || studentsLoading || (canBulkAssign && mastersLoading)) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} className="max-w-4xl m-4">
        <div className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-4xl m-4">
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
        Assign Siswa ke Kelas
      </h2>

      <div className="space-y-6">
        {/* Step 1: Pilih Kelas (with org selector for non-kelompok roles) */}
        <div>
          {canBulkAssign ? (
            <div className="mt-6">
              <InputFilter
                id="classMasterId"
                label="Pilih Kelas Tujuan"
                value={selectedMasterId}
                onChange={setSelectedMasterId}
                options={masters.map((m) => ({
                  value: m.id,
                  label: m.name,
                }))}
                allOptionLabel="Pilih kelas"
                widthClassName="!max-w-full"
                variant="modal"
              />
              
              {masters.find(m => m.id === selectedMasterId)?.name === 'Lainnya' && (
                <div className="mt-4">
                  <InputFilter
                    id="customClassName"
                    label="Pilih Kelas Lainnya"
                    value={customClassName}
                    onChange={setCustomClassName}
                    options={lainnyaClassNames.map(name => ({
                      value: name,
                      label: name,
                    }))}
                    allOptionLabel="Pilih Kelas Lainnya"
                    widthClassName="!max-w-full"
                    variant="modal"
                  />
                  {lainnyaClassNames.length === 0 && (
                    <p className="text-sm text-amber-600 dark:text-amber-400 mt-2 font-medium">
                      Belum ada kelas custom (Lainnya) yang tersedia di wilayah Anda. Buat kelas di menu Kelas terlebih dahulu.
                    </p>
                  )}
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    Siswa yang dipilih akan dimasukkan ke kelas ini di kelompok masing-masing. Jika kelas tidak ditemukan di kelompok siswa, siswa tersebut akan dilewati (skip).
                  </p>
                </div>
              )}
            </div>
          ) : (
            <>
              {profile && !isAdminKelompok(profile) && !isTeacherKelompok(profile) && (
                <DataFilter
                  filters={orgFilters}
                  onFilterChange={setOrgFilters}
                  userProfile={profile}
                  daerahList={daerah}
                  desaList={desa}
                  kelompokList={kelompok}
                  classList={classes}
                  showDaerah={shouldShowDaerahFilter(profile)}
                  showDesa={modalShouldShowDesaFilter(profile)}
                  showKelompok={modalShouldShowKelompokFilter(profile)}
                  showKelas={false}
                  variant="modal"
                  compact={true}
                  cascadeFilters={true}
                />
              )}
              <InputFilter
                id="classId"
                label="Pilih Kelas Tujuan"
                value={selectedClassId}
                onChange={setSelectedClassId}
                options={kelompokFilteredClasses.map((cls) => ({
                  value: cls.id,
                  label: orgFilters.kelompok.length > 0
                    ? cls.name
                    : `${cls.name}${cls.kelompok?.name ? ` - ${cls.kelompok.name}` : ''}`,
                }))}
                allOptionLabel="Pilih kelas"
                widthClassName="!max-w-full"
                className='mt-6'
                variant="modal"
              />
              {selectedClass && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Siswa yang sudah ada di kelas <strong>{selectedClass.name}</strong> tidak akan ditampilkan
                </p>
              )}
            </>
          )}
        </div>

        {/* Step 2: Pilih Siswa dengan Search */}
        {(selectedClassId || canBulkAssign) && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <Label>Pilih Siswa</Label>
              {availableStudents.length > 0 && (
                <Button
                  onClick={() => {
                    const allIds = availableStudents.map(s => s.id)
                    selectAll(allIds)
                  }}
                  variant="outline"
                  size="sm"
                >
                  {allFilteredSelected ? 'Batal Pilih Semua' : 'Pilih Semua'}
                </Button>
              )}
            </div>

            {/* Student Org Filters for non-kelompok roles */}
            {profile && !isAdminKelompok(profile) && !isTeacherKelompok(profile) && (
              <div className="mb-4">
                <DataFilter
                  filters={studentOrgFilters}
                  onFilterChange={setStudentOrgFilters}
                  userProfile={profile}
                  daerahList={daerah}
                  desaList={desa}
                  kelompokList={kelompok}
                  showDaerah={shouldShowDaerahFilter(profile)}
                  showDesa={modalShouldShowDesaFilter(profile)}
                  showKelompok={modalShouldShowKelompokFilter(profile)}
                  showKelas={false}
                  variant="modal"
                  compact={true}
                  cascadeFilters={true} classList={[]}                />
              </div>
            )}

            {/* Search Input */}
            <div className="mb-4">
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari siswa berdasarkan nama atau kelas..."
                className="w-full"
              />
            </div>

            {/* Filter by Kelas */}
            <div className="mb-4">
              <InputFilter
                id="filterClassId"
                label="Filter by Kelas"
                value={filterClassId}
                onChange={setFilterClassId}
                options={classes.map((cls) => ({
                  value: cls.id,
                  label: cls.name,
                }))}
                allOptionLabel="Semua Kelas"
                widthClassName="!max-w-full"
                variant="modal"
              />
            </div>

            {/* Student List */}
            <div className="border border-gray-300 dark:border-gray-600 rounded-lg max-h-96 overflow-y-auto">
              {availableStudents.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  {searchQuery || filterClassId 
                    ? 'Tidak ada siswa yang cocok dengan filter yang dipilih' 
                    : 'Semua siswa sudah ada di kelas ini'}
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {availableStudents.map((student) => {
                    const isSelected = selectedStudentIds.includes(student.id)
                    const currentClasses = student.classes || []
                    return (
                      <label
                        key={student.id}
                        className={`flex items-center p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer ${
                          isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleStudent(student.id)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <div className="ml-3 flex-1">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {student.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {student.gender} • {currentClasses.length > 0 
                              ? `Kelas: ${currentClasses.map(c => c.name).join(', ')}`
                              : 'Tidak ada kelas'}
                            
                            {/* Org info depending on role */}
                            {profile && modalShouldShowKelompokFilter(profile) && (
                              <span className="text-gray-400">
                                {' • '}
                                {modalShouldShowDesaFilter(profile) ? (
                                  `${student.desa_name || 'Tanpa Desa'} - ${student.kelompok_name || 'Tanpa Kelompok'}`
                                ) : (
                                  `${student.kelompok_name || 'Tanpa Kelompok'}`
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>

            {selectedStudentIds.length > 0 && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                <strong>{selectedStudentIds.length}</strong> siswa dipilih
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            onClick={handleClose}
            variant="outline"
            disabled={isAssigning}
          >
            Batal
          </Button>
          <Button
            onClick={handleAssign}
            disabled={
              (!canBulkAssign && !selectedClassId) || 
              (canBulkAssign && !selectedMasterId) || 
              (canBulkAssign && masters.find(m => m.id === selectedMasterId)?.name === 'Lainnya' && !customClassName.trim()) || 
              selectedStudentIds.length === 0 || 
              isAssigning || 
              !kelompokReady
            }
          >
            {isAssigning ? 'Mengassign...' : `Assign ${selectedStudentIds.length} Siswa`}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

