'use client'

import { useState, useEffect, useMemo } from 'react'
import { DatePicker } from 'antd'
import dayjs from 'dayjs'
import 'dayjs/locale/id' // Import Indonesian locale
import Button from '@/components/ui/button/Button'
import { createMeeting, updateMeeting } from '../actions'
import { toast } from 'sonner'
import { useStudents } from '@/hooks/useStudents'
import { useClasses } from '@/hooks/useClasses'
import InputFilter from '@/components/form/input/InputFilter'
import MultiSelectCheckbox from '@/components/form/input/MultiSelectCheckbox'
import Link from 'next/link'
import DatePickerInput from '@/components/form/input/DatePicker'
import { useUserProfile } from '@/stores/userProfileStore'
import { useMeetingTypes } from '../hooks/useMeetingTypes'

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
    title: meeting?.title || 'Pengajian Rutin',
    topic: meeting?.topic || '',
    description: meeting?.description || ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([])
  const [meetingType, setMeetingType] = useState<string>('')

  const { students, isLoading: studentsLoading, mutate: mutateStudents } = useStudents()
  const { classes, isLoading: classesLoading } = useClasses()
  const { profile: userProfile } = useUserProfile()
  const { availableTypes, isLoading: typesLoading } = useMeetingTypes(userProfile)

  // Filter available classes based on user role
  const availableClasses = useMemo(() => {
    if (userProfile?.role === 'teacher') {
      return userProfile.classes || []
    }
    return classes || []
  }, [userProfile, classes])

  // Filter students by selected classes
  const filteredStudents = students.filter(student => 
    selectedClassIds.length === 0 || selectedClassIds.includes(student.class_id)
  )

  // Force revalidate students when modal opens to get fresh data
  useEffect(() => {
    if (isOpen) {
      mutateStudents()
    }
  }, [isOpen, mutateStudents])

  // Initialize selectedClassIds based on mode
  useEffect(() => {
    if (meeting) {
      // Edit mode: populate from meeting.class_ids
      setSelectedClassIds(meeting.class_ids || (meeting.class_id ? [meeting.class_id] : []))
    } else if (classId) {
      // Create mode with specific class
      setSelectedClassIds([classId])
    } else if (availableClasses && availableClasses.length > 0) {
      // Create mode: default to first available class
      setSelectedClassIds([availableClasses[0].id])
    }
  }, [classId, availableClasses, meeting])

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

  // Determine if meeting type input should be shown
  const shouldShowMeetingTypeInput = useMemo(() => {
    if (typesLoading || Object.keys(availableTypes).length === 0) {
      return true // Show by default while loading
    }
    
    // If only PEMBINAAN is available, all classes are non-sambung
    const typeKeys = Object.keys(availableTypes)
    if (typeKeys.length === 1 && typeKeys[0] === 'PEMBINAAN') {
      return false
    }
    
    return true
  }, [availableTypes, typesLoading])

  // Auto-select meeting type based on available options
  useEffect(() => {
    // If input is hidden, force PEMBINAAN
    if (!shouldShowMeetingTypeInput) {
      setMeetingType('PEMBINAAN')
      return
    }
    
    // Existing auto-select logic for when input is shown
    if (!meetingType && !typesLoading && Object.keys(availableTypes).length > 0) {
      const typeValues = Object.values(availableTypes)
      
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
  }, [availableTypes, typesLoading, meetingType, shouldShowMeetingTypeInput])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (selectedClassIds.length === 0) {
      toast.error('Pilih kelas terlebih dahulu')
      return
    }

    if (filteredStudents.length === 0) {
      toast.error('Tidak ada siswa di kelas yang dipilih')
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
          meetingTypeCode: meetingType
        })
        
        if (result.success) {
          toast.success('Pertemuan berhasil diperbarui!')
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
          meetingTypeCode: meetingType
        })

        if (result.success) {
          toast.success('Pertemuan berhasil dibuat!')
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
      title: 'Pengajian Rutin',
      topic: '',
      description: ''
    })
    setMeetingType('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/40 bg-opacity-30 transition-opacity"
          onClick={handleClose}
        />
        
        {/* Modal */}
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-auto">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {meeting ? 'Edit Pertemuan' : 'Buat Pertemuan Baru'}
              </h3>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              {/* Class Selection */}
              {/* Class Selector - Only show if user has more than 1 class */}
              {availableClasses.length > 1 && (
                <div className="mb-4">
                  <MultiSelectCheckbox
                    label="Pilih Kelas"
                    items={availableClasses.map(cls => ({
                      id: cls.id,
                      label: cls.name
                    }))}
                    selectedIds={selectedClassIds}
                    onChange={setSelectedClassIds}
                    hint="Pilih satu atau lebih kelas untuk pertemuan ini"
                    disabled={isSubmitting || classesLoading}
                  />
                </div>
              )}

              {/* Title Field */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Judul Pengajian
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Pengajian Kelompok, Pengajian Desa, dll"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  required
                />
              </div>

              {/* Date Picker */}
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

              {/* Meeting Type Selector */}
              {shouldShowMeetingTypeInput && (
                <div className="mb-4">
                  <InputFilter
                    id="meetingType"
                    label="Tipe Pertemuan"
                    value={meetingType}
                    onChange={setMeetingType}
                    options={Object.values(availableTypes).map(type => ({
                      value: type.code,
                      label: type.label
                    }))}
                    disabled={isSubmitting || typesLoading || Object.keys(availableTypes).length === 0}
                    widthClassName="!max-w-full"
                  />
                </div>
              )}

              {/* Topic */}
              {/* <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Topik (Opsional)
                </label>
                <input
                  type="text"
                  value={formData.topic}
                  onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
                  placeholder="Contoh: Hafalan"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div> */}

              {/* Description */}
              {/* <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Deskripsi (Opsional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Deskripsi pertemuan..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none"
                />
              </div> */}

              {/* Student Preview */}
              {filteredStudents.length > 0 ? (
                <div className="mb-6 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Jumlah Siswa untuk pertemuan ini ada <Link href={`/users/siswa`} className="text-blue-500 hover:text-blue-600">{filteredStudents.length} orang</Link>
                    {selectedClassIds.length > 1 && (
                      <span className="ml-2 text-xs text-purple-600 dark:text-purple-400">
                        ({selectedClassIds.length} kelas gabungan)
                      </span>
                    )}
                  </h4>
                </div>
              ) : (
                <div className="mb-6 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tidak ada siswa di kelas yang dipilih
                  </h4>
                </div>
              )}

              {/* Buttons */}
              <div className="flex justify-end space-x-3">
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
                >
                  {isSubmitting ? (meeting ? 'Memperbarui...' : 'Membuat...') : (meeting ? 'Perbarui' : 'Buat Pertemuan')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
