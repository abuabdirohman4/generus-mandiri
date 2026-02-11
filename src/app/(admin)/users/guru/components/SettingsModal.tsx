'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/modal'
import Button from '@/components/ui/button/Button'
import Label from '@/components/form/Label'
import { getMeetingFormSettings, updateMeetingFormSettings, updateTeacherPermissions } from '../actions'
import { toast } from 'sonner'
import MultiSelectCheckbox from '@/components/form/input/MultiSelectCheckbox'
import { mutate } from 'swr'
import { meetingFormSettingsKeys } from '@/lib/swr'
import { useUserProfile } from '@/stores/userProfileStore'

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

interface TeacherPermissions {
  can_archive_students?: boolean
  can_transfer_students?: boolean
  can_soft_delete_students?: boolean
  can_hard_delete_students?: boolean
}

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  userName: string
  currentPermissions?: TeacherPermissions
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

const DEFAULT_PERMISSIONS: TeacherPermissions = {
  can_archive_students: false,
  can_transfer_students: false,
  can_soft_delete_students: false,
  can_hard_delete_students: false
}

export default function SettingsModal({
  isOpen,
  onClose,
  userId,
  userName,
  currentPermissions,
  onSuccess
}: SettingsModalProps) {
  const { profile: userProfile } = useUserProfile()
  const [settings, setSettings] = useState<MeetingFormSettings>(DEFAULT_SETTINGS)
  const [permissions, setPermissions] = useState<TeacherPermissions>(DEFAULT_PERMISSIONS)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Load settings and permissions when modal opens
  useEffect(() => {
    if (isOpen && userId) {
      loadData()
    }
  }, [isOpen, userId, currentPermissions])

  const loadData = async () => {
    setIsLoading(true)
    try {
      // Load meeting form settings
      const result = await getMeetingFormSettings(userId)
      if (result.success && result.data) {
        setSettings({ ...DEFAULT_SETTINGS, ...result.data })
      } else {
        setSettings(DEFAULT_SETTINGS)
      }

      // Load permissions
      setPermissions(currentPermissions || DEFAULT_PERMISSIONS)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Gagal memuat pengaturan')
      setSettings(DEFAULT_SETTINGS)
      setPermissions(DEFAULT_PERMISSIONS)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Save meeting form settings
      const settingsResult = await updateMeetingFormSettings(userId, settings)
      if (!settingsResult.success) {
        toast.error('Gagal menyimpan pengaturan form: ' + settingsResult.error)
        setIsSaving(false)
        return
      }

      // Save permissions
      const permissionsResult = await updateTeacherPermissions(userId, permissions)

      if (!permissionsResult.success) {
        toast.error('Gagal menyimpan hak akses: ' + permissionsResult.error)
        setIsSaving(false)
        return
      }

      toast.success('Pengaturan berhasil disimpan')

      // Invalidate SWR cache for this user's settings
      await mutate(meetingFormSettingsKeys.settings(userId))

      onSuccess?.()
      onClose()
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Terjadi kesalahan saat menyimpan')
    } finally {
      setIsSaving(false)
    }
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
      title={`Pengaturan - ${userName}`}
    >
      <div className="space-y-6">
        {isLoading ? (
          <div className="space-y-6">
            {/* Settings skeleton */}
            <div className="space-y-4">
              <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="space-y-3 border border-gray-200 dark:border-gray-700 rounded-lg p-4 max-h-80 overflow-hidden">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Permissions skeleton */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
              <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center space-x-3">
                  <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-4 w-56 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
              ))}
            </div>

            {/* Buttons skeleton */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="h-10 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="h-10 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
          </div>
        ) : (
          <>
            {/* Meeting Form Settings Section */}
            <div>
              <h4 className="text-base font-medium text-gray-900 dark:text-white mb-2">
                Form Pertemuan
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Pilih field yang akan ditampilkan saat guru ini membuat pertemuan baru.
              </p>

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
            </div>

            {/* Student Management Permissions Section */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h4 className="text-base font-medium text-gray-900 dark:text-white mb-2">
                Hak Akses Manajemen Siswa
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Berikan hak akses kepada guru untuk mengelola data siswa
              </p>

              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={permissions.can_archive_students}
                    onChange={(e) => setPermissions(prev => ({
                      ...prev,
                      can_archive_students: e.target.checked
                    }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    disabled={isSaving}
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Arsip Siswa (Lulus/Tidak Aktif)
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={permissions.can_transfer_students}
                    onChange={(e) => setPermissions(prev => ({
                      ...prev,
                      can_transfer_students: e.target.checked
                    }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    disabled={isSaving}
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Transfer Siswa (Pindah Organisasi/Kelas)
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={permissions.can_soft_delete_students}
                    onChange={(e) => setPermissions(prev => ({
                      ...prev,
                      can_soft_delete_students: e.target.checked
                    }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    disabled={isSaving}
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Hapus Siswa (Soft Delete - Dapat dikembalikan)
                  </span>
                </label>

                {userProfile?.role === 'superadmin' && (
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={permissions.can_hard_delete_students}
                      onChange={(e) => setPermissions(prev => ({
                        ...prev,
                        can_hard_delete_students: e.target.checked
                      }))}
                      className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                      disabled={isSaving}
                    />
                    <span className="ml-2 text-sm text-red-600 dark:text-red-400 font-medium">
                      Hapus Permanen (Hard Delete - Tidak dapat dikembalikan) ⚠️
                    </span>
                  </label>
                )}
              </div>
            </div>

            {/* Action Buttons */}
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
