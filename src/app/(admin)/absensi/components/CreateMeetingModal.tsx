'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { DatePicker } from 'antd'
import dayjs from 'dayjs'
import 'dayjs/locale/id' // Import Indonesian locale
import Button from '@/components/ui/button/Button'
import { createMeeting, updateMeeting } from '../actions'
import { toast } from 'sonner'
import { useStudents } from '@/hooks/useStudents'
import { useClasses } from '@/hooks/useClasses'
import { useKelompok } from '@/hooks/useKelompok'
import InputFilter from '@/components/form/input/InputFilter'
import MultiSelectCheckbox from '@/components/form/input/MultiSelectCheckbox'
import Link from 'next/link'
import DatePickerInput from '@/components/form/input/DatePicker'
import { useUserProfile } from '@/stores/userProfileStore'
import { useMeetingTypes } from '../hooks/useMeetingTypes'
import Modal from '@/components/ui/modal'
import { invalidateAllMeetingsCache } from '../utils/cache'
import { isTeacherClass } from '@/lib/utils/classHelpers'
import { MEETING_TYPES } from '@/lib/constants/meetingTypes'

// Set Indonesian locale
dayjs.locale('id')

interface CreateMeetingModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  classId?: string
  meeting?: any // Add meeting prop for edit mode
}

export default function CreateMeetingModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  classId,
  meeting // Add meeting parameter
}: CreateMeetingModalProps) {
  const [formData, setFormData] = useState({
    date: meeting ? dayjs(meeting.date) : dayjs(),
    title: meeting?.title || '',
    topic: meeting?.topic || '',
    description: meeting?.description || ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([])
  const [meetingType, setMeetingType] = useState<string>('')
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [selectedGender, setSelectedGender] = useState<string | null>(null)

  const { students, isLoading: studentsLoading, mutate: mutateStudents } = useStudents()
  const { classes, isLoading: classesLoading } = useClasses()
  const { kelompok } = useKelompok()
  const { profile: userProfile } = useUserProfile()
  const { availableTypes, isLoading: typesLoading } = useMeetingTypes(userProfile)
  
  // Load meeting form settings
  const [formSettings, setFormSettings] = useState<{
    showTitle: boolean
    showTopic: boolean
    showDescription: boolean
    showDate: boolean
    showMeetingType: boolean
    showClassSelection: boolean
    showStudentSelection: boolean
    showGenderFilter: boolean
  } | null>(null)
  
  useEffect(() => {
    if (isOpen && userProfile?.id) {
      const loadSettings = async () => {
        try {
          const { getMeetingFormSettings } = await import('@/app/(admin)/users/guru/actions')
          const result = await getMeetingFormSettings(userProfile.id)
          if (result.success && result.data) {
            setFormSettings(result.data)
          } else {
            // Use defaults if no settings found
            setFormSettings({
              showTitle: true,
              showTopic: false,
              showDescription: false,
              showDate: true,
              showMeetingType: true,
              showClassSelection: true,
              showStudentSelection: false,
              showGenderFilter: false
            })
          }
        } catch (error) {
          console.error('Error loading form settings:', error)
          // Use defaults on error
          setFormSettings({
            showTitle: true,
            showTopic: false,
            showDescription: false,
            showDate: true,
            showMeetingType: true,
            showClassSelection: true,
            showStudentSelection: false,
            showGenderFilter: false
          })
        }
      }
      loadSettings()
    }
  }, [isOpen, userProfile?.id])

  // Tambahkan useMemo untuk menambahkan PEMBINAAN jika kelas Pengajar dipilih
  const finalAvailableTypes = useMemo(() => {
    if (!availableTypes) return availableTypes
    
    // Check if any selected class is Pengajar
    const hasPengajarClass = selectedClassIds.some(classId => {
      const selectedClass = classes.find(c => c.id === classId)
      return selectedClass && isTeacherClass(selectedClass)
    })
    
    // If Pengajar class is selected, ensure PEMBINAAN is always available
    if (hasPengajarClass && !availableTypes.PEMBINAAN) {
      return {
        ...availableTypes,
        PEMBINAAN: MEETING_TYPES.PEMBINAAN
      }
    }
    
    return availableTypes
  }, [availableTypes, selectedClassIds, classes])

  // Filter available classes based on user role and enrich with kelompok_id for teacher
  // Use stable string representation for dependency to avoid infinite loops
  const availableClasses = useMemo(() => {
    if (userProfile?.role === 'teacher' && userProfile.classes && userProfile.classes.length > 1) {
      // Enrich teacher classes with kelompok_id from classes
      return userProfile.classes.map(cls => {
        const fullClass = classes.find(c => c.id === cls.id)
        return {
          ...cls,
          kelompok_id: fullClass?.kelompok_id || null
        }
      })
    } else if (userProfile?.role === 'teacher') {
      return userProfile.classes || []
    }
    return classes || []
  }, [
    userProfile?.role,
    userProfile?.classes?.length,
    userProfile?.classes?.map(c => c.id).join(','),
    classes?.length,
    classes?.map(c => `${c.id}-${c.kelompok_id}`).join(',')
  ])

  // Helper to find matching class for a student
  const getStudentMatchingClass = (student: any, selectedClassIds: string[], classesData: any[]) => {
    // Find first class from student.classes that exists in selectedClassIds
    const matchingClassId = student.classes?.find((c: any) => selectedClassIds.includes(c.id))?.id
    if (!matchingClassId) return null
    
    // Get full class details
    return classesData.find((c: any) => c.id === matchingClassId)
  }

  // Check if teacher has multiple kelompok
  const teacherHasMultipleKelompok = useMemo(() => {
    if (userProfile?.role !== 'teacher') return false
    const kelompokIds = new Set(availableClasses.map((c: any) => c.kelompok_id).filter(Boolean))
    return kelompokIds.size > 1
  }, [userProfile?.role, availableClasses])

  // Kelompok name map
  const kelompokMap = useMemo(() => {
    if (!kelompok || kelompok.length === 0) return new Map()
    return new Map(kelompok.map((k: any) => [k.id, k.name]))
  }, [kelompok])

  // Filter students by selected classes and gender - support multiple classes per student
  const filteredStudents = students.filter(student => {
    // Filter by class
    let matchesClass = true
    if (selectedClassIds.length > 0) {
      const studentClassIds = (student.classes || []).map(c => c.id)
      // Also check class_id for backward compatibility
      const allStudentClassIds = student.class_id ? [...studentClassIds, student.class_id] : studentClassIds
      matchesClass = allStudentClassIds.some(classId => selectedClassIds.includes(classId))
    }
    
    // Filter by gender
    let matchesGender = true
    if (selectedGender && selectedGender !== '') {
      matchesGender = student.gender === selectedGender
    }
    
    return matchesClass && matchesGender
  })

  // Force revalidate students when modal opens to get fresh data
  useEffect(() => {
    if (isOpen) {
      mutateStudents()
    }
  }, [isOpen, mutateStudents])

  // Track initialization to prevent infinite loops
  const initializedRef = useRef(false)
  const previousIsOpenRef = useRef(isOpen)
  
  // Initialize selectedClassIds based on mode - only when modal opens for the first time
  useEffect(() => {
    // Reset when modal closes
    if (!isOpen) {
      if (previousIsOpenRef.current) {
        initializedRef.current = false
      }
      previousIsOpenRef.current = false
      return
    }
    
    // Only initialize once when modal first opens
    if (!previousIsOpenRef.current && isOpen) {
      previousIsOpenRef.current = true
      initializedRef.current = false
    }
    
    // Only initialize once per modal open
    if (initializedRef.current) return
    
    if (meeting) {
      // Edit mode: populate from meeting.class_ids
      const meetingClassIds = meeting.class_ids || (meeting.class_id ? [meeting.class_id] : [])
      setSelectedClassIds(meetingClassIds)
      initializedRef.current = true
    } else if (classId) {
      // Create mode with specific class
      // Handle comma-separated class IDs from filter
      const classIds = classId.includes(',') ? classId.split(',').filter(Boolean) : [classId]
      setSelectedClassIds(classIds)
      initializedRef.current = true
    } else if (availableClasses && availableClasses.length > 0) {
      // Create mode: default to first available class
      // Use a separate effect that only runs when availableClasses is ready
      setSelectedClassIds([availableClasses[0].id])
      initializedRef.current = true
    }
  }, [isOpen, classId, meeting])
  
  // Separate effect for availableClasses to avoid infinite loop
  // Only initialize if not already initialized and modal is open
  useEffect(() => {
    if (!isOpen || initializedRef.current) return
    if (!classId && !meeting && availableClasses && availableClasses.length > 0) {
      setSelectedClassIds(prev => {
        // Only set if not already set
        if (prev.length === 0) {
          return [availableClasses[0].id]
        }
        return prev
      })
    }
  }, [isOpen, availableClasses?.length, availableClasses?.[0]?.id])

  // Update form data when meeting changes
  useEffect(() => {
    if (meeting) {
      setFormData({
        date: dayjs(meeting.date),
        title: meeting.title,
        topic: meeting.topic || '',
        description: meeting.description || ''
      })
      setMeetingType(meeting.meeting_type_code || '')
    }
  }, [meeting])

  // Initialize selectedStudentIds based on mode
  useEffect(() => {
    if (selectedClassIds.length > 0 && filteredStudents.length > 0) {
      if (meeting && meeting.student_snapshot && meeting.student_snapshot.length > 0) {
        // Edit mode: initialize from meeting.student_snapshot
        // Filter to only include students that are still in filteredStudents
        const validStudentIds = filteredStudents
          .filter(s => meeting.student_snapshot.includes(s.id))
          .map(s => s.id)
        setSelectedStudentIds(validStudentIds.length > 0 ? validStudentIds : filteredStudents.map(s => s.id))
      } else {
        // Create mode: auto-select all filtered students
        const allStudentIds = filteredStudents.map(s => s.id)
        setSelectedStudentIds(allStudentIds)
      }
    } else {
      setSelectedStudentIds([])
    }
  }, [selectedClassIds.join(','), filteredStudents.map(s => s.id).join(','), meeting?.student_snapshot?.join(',')])

  // Determine if meeting type input should be shown
  const shouldShowMeetingTypeInput = useMemo(() => {
    if (typesLoading || Object.keys(finalAvailableTypes).length === 0) {
      return true // Show by default while loading
    }
    
    // If only PEMBINAAN is available, all classes are non-sambung
    const typeKeys = Object.keys(finalAvailableTypes)
    if (typeKeys.length === 1 && typeKeys[0] === 'PEMBINAAN') {
      return false
    }
    
    return true
  }, [finalAvailableTypes, typesLoading])

  // Auto-select meeting type based on available options
  useEffect(() => {
    // Don't auto-select in edit mode (meeting type is already set)
    if (meeting) {
      return
    }
    
    // Wait for modal to be open and types to be loaded
    if (!isOpen || typesLoading) {
      return
    }
    
    // If input is hidden, force PEMBINAAN
    if (!shouldShowMeetingTypeInput) {
      if (meetingType !== 'PEMBINAAN') {
        setMeetingType('PEMBINAAN')
      }
      return
    }
    
    // Auto-select logic for when input is shown (only if meetingType is empty)
    if (!meetingType && Object.keys(finalAvailableTypes).length > 0) {
      const typeValues = Object.values(finalAvailableTypes)
      
      // If only 1 option, auto-select it
      if (typeValues.length === 1) {
        setMeetingType(typeValues[0].code)
      } 
      // If multiple options and PEMBINAAN exists, default to PEMBINAAN
      else if (typeValues.length > 1) {
        const hasPembinaan = typeValues.some(t => t.code === 'PEMBINAAN')
        if (hasPembinaan) {
          setMeetingType('PEMBINAAN')
        } else {
          // No PEMBINAAN means Sambung classes, default to SAMBUNG_KELOMPOK
          setMeetingType('SAMBUNG_KELOMPOK')
        }
      }
    }
  }, [isOpen, finalAvailableTypes, typesLoading, shouldShowMeetingTypeInput, meetingType, meeting])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (selectedClassIds.length === 0) {
      toast.error('Pilih kelas terlebih dahulu')
      return
    }

    if (selectedStudentIds.length === 0) {
      toast.error('Pilih minimal satu siswa untuk diikutsertakan')
      return
    }

    if (!meetingType) {
      toast.error('Pilih tipe pertemuan terlebih dahulu')
      return
    }

    setIsSubmitting(true)
    try {
      if (meeting) {
        // Edit mode
        const result = await updateMeeting(meeting.id, {
          classIds: selectedClassIds,
          date: formData.date.format('YYYY-MM-DD'),
          title: formData.title,
          topic: formData.topic || undefined,
          description: formData.description || undefined,
          meetingTypeCode: meetingType,
          studentIds: selectedStudentIds
        })
        
        if (result.success) {
          toast.success('Pertemuan berhasil diperbarui!')
          // Invalidate all meetings cache so other users see the update
          await invalidateAllMeetingsCache()
          onSuccess()
          handleClose()
        } else {
          toast.error('Gagal memperbarui pertemuan: ' + result.error)
        }
      } else {
        // Create mode
        const result = await createMeeting({
          classIds: selectedClassIds,
          date: formData.date.format('YYYY-MM-DD'),
          title: formData.title,
          topic: formData.topic || undefined,
          description: formData.description || undefined,
          meetingTypeCode: meetingType,
          studentIds: selectedStudentIds
        })

        if (result.success) {
          toast.success('Pertemuan berhasil dibuat!')
          // Invalidate all meetings cache so other users see the new meeting
          await invalidateAllMeetingsCache()
          onSuccess()
          handleClose()
        } else {
          toast.error('Gagal membuat pertemuan: ' + result.error)
        }
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Terjadi kesalahan')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData({
      date: dayjs(),
      title: '',
      topic: '',
      description: ''
    })
    setMeetingType('')
    setSelectedStudentIds([])
    setSelectedGender(null)
    onClose()
  }

  if (!isOpen) return null

  return (
        <Modal
          isOpen={isOpen}
          onClose={handleClose}
          title={meeting ? 'Edit Pertemuan' : 'Buat Pertemuan Baru'}
        >
            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col h-full -mx-6 -my-4">
              <div className="flex-1 overflow-y-auto px-6 py-4">
              {/* Class Selection */}
              {/* Class Selector - Only show if user has more than 1 class */}
              {formSettings?.showClassSelection !== false && availableClasses.length > 1 && (
                <div className="mb-4">
                  <MultiSelectCheckbox
                    label="Pilih Kelas"
                    items={(() => {
                      // For teacher with multiple classes, check for duplicate names
                      if (userProfile?.role === 'teacher' && availableClasses.length > 1 && kelompok) {
                        // Create mapping kelompok_id -> kelompok name
                        const kelompokMap = new Map(
                          kelompok.map(k => [k.id, k.name])
                        )
                        
                        // Check for duplicate class names
                        const nameCounts = availableClasses.reduce((acc, cls: any) => {
                          acc[cls.name] = (acc[cls.name] || 0) + 1
                          return acc
                        }, {} as Record<string, number>)
                        
                        // Format labels
                        return availableClasses.map((cls: any) => {
                          const hasDuplicate = nameCounts[cls.name] > 1
                          const kelompokName = cls.kelompok_id ? kelompokMap.get(cls.kelompok_id) : null
                          const label = hasDuplicate && kelompokName
                            ? `${cls.name} (${kelompokName})`
                            : cls.name
                          
                          return {
                            id: cls.id,
                            label
                          }
                        })
                      }
                      
                      // Default: no format change
                      return availableClasses.map(cls => ({
                        id: cls.id,
                        label: cls.name
                      }))
                    })()}
                    selectedIds={selectedClassIds}
                    onChange={setSelectedClassIds}
                    hint="Pilih satu atau lebih kelas untuk pertemuan ini"
                    disabled={isSubmitting || classesLoading}
                  />
                </div>
              )}

              {/* Gender Filter */}
              {formSettings?.showGenderFilter !== false && (
                <div className="mb-4">
                  <InputFilter
                    id="genderFilter"
                    label="Jenis Kelamin (Opsional)"
                    value={selectedGender || ''}
                    onChange={(value) => setSelectedGender(value === '' ? null : value)}
                    options={[
                      { value: '', label: 'Semua' },
                      { value: 'Laki-laki', label: 'Laki-laki' },
                      { value: 'Perempuan', label: 'Perempuan' }
                    ]}
                    disabled={isSubmitting}
                    widthClassName="!max-w-full"
                    className='!mb-0'
                  />
                </div>
              )}

              {/* Meeting Type Selector */}
              {formSettings?.showMeetingType !== false && (
                <div className="mb-4">
                  <InputFilter
                    id="meetingType"
                    label="Tipe Pertemuan"
                    value={meetingType}
                    onChange={setMeetingType}
                    options={Object.values(finalAvailableTypes).map(type => ({
                      value: type.code,
                      label: type.label
                    }))}
                    disabled={isSubmitting || typesLoading || Object.keys(finalAvailableTypes).length === 0}
                    widthClassName="!max-w-full"
                    className='!mb-0'
                  />
                </div>
              )}

              {/* Title Field */}
              {formSettings?.showTitle !== false && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Judul Pertemuan (Opsional)
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Judul pertemuan..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>
              )}

              {/* Topic */}
              {formSettings?.showTopic !== false && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Topik (Opsional)
                  </label>
                  <input
                    type="text"
                    value={formData.topic}
                    onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
                    placeholder="Topik pertemuan..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>
              )}

              {/* Description */}
              {formSettings?.showDescription !== false && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Deskripsi (Opsional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Deskripsi pertemuan..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none"
                  />
                </div>
              )}

              {/* Date Picker */}
              {formSettings?.showDate !== false && (
                <div className="mb-4">
                  <DatePickerInput
                    mode="single"
                    label="Tanggal Pertemuan"
                    value={formData.date}
                    onChange={(date) => setFormData(prev => ({ ...prev, date: date || dayjs() }))}
                    format="DD/MM/YYYY"
                    placeholder="Pilih Tanggal"
                  />
                </div>
              )}

              {/* Student Preview */}
              {filteredStudents.length > 0 ? (
                <div className="mb-6 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Jumlah Siswa: <Link href={`/users/siswa`} className="text-blue-500 hover:text-blue-600">{selectedStudentIds.length} dari {filteredStudents.length} siswa dipilih</Link>
                    {selectedClassIds.length > 1 && (
                      <span className="ml-2 text-xs text-purple-600 dark:text-purple-400">
                        ({selectedClassIds.length} kelas gabungan)
                      </span>
                    )}
                    {/* Show multi-class indicator if any student has multiple classes */}
                    {/* {filteredStudents.some(s => (s.classes || []).length > 1) && (
                      <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                        (termasuk siswa multi-kelas)
                      </span>
                    )} */}
                  </h4>
                  
                  {/* Student Selection */}
                  {formSettings?.showStudentSelection !== false && (
                    <div className="mt-4">
                      <MultiSelectCheckbox
                        label="Pilih Siswa yang Akan Diikutsertakan"
                        items={filteredStudents.map(s => {
                          const matchingClass = getStudentMatchingClass(s, selectedClassIds, classes)
                          const className = matchingClass?.name || ''
                          const kelompokName = matchingClass?.kelompok_id ? kelompokMap.get(matchingClass.kelompok_id) : null
                          
                          let label = s.name
                          if (className) {
                            if (teacherHasMultipleKelompok && kelompokName) {
                              label = `${s.name} (${className} - ${kelompokName})`
                            } else {
                              label = `${s.name} (${className})`
                            }
                          }
                          
                          return { id: s.id, label }
                        })}
                        selectedIds={selectedStudentIds}
                        onChange={setSelectedStudentIds}
                        maxHeight="15rem"
                        hint="Pilih siswa yang akan ikut dalam pertemuan ini. Default: semua siswa terpilih."
                        disabled={isSubmitting}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="mb-6 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tidak ada siswa di kelas yang dipilih
                  </h4>
                </div>
              )}
              </div>

              {/* Buttons - Sticky at bottom */}
              <div className="flex justify-end space-x-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 mt-auto">
                <Button
                  type="button"
                  onClick={handleClose}
                  variant="outline"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || studentsLoading || classesLoading || filteredStudents.length === 0}
                  variant="primary"
                  loading={isSubmitting}
                  loadingText={meeting ? 'Memperbarui...' : 'Membuat...'}
                >
                  {meeting ? 'Perbarui' : 'Buat Pertemuan'}
                </Button>
              </div>
            </form>
        </Modal>
  )
}
