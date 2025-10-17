'use client'

import { useState } from 'react'
import Link from 'next/link'
import dayjs from 'dayjs'
import 'dayjs/locale/id' // Import Indonesian locale
import { updateMeeting, deleteMeeting } from '../actions'
import { toast } from 'sonner'
import ConfirmModal from '@/components/ui/modal/ConfirmModal'
import DropdownMenu from '@/components/ui/dropdown/DropdownMenu'
import CreateMeetingModal from './CreateMeetingModal'
import Spinner from '@/components/ui/spinner/Spinner'
import { ATTENDANCE_COLORS } from '@/lib/constants/colors'
import { getStatusBgColor, getStatusColor } from '@/lib/percentages'
import MeetingSkeleton from '@/components/ui/skeleton/MeetingSkeleton'
import { useUserProfile } from '@/stores/userProfileStore'
import { isSuperAdmin, isAdminDaerah, isAdminDesa } from '@/lib/userUtils'

// Set Indonesian locale
dayjs.locale('id')

// Helper function to format meeting location based on user role
const formatMeetingLocation = (meeting: any, userProfile: any) => {
  if (!meeting.classes) return ''
  
  const isSuperAdminUser = isSuperAdmin(userProfile)
  const isAdminDaerahUser = isAdminDaerah(userProfile)
  const isAdminDesaUser = isAdminDesa(userProfile)
  
  const parts: string[] = []
  
  // Superadmin: Show Daerah, Desa, Kelompok, Class
  if (isSuperAdminUser) {
    if (meeting.classes.kelompok?.desa?.daerah?.name) {
      parts.push(meeting.classes.kelompok.desa.daerah.name)
    }
    if (meeting.classes.kelompok?.desa?.name) {
      parts.push(meeting.classes.kelompok.desa.name)
    }
    if (meeting.classes.kelompok?.name) {
      parts.push(meeting.classes.kelompok.name)
    }
    parts.push(meeting.classes.name)
  }
  // Admin Daerah: Show Desa, Kelompok, Class
  else if (isAdminDaerahUser) {
    if (meeting.classes.kelompok?.desa?.name) {
      parts.push(meeting.classes.kelompok.desa.name)
    }
    if (meeting.classes.kelompok?.name) {
      parts.push(meeting.classes.kelompok.name)
    }
    parts.push(meeting.classes.name)
  }
  // Admin Desa: Show Kelompok, Class
  else if (isAdminDesaUser) {
    if (meeting.classes.kelompok?.name) {
      parts.push(meeting.classes.kelompok.name)
    }
    parts.push(meeting.classes.name)
  }
  // Teacher & Admin Kelompok: Show only Class
  else {
    parts.push(meeting.classes.name)
  }
  
  return parts.join(', ')
}

interface Meeting {
  id: string
  class_id: string
  title: string
  date: string
  topic?: string
  description?: string
  student_snapshot: string[]
  created_at: string
  classes: {
    id: string
    name: string
    kelompok_id?: string
    kelompok?: {
      id: string
      name: string
      desa_id?: string
      desa?: {
        id: string
        name: string
        daerah_id?: string
        daerah?: {
          id: string
          name: string
        }
      }
    }
  }
  attendancePercentage: number
  totalStudents: number
  presentCount: number
  absentCount: number
  sickCount: number
  excusedCount: number
}

interface MeetingListProps {
  meetings: Meeting[]
  onEdit?: (meeting: Meeting) => void
  onDelete?: (meetingId: string) => void
  className?: string
  isLoading?: boolean
}

export default function MeetingList({ 
  meetings, 
  onEdit, 
  onDelete, 
  className = '',
  isLoading = false
}: MeetingListProps) {
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [deletingMeetingId, setDeletingMeetingId] = useState<string | null>(null)
  const [loadingMeetingId, setLoadingMeetingId] = useState<string | null>(null)
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean
    meetingId: string
    meetingTitle: string
  }>({
    isOpen: false,
    meetingId: '',
    meetingTitle: ''
  })

  const { profile: userProfile } = useUserProfile()

  // Group meetings by date
  const groupedMeetings = meetings.reduce((acc, meeting) => {
    const date = dayjs(meeting.date).format('YYYY-MM-DD')
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(meeting)
    return acc
  }, {} as Record<string, Meeting[]>)

  const handleEdit = async (meeting: Meeting) => {
    if (onEdit) {
      onEdit(meeting)
    } else {
      setEditingMeeting(meeting)
      setShowEditModal(true)
    }
  }

  const handleDeleteClick = (meetingId: string, meetingTitle: string) => {
    setDeleteModal({
      isOpen: true,
      meetingId,
      meetingTitle
    })
  }

  const handleDeleteConfirm = async () => {
    setDeletingMeetingId(deleteModal.meetingId)
    try {
      const result = await deleteMeeting(deleteModal.meetingId)
      if (result.success) {
        toast.success('Pertemuan berhasil dihapus')
        if (onDelete) {
          onDelete(deleteModal.meetingId)
        }
      } else {
        toast.error('Gagal menghapus pertemuan: ' + result.error)
      }
    } catch (error) {
      console.error('Error deleting meeting:', error)
      toast.error('Terjadi kesalahan saat menghapus pertemuan')
    } finally {
      setDeletingMeetingId(null)
      setDeleteModal({
        isOpen: false,
        meetingId: '',
        meetingTitle: ''
      })
    }
  }

  const handleDeleteCancel = () => {
    setDeleteModal({
      isOpen: false,
      meetingId: '',
      meetingTitle: ''
    })
  }

  const handleMeetingClick = (meetingId: string) => {
    setLoadingMeetingId(meetingId)
    // The Link component will handle navigation
    // Loading state will be cleared when component unmounts or page changes
  }

  // Show skeleton while loading
  if (isLoading) {
    return <MeetingSkeleton />
  }

  // Show empty state only when not loading and no meetings
  if (meetings.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-gray-400 dark:text-gray-500 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Belum ada pertemuan
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Klik tombol + untuk membuat pertemuan pertama
        </p>
      </div>
    )
  }

  return (
    <>
      <div className={`space-y-6 ${className}`}>
        {Object.entries(groupedMeetings)
          .sort(([a], [b]) => b.localeCompare(a)) // Sort dates descending
          .map(([date, dateMeetings]) => (
            <div key={date}>
              {/* Date Header */}
              <div className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 py-2 mb-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {dayjs(date).format('dddd, DD MMMM YYYY')}
                </h3>
              </div>

              {/* Meetings for this date */}
              <div className="space-y-2">
                {dateMeetings.map((meeting) => (
                  <Link
                    key={meeting.id}
                    href={`/absensi/${meeting.id}`}
                    className="block"
                    onClick={() => handleMeetingClick(meeting.id)}
                  >
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer relative">
                      <div className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {meeting.title}
                              </h4>
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                {formatMeetingLocation(meeting, userProfile)}
                              </span>
                            </div>

                            {meeting.topic && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                {meeting.topic}
                              </p>
                            )}

                            <div className="flex flex-wrap gap-2 md:gap-3 text-xs">
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ATTENDANCE_COLORS.hadir }}></div>
                                <span className="text-gray-600 dark:text-gray-400">{meeting.presentCount} Hadir</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ATTENDANCE_COLORS.absen }}></div>
                                <span className="text-gray-600 dark:text-gray-400">{meeting.absentCount} Alfa</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ATTENDANCE_COLORS.izin }}></div>
                                <span className="text-gray-600 dark:text-gray-400">{meeting.excusedCount} Izin</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ATTENDANCE_COLORS.sakit }}></div>
                                <span className="text-gray-600 dark:text-gray-400">{meeting.sickCount} Sakit</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 ml-4">
                            {/* Attendance Percentage */}
                            <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBgColor(meeting.attendancePercentage)} ${getStatusColor(meeting.attendancePercentage)}`}>
                              {meeting.attendancePercentage}%
                            </div>

                            {/* Dropdown Menu */}
                            <DropdownMenu
                              items={[
                                {
                                  label: 'Edit Info',
                                  onClick: () => {
                                    setEditingMeeting(meeting)
                                    setShowEditModal(true)
                                  },
                                  icon: (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  )
                                },
                                {
                                  label: 'Hapus',
                                  variant: 'danger',
                                  onClick: () => handleDeleteClick(meeting.id, meeting.title),
                                  icon: (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  )
                                }
                              ]}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Loading Overlay */}
                      {loadingMeetingId === meeting.id && (
                        <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 rounded-lg flex items-center justify-center z-10">
                          <div className="flex flex-col items-center gap-2">
                            <Spinner size={24} />
                            <span className="text-sm text-gray-600 dark:text-gray-400">Memuat...</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Hapus Pertemuan"
        message={`Apakah Anda yakin ingin menghapus "${deleteModal.meetingTitle}"?`}
        confirmText="Hapus"
        cancelText="Batal"
        isDestructive={true}
        isLoading={deletingMeetingId === deleteModal.meetingId}
      />

      {/* Edit Modal */}
      <CreateMeetingModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setEditingMeeting(null)
        }}
        onSuccess={() => {
          onDelete?.('') // Trigger refresh
          setShowEditModal(false)
          setEditingMeeting(null)
        }}
        meeting={editingMeeting}
      />
    </>
  )
}
