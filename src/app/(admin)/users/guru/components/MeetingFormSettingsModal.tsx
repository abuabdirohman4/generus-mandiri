'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/modal'
import Button from '@/components/ui/button/Button'
import { getMeetingFormSettings, updateMeetingFormSettings } from '../actions'
import { toast } from 'sonner'
import MultiSelectCheckbox from '@/components/form/input/MultiSelectCheckbox'
import { mutate } from 'swr'
import { meetingFormSettingsKeys } from '@/lib/swr'

interface MeetingFormSettings {
  showTitle: boolean
  showTopic: boolean
  showDescription: boolean
  showDate: boolean
  showMeetingType: boolean
  showClassSelection: boolean
  showStudentSelection: boolean
  showGenderFilter: boolean
}

interface MeetingFormSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  userName: string
  onSuccess?: () => void
}

const DEFAULT_SETTINGS: MeetingFormSettings = {
  showTitle: true,
  showTopic: false,
  showDescription: false,
  showDate: true,
  showMeetingType: true,
  showClassSelection: true,
  showStudentSelection: false,
  showGenderFilter: false
}

export default function MeetingFormSettingsModal({
  isOpen,
  onClose,
  userId,
  userName,
  onSuccess
}: MeetingFormSettingsModalProps) {
  const [settings, setSettings] = useState<MeetingFormSettings>(DEFAULT_SETTINGS)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Load settings when modal opens
  useEffect(() => {
    if (isOpen && userId) {
      loadSettings()
    }
  }, [isOpen, userId])

  const loadSettings = async () => {
    setIsLoading(true)
    try {
      const result = await getMeetingFormSettings(userId)
      if (result.success && result.data) {
        setSettings({ ...DEFAULT_SETTINGS, ...result.data })
      } else {
        setSettings(DEFAULT_SETTINGS)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      toast.error('Gagal memuat pengaturan')
      setSettings(DEFAULT_SETTINGS)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const result = await updateMeetingFormSettings(userId, settings)
      if (result.success) {
        toast.success('Pengaturan berhasil disimpan')

        // Invalidate SWR cache for this user's settings
        // This ensures the user will get fresh settings next time they open the modal
        await mutate(meetingFormSettingsKeys.settings(userId))

        onSuccess?.()
        onClose()
      } else {
        toast.error('Gagal menyimpan pengaturan: ' + result.error)
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Terjadi kesalahan saat menyimpan')
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggle = (key: keyof MeetingFormSettings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const fieldOptions = [
    { id: 'showClassSelection', label: 'Pilih Kelas' },
    { id: 'showGenderFilter', label: 'Jenis Kelamin' },
    { id: 'showMeetingType', label: 'Tipe Pertemuan' },
    { id: 'showTitle', label: 'Judul Pertemuan' },
    { id: 'showTopic', label: 'Topik' },
    { id: 'showDescription', label: 'Deskripsi' },
    { id: 'showDate', label: 'Tanggal Pertemuan' },
    { id: 'showStudentSelection', label: 'Pilih Siswa' },
  ]

  const selectedIds = fieldOptions
    .filter(option => settings[option.id as keyof MeetingFormSettings])
    .map(option => option.id)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Atur Form Pertemuan - ${userName}`}
    >
      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {/* Description skeleton */}
            <div className="mb-4">
              <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
            
            {/* Label skeleton */}
            <div className="mb-2">
              <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
            
            {/* MultiSelectCheckbox skeleton - checkbox items */}
            <div className="space-y-3 border border-gray-200 dark:border-gray-700 rounded-lg p-4 max-h-80 overflow-hidden">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="flex items-center space-x-3">
                  <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
            
            {/* Hint skeleton */}
            <div className="mt-2">
              <div className="h-3 w-56 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
            
            {/* Buttons skeleton */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="h-10 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="h-10 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Pilih field yang akan ditampilkan saat guru ini membuat pertemuan baru.
              </p>
            </div>

            <MultiSelectCheckbox
              label="Field yang Ditampilkan"
              items={fieldOptions}
              selectedIds={selectedIds}
              onChange={(ids) => {
                // Start with all fields set to false
                const newSettings: MeetingFormSettings = {
                  showTitle: false,
                  showTopic: false,
                  showDescription: false,
                  showDate: false,
                  showMeetingType: false,
                  showClassSelection: false,
                  showStudentSelection: false,
                  showGenderFilter: false
                }
                // Then set only the selected ones to true
                ids.forEach(id => {
                  newSettings[id as keyof MeetingFormSettings] = true
                })
                setSettings(newSettings)
              }}
              maxHeight="20rem"
              hint="Centang field yang ingin ditampilkan"
            />

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
                disabled={isSaving}
              >
                Batal
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                variant="primary"
                loading={isSaving}
                disabled={isSaving}
              >
                Simpan
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}


