'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/modal'
import Button from '@/components/ui/button/Button'
import { getAllActivityTypes, getTeacherActivityTypes, assignActivityTypeToTeacher, removeActivityTypeFromTeacher } from '@/app/(admin)/kegiatan/actions'
import { toast } from 'sonner'
import type { ActivityType } from '@/types/activityType'

interface TeacherActivityTypesModalProps {
  isOpen: boolean
  onClose: () => void
  teacherId: string
  teacherName: string
}

export default function TeacherActivityTypesModal({
  isOpen,
  onClose,
  teacherId,
  teacherName,
}: TeacherActivityTypesModalProps) {
  const [allTypes, setAllTypes] = useState<ActivityType[]>([])
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && teacherId) {
      loadData()
    }
  }, [isOpen, teacherId])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [types, assigned] = await Promise.all([
        getAllActivityTypes(),
        getTeacherActivityTypes(teacherId),
      ])
      setAllTypes(types || [])
      setAssignedIds(new Set(assigned.map(a => a.activity_type_id)))
    } catch (error) {
      console.error('Error loading activity types:', error)
      toast.error('Gagal memuat tipe kegiatan')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggle = async (typeId: string, currentlyAssigned: boolean) => {
    setIsSaving(typeId)
    try {
      if (currentlyAssigned) {
        await removeActivityTypeFromTeacher(teacherId, typeId)
        setAssignedIds(prev => {
          const next = new Set(prev)
          next.delete(typeId)
          return next
        })
        toast.success('Tipe kegiatan dilepas')
      } else {
        await assignActivityTypeToTeacher(teacherId, typeId)
        setAssignedIds(prev => new Set(prev).add(typeId))
        toast.success('Tipe kegiatan ditetapkan')
      }
    } catch (error) {
      console.error('Error toggling activity type:', error)
      toast.error('Gagal mengubah tipe kegiatan')
    } finally {
      setIsSaving(null)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Tipe Kegiatan — ${teacherName}`}>
      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Pilih tipe kegiatan yang dapat dibuat oleh guru ini.
            </p>
            <div className="space-y-3">
              {allTypes.map((type) => {
                const isAssigned = assignedIds.has(type.id)
                const loading = isSaving === type.id
                return (
                  <label
                    key={type.id}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={isAssigned}
                      onChange={() => handleToggle(type.id, isAssigned)}
                      disabled={loading}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {type.name}
                      {!type.is_active && (
                        <span className="ml-2 text-xs text-gray-400">(nonaktif)</span>
                      )}
                    </span>
                    {loading && (
                      <span className="text-xs text-gray-400 animate-pulse">menyimpan...</span>
                    )}
                  </label>
                )
              })}
            </div>
          </>
        )}

        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button type="button" onClick={onClose} variant="outline">
            Tutup
          </Button>
        </div>
      </div>
    </Modal>
  )
}
