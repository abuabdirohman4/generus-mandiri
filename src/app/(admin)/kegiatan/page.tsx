'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUserProfile } from '@/stores/userProfileStore'
import { isAdminDaerah, isAdminDesa, isAdminKelompok } from '@/lib/userUtils'
import { useActivityTypes } from '@/hooks/useActivityTypes'
import { useActivityLevels } from '@/hooks/useActivityLevels'
import ActivityTypeTable from './components/ActivityTypeTable'
import ActivityLevelTable from './components/ActivityLevelTable'
import ActivityTypeModal from './components/ActivityTypeModal'
import ActivityLevelModal from './components/ActivityLevelModal'
import ConfirmModal from '@/components/ui/modal/ConfirmModal'
import SuperadminTableSkeleton from '@/components/ui/skeleton/SuperadminTableSkeleton'
import { deleteActivityType } from './actions'
import { toast } from 'sonner'
import type { ActivityType, ActivityLevel } from '@/types/activityType'

type TabType = 'tipe' | 'tingkat'

export default function KegiatanPage() {
  const router = useRouter()
  const { profile: userProfile } = useUserProfile()

  const { activityTypes, isLoading: typesLoading, error: typesError, mutate: mutateTypes } = useActivityTypes()
  const { activityLevels, isLoading: levelsLoading, error: levelsError, mutate: mutateLevels } = useActivityLevels()

  const [activeTab, setActiveTab] = useState<TabType>('tipe')
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false)
  const [isLevelModalOpen, setIsLevelModalOpen] = useState(false)
  const [editingType, setEditingType] = useState<ActivityType | null>(null)
  const [editingLevel, setEditingLevel] = useState<ActivityLevel | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean
    item: ActivityType | null
  }>({ isOpen: false, item: null })
  const [isDeleting, setIsDeleting] = useState(false)

  const isSuperAdminUser = userProfile?.role === 'superadmin'
  const isAdminDaerahUser = userProfile ? isAdminDaerah(userProfile) : false

  // Access control: redirect if not superadmin or admin daerah
  useEffect(() => {
    if (!userProfile) return

    const isAdminKelompokUser = isAdminKelompok(userProfile)
    const isAdminDesaUser = isAdminDesa(userProfile)
    const isTeacher = userProfile.role === 'teacher'
    const isStudent = userProfile.role === 'student'

    if (isAdminKelompokUser || isAdminDesaUser || isTeacher || isStudent) {
      router.push('/home')
    }
  }, [userProfile, router])

  // Build available tabs
  const tabs = [
    { id: 'tipe' as TabType, label: 'Tipe Pertemuan', count: activityTypes?.length || 0 },
    ...(isSuperAdminUser
      ? [{ id: 'tingkat' as TabType, label: 'Tingkat Pertemuan', count: activityLevels?.length || 0 }]
      : []),
  ]

  const isLoading = typesLoading || (activeTab === 'tingkat' && levelsLoading)
  const error = typesError || (activeTab === 'tingkat' ? levelsError : undefined)

  // Handlers
  const openCreateModal = () => {
    setEditingType(null)
    setIsTypeModalOpen(true)
  }

  const openEditTypeModal = (item: ActivityType) => {
    setEditingType(item)
    setIsTypeModalOpen(true)
  }

  const openEditLevelModal = (item: ActivityLevel) => {
    setEditingLevel(item)
    setIsLevelModalOpen(true)
  }

  const closeTypeModal = () => {
    setIsTypeModalOpen(false)
    setEditingType(null)
  }

  const closeLevelModal = () => {
    setIsLevelModalOpen(false)
    setEditingLevel(null)
  }

  const openDeleteConfirm = (item: ActivityType) => {
    setDeleteConfirm({ isOpen: true, item })
  }

  const closeDeleteConfirm = () => {
    setDeleteConfirm({ isOpen: false, item: null })
  }

  const handleDelete = async () => {
    if (!deleteConfirm.item) return
    setIsDeleting(true)
    try {
      await deleteActivityType(deleteConfirm.item.id)
      mutateTypes()
      closeDeleteConfirm()
    } catch (err) {
      console.error('Error deleting activity type:', err)
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus tipe pertemuan')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleTypeSuccess = () => {
    mutateTypes()
  }

  const handleLevelSuccess = () => {
    mutateLevels()
  }

  if (isLoading) {
    return <SuperadminTableSkeleton />
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold">Error loading data</div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto px-0 pb-28 md:pb-0 md:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Kegiatan
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                {isSuperAdminUser
                  ? 'Kelola tipe dan tingkat pertemuan'
                  : 'Kelola tipe pertemuan'}
              </p>
            </div>
            {activeTab === 'tipe' && (
              <button
                onClick={openCreateModal}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Tambah
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {tab.label}
                <span
                  className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        {activeTab === 'tipe' && (
          <ActivityTypeTable
            data={activityTypes || []}
            onEdit={openEditTypeModal}
            onDelete={openDeleteConfirm}
          />
        )}

        {activeTab === 'tingkat' && isSuperAdminUser && (
          <ActivityLevelTable
            data={activityLevels || []}
            onEdit={openEditLevelModal}
          />
        )}

        {/* Modals */}
        <ActivityTypeModal
          isOpen={isTypeModalOpen}
          onClose={closeTypeModal}
          activityType={editingType}
          onSuccess={handleTypeSuccess}
        />

        <ActivityLevelModal
          isOpen={isLevelModalOpen}
          onClose={closeLevelModal}
          activityLevel={editingLevel}
          onSuccess={handleLevelSuccess}
        />

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={deleteConfirm.isOpen}
          onClose={closeDeleteConfirm}
          onConfirm={handleDelete}
          title="Hapus Tipe Pertemuan?"
          message={`Apakah Anda yakin ingin menghapus tipe pertemuan "${deleteConfirm.item?.name}"?`}
          confirmText="Hapus"
          cancelText="Batal"
          isDestructive={true}
          isLoading={isDeleting}
        />
      </div>
    </div>
  )
}
