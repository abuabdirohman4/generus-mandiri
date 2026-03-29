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

  const needsKelompok = !!profile && modalShouldShowKelompokFilter(profile) && !isAdminKelompok(profile) && !isTeacherKelompok(profile)
  const kelompokReady = !needsKelompok || orgFilters.kelompok.length > 0

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

  // Filter students based on search query and class filter
  const filteredStudents = useMemo(() => {
    let filtered = students || []
    
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
  }, [students, searchQuery, filterClassId])

  // Filter out students already in selected class
  const availableStudents = useMemo(() => {
    if (!selectedClassId) return filteredStudents
    return filteredStudents.filter(student => {
      const studentClassIds = studentsWithClasses.get(student.id) || []
      return !studentClassIds.includes(selectedClassId)
    })
  }, [filteredStudents, selectedClassId, studentsWithClasses])

  const handleAssign = async () => {
    if (!selectedClassId) {
      toast.error('Pilih kelas terlebih dahulu')
      return
    }

    if (selectedStudentIds.length === 0) {
      toast.error('Pilih minimal satu siswa')
      return
    }

    setIsAssigning(true)

    try {
      const result = await assignStudentsToClass(selectedStudentIds, selectedClassId)
      
      if (result.success) {
        if (result.skipped.length > 0) {
          toast.warning(`${result.assigned} siswa berhasil diassign, ${result.skipped.length} siswa sudah ada di kelas ini`)
        } else {
          toast.success(`${result.assigned} siswa berhasil diassign ke kelas`)
        }
        closeModal()
        // Trigger refresh dengan delay untuk memastikan data sudah diupdate
        setTimeout(() => {
          onSuccess?.()
        }, 500)
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
    onClose()
  }

  const selectedClass = classes.find(c => c.id === selectedClassId)
  const allFilteredSelected = availableStudents.length > 0 && 
    availableStudents.every(s => selectedStudentIds.includes(s.id))

  if (classesLoading || studentsLoading) {
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
              hideAllOption={true}
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
            variant="modal"
          />
          {selectedClass && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Siswa yang sudah ada di kelas <strong>{selectedClass.name}</strong> tidak akan ditampilkan
            </p>
          )}
        </div>

        {/* Step 2: Pilih Siswa dengan Search */}
        {selectedClassId && (
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
            disabled={!selectedClassId || selectedStudentIds.length === 0 || isAssigning || !kelompokReady}
          >
            {isAssigning ? 'Mengassign...' : `Assign ${selectedStudentIds.length} Siswa`}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

