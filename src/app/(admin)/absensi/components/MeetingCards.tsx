'use client'

import { useState } from 'react'
import Link from 'next/link'
import dayjs from 'dayjs'
import 'dayjs/locale/id' // Import Indonesian locale
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { updateMeeting, deleteMeeting } from '../actions'
import { toast } from 'sonner'
import ConfirmModal from '@/components/ui/modal/ConfirmModal'
import DropdownMenu from '@/components/ui/dropdown/DropdownMenu'
import CreateMeetingModal from './CreateMeetingModal'
import Spinner from '@/components/ui/spinner/Spinner'
import { ATTENDANCE_COLORS } from '@/lib/constants/colors'
import { getStatusBgColor, getStatusColor } from '@/lib/percentages'
import MeetingCardSkeleton from '@/components/ui/skeleton/MeetingCardSkeleton'

// Set Indonesian locale
dayjs.locale('id')

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
  }[]
  attendancePercentage: number
  totalStudents: number
  presentCount: number
  absentCount: number
  sickCount: number
  excusedCount: number
}

interface MeetingCardsProps {
  meetings: Meeting[]
  onEdit?: (meeting: Meeting) => void
  onDelete?: (meetingId: string) => void
  className?: string
  isLoading?: boolean
}

export default function MeetingCards({ 
  meetings, 
  onEdit, 
  onDelete, 
  className = '',
  isLoading = false
}: MeetingCardsProps) {
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
    return <MeetingCardSkeleton />
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
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
        {meetings.map((meeting) => {
        // Prepare data for pie chart
        const chartData = [
          { name: 'Hadir', value: meeting.presentCount, color: ATTENDANCE_COLORS.hadir },
          { name: 'Izin', value: meeting.excusedCount, color: ATTENDANCE_COLORS.izin },
          { name: 'Sakit', value: meeting.sickCount, color: ATTENDANCE_COLORS.sakit },
          { name: 'Absen', value: meeting.absentCount, color: ATTENDANCE_COLORS.absen }
        ].filter(item => item.value > 0) // Only show categories with data

        return (
          <Link
            key={meeting.id}
            href={`/absensi/${meeting.id}`}
            className="block"
            onClick={() => handleMeetingClick(meeting.id)}
          >
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow cursor-pointer relative">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                      {meeting.title}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                      {dayjs(meeting.date).format('DD MMM YYYY')}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {meeting.classes[0]?.name || ''}
                    </p>
                  </div>

                  {/* Dropdown Menu */}
                  <div className="ml-2">
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

              {/* Topic */}
              {meeting.topic && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                  {meeting.topic}
                </p>
              )}

              {/* Chart and Stats */}
              <div className="flex items-center gap-4">
                {/* Pie Chart */}
                <div className="w-20 h-20">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={20}
                          outerRadius={35}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-full h-full rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      <span className="text-xs text-gray-500 dark:text-gray-400">-</span>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      {meeting.attendancePercentage}%
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBgColor(meeting.attendancePercentage)} ${getStatusColor(meeting.attendancePercentage)}`}>
                      Kehadiran
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
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
              </div>

              {/* Total Students */}
              <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Total: {meeting.totalStudents} siswa
                </p>
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
        )
      })}
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
