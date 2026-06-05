'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/modal'
import Button from '@/components/ui/button/Button'
import Label from '@/components/form/Label'
import { getMeetingFormSettings, updateMeetingFormSettings, updateTeacherPermissions, getTeacherMaterialPermissions, updateTeacherMaterialPermissions } from '../actions'
import { getAllActivityTypes, getTeacherActivityTypes, assignActivityTypeToTeacher, removeActivityTypeFromTeacher } from '@/app/(admin)/kegiatan/actions'
import { toast } from 'sonner'
import MultiSelectCheckbox from '@/components/form/input/MultiSelectCheckbox'
import { mutate } from 'swr'
import { meetingFormSettingsKeys } from '@/lib/swr'
import { useUserProfile } from '@/stores/userProfileStore'
import type { ActivityType } from '@/types/activityType'

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
  can_multi_kelompok_laporan?: boolean
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
  const [canManageMaterials, setCanManageMaterials] = useState(false)
  const [canAccessMaterials, setCanAccessMaterials] = useState(false)
  const [canAccessMonitoring, setCanAccessMonitoring] = useState(false)
  const [canMultiKelompokLaporan, setCanMultiKelompokLaporan] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Activity types state
  const [allActivityTypes, setAllActivityTypes] = useState<ActivityType[]>([])
  const [assignedActivityTypeIds, setAssignedActivityTypeIds] = useState<Set<string>>(new Set())
  const [savingActivityTypeId, setSavingActivityTypeId] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && userId) {
      loadData()
    }
  }, [isOpen, userId, currentPermissions])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [settingsResult, types, assigned, materialResult] = await Promise.all([
        getMeetingFormSettings(userId),
        getAllActivityTypes(),
        getTeacherActivityTypes(userId),
        getTeacherMaterialPermissions(userId),
      ])

      if (settingsResult.success && settingsResult.data) {
        setSettings({ ...DEFAULT_SETTINGS, ...settingsResult.data })
      } else {
        setSettings(DEFAULT_SETTINGS)
      }

      setPermissions(currentPermissions || DEFAULT_PERMISSIONS)

      if (materialResult.success && materialResult.data) {
        setCanManageMaterials(materialResult.data.can_manage_materials)
        setCanAccessMaterials(materialResult.data.can_access_materials)
        setCanAccessMonitoring(materialResult.data.can_access_monitoring)
        setCanMultiKelompokLaporan(materialResult.data.can_multi_kelompok_laporan)
      } else {
        setCanManageMaterials(false)
        setCanAccessMaterials(false)
        setCanAccessMonitoring(false)
        setCanMultiKelompokLaporan(false)
      }

      setAllActivityTypes(types || [])
      setAssignedActivityTypeIds(new Set(assigned.map(a => a.activity_type_id)))
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Gagal memuat pengaturan')
      setSettings(DEFAULT_SETTINGS)
      setPermissions(DEFAULT_PERMISSIONS)
    } finally {
      setIsLoading(false)
    }
  }

  const handleActivityTypeToggle = async (typeId: string, currentlyAssigned: boolean) => {
    setSavingActivityTypeId(typeId)
    try {
      if (currentlyAssigned) {
        await removeActivityTypeFromTeacher(userId, typeId)
        setAssignedActivityTypeIds(prev => {
          const next = new Set(prev)
          next.delete(typeId)
          return next
        })
      } else {
        await assignActivityTypeToTeacher(userId, typeId)
        setAssignedActivityTypeIds(prev => new Set(prev).add(typeId))
      }
    } catch (error) {
      console.error('Error toggling activity type:', error)
      toast.error('Gagal mengubah tipe kegiatan')
    } finally {
      setSavingActivityTypeId(null)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const settingsResult = await updateMeetingFormSettings(userId, settings)
      if (!settingsResult.success) {
        toast.error('Gagal menyimpan pengaturan form: ' + (settingsResult.message || 'Unknown error'))
        setIsSaving(false)
        return
      }

      const permissionsResult = await updateTeacherPermissions(userId, {
        ...permissions,
        can_multi_kelompok_laporan: canMultiKelompokLaporan,
      })
      if (!permissionsResult.success) {
        toast.error('Gagal menyimpan hak akses: ' + (permissionsResult.message || 'Unknown error'))
        setIsSaving(false)
        return
      }

      const materialResult = await updateTeacherMaterialPermissions(userId, { 
        can_manage_materials: canManageMaterials,
        can_access_materials: canAccessMaterials,
        can_access_monitoring: canAccessMonitoring,
      })
      if (!materialResult.success) {
        toast.error('Gagal menyimpan hak akses materi: ' + (materialResult.message || 'Unknown error'))
        setIsSaving(false)
        return
      }

      toast.success('Pengaturan berhasil disimpan')
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
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
              <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center space-x-3">
                  <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-4 w-56 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="h-10 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="h-10 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
          </div>
        ) : (
          <>
            {/* Tipe Kegiatan Section */}
            <div>
              <h4 className="text-base font-medium text-gray-900 dark:text-white mb-2">
                Tipe Kegiatan
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Pilih tipe kegiatan yang dapat dibuat oleh guru ini.
              </p>
              <div className="space-y-2">
                {allActivityTypes.map((type) => {
                  const isAssigned = assignedActivityTypeIds.has(type.id)
                  const saving = savingActivityTypeId === type.id
                  return (
                    <label key={type.id} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isAssigned}
                        onChange={() => handleActivityTypeToggle(type.id, isAssigned)}
                        disabled={saving || isSaving}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {type.name}
                        {!type.is_active && (
                          <span className="ml-2 text-xs text-gray-400">(nonaktif)</span>
                        )}
                      </span>
                      {saving && (
                        <span className="text-xs text-gray-400 animate-pulse">menyimpan...</span>
                      )}
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Meeting Form Settings Section */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
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
                      Hapus Permanen (Hard Delete - Tidak dapat dikembalikan)
                    </span>
                  </label>
                )}
              </div>
            </div>

            {/* Material Access Section */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h4 className="text-base font-medium text-gray-900 dark:text-white mb-2">
                Hak Akses Fitur
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Berikan akses kepada guru untuk mengelola fitur-fitur aplikasi
              </p>
              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={canManageMaterials}
                    onChange={(e) => setCanManageMaterials(e.target.checked)}
                    className="h-4 w-4 mt-0.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    disabled={isSaving}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                    Kelola Materi
                    <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-normal">
                      Tambah, edit, hapus item materi, assign ke kelas, dan set target bulanan (Superset dari Akses Materi)
                    </span>
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={canAccessMaterials || canManageMaterials}
                    onChange={(e) => setCanAccessMaterials(e.target.checked)}
                    disabled={isSaving || canManageMaterials}
                    className="h-4 w-4 mt-0.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                  />
                  <span className={`text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors ${canManageMaterials ? 'opacity-50' : ''}`}>
                    Akses Materi
                    <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-normal">
                      Dapat melihat halaman materi dan laporan materi
                    </span>
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={canAccessMonitoring}
                    onChange={(e) => setCanAccessMonitoring(e.target.checked)}
                    className="h-4 w-4 mt-0.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    disabled={isSaving}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                    Akses Monitoring & Laporan Materi
                    <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-normal">
                      Dapat mengisi penilaian di monitoring dan melihat laporan pencapaian materi
                    </span>
                  </span>
                </label>
              </div>
            </div>

            {/* Laporan Permissions Section */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h4 className="text-base font-medium text-gray-900 dark:text-white mb-2">
                Laporan
              </h4>
              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    id="canMultiKelompokLaporan"
                    checked={canMultiKelompokLaporan}
                    onChange={(e) => setCanMultiKelompokLaporan(e.target.checked)}
                    className="h-4 w-4 mt-0.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    disabled={isSaving}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                    Multi-Kelompok di Overview Laporan
                    <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-normal">
                      Izinkan pilih lebih dari 1 kelompok sekaligus di tab Overview laporan
                    </span>
                  </span>
                </label>
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
