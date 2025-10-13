'use client'

import { useState, useEffect } from 'react'
import { DatePicker } from 'antd'
import dayjs from 'dayjs'
import 'dayjs/locale/id' // Import Indonesian locale
import Button from '@/components/ui/button/Button'
import { createMeeting, updateMeeting } from '../actions'
import { toast } from 'sonner'
import { useStudents } from '@/hooks/useStudents'
import { useClasses } from '@/hooks/useClasses'
import InputFilter from '@/components/form/input/InputFilter'
import Link from 'next/link'
import DatePickerInput from '@/components/form/input/DatePicker'

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
  const [selectedClassId, setSelectedClassId] = useState<string>('')

  const { students, isLoading: studentsLoading } = useStudents()
  const { classes, isLoading: classesLoading } = useClasses()

  // Filter students by selected class
  const filteredStudents = students.filter(student => 
    !selectedClassId || student.class_id === selectedClassId
  )

  useEffect(() => {
    if (classId) {
      setSelectedClassId(classId)
    } else if (classes && classes.length > 0) {
      setSelectedClassId(classes[0].id)
    }
  }, [classId, classes])

  // Update useEffect to reinitialize when meeting changes
  useEffect(() => {
    if (meeting) {
      setFormData({
        date: dayjs(meeting.date),
        title: meeting.title,
        topic: meeting.topic || '',
        description: meeting.description || ''
      })
    }
  }, [meeting])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedClassId) {
      toast.error('Pilih kelas terlebih dahulu')
      return
    }

    if (filteredStudents.length === 0) {
      toast.error('Tidak ada siswa di kelas yang dipilih')
      return
    }

    setIsSubmitting(true)
    try {
      if (meeting) {
        // Edit mode
        const result = await updateMeeting(meeting.id, {
          classId: selectedClassId,
          date: formData.date.format('YYYY-MM-DD'),
          title: formData.title,
          topic: formData.topic || undefined,
          description: formData.description || undefined
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
          classId: selectedClassId,
          date: formData.date.format('YYYY-MM-DD'),
          title: formData.title,
          topic: formData.topic || undefined,
          description: formData.description || undefined
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
              <div className="mb-4">
                <InputFilter
                  options={classes?.map(cls => ({
                    value: cls.id,
                    label: cls.name
                  })) || []}
                  value={selectedClassId}
                  onChange={(val: string) => setSelectedClassId(val)}
                  id="classFilter"   
                  label="Kelas"
                  widthClassName="!max-w-full"
                  className='!mb-0'
                />
              </div>

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
              {filteredStudents.length > 0 && (
                <div className="mb-6 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Jumlah Siswa untuk pertemuan ini ada <Link href={`/siswa`} className="text-blue-500 hover:text-blue-600">{filteredStudents.length} orang</Link>
                  </h4>
                  {/* <div className="max-h-32 overflow-y-auto">
                    <div className="flex flex-wrap gap-1">
                      {filteredStudents.map((student) => (
                        <span
                          key={student.id}
                          className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded"
                        >
                          {student.name}
                        </span>
                      ))}
                    </div>
                  </div> */}
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
