'use client'

import { useState } from 'react'
import Link from 'next/link'
import dayjs from 'dayjs'
import 'dayjs/locale/id' // Import Indonesian locale
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { updateMeeting, deleteMeeting } from '../actions'
import { toast } from 'sonner'
import ConfirmModal from '@/components/ui/modal/ConfirmModal'

// Set Indonesian locale
dayjs.locale('id')

interface Meeting {
  id: string
  class_id: string
  meeting_number: number
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
}

const COLORS = {
  hadir: '#10B981', // green
  izin: '#F59E0B', // yellow
  sakit: '#3B82F6', // blue
  absen: '#EF4444' // red
}

export default function MeetingCards({ 
  meetings, 
  onEdit, 
  onDelete, 
  className = '' 
}: MeetingCardsProps) {
  const [deletingMeetingId, setDeletingMeetingId] = useState<string | null>(null)
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

  const getStatusColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600 dark:text-green-400'
    if (percentage >= 60) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getStatusBgColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-100 dark:bg-green-900'
    if (percentage >= 60) return 'bg-yellow-100 dark:bg-yellow-900'
    return 'bg-red-100 dark:bg-red-900'
  }

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
          { name: 'Hadir', value: meeting.presentCount, color: COLORS.hadir },
          { name: 'Izin', value: meeting.excusedCount, color: COLORS.izin },
          { name: 'Sakit', value: meeting.sickCount, color: COLORS.sakit },
          { name: 'Absen', value: meeting.absentCount, color: COLORS.absen }
        ].filter(item => item.value > 0) // Only show categories with data

        return (
          <div
            key={meeting.id}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    Pertemuan {meeting.meeting_number}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    {dayjs(meeting.date).format('DD MMM YYYY')}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {meeting.classes[0]?.name || ''}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 ml-2">
                  <Link
                    href={`/absensi/${meeting.id}`}
                    className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    title="Input Absensi"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </Link>

                  <button
                    onClick={() => handleEdit(meeting)}
                    className="p-2 text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors"
                    title="Edit Pertemuan"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>

                  <button
                    onClick={() => handleDeleteClick(meeting.id, `Pertemuan ${meeting.meeting_number}`)}
                    disabled={deletingMeetingId === meeting.id}
                    className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                    title="Hapus Pertemuan"
                  >
                    {deletingMeetingId === meeting.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
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
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-gray-600 dark:text-gray-400">{meeting.presentCount} Hadir</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      <span className="text-gray-600 dark:text-gray-400">{meeting.absentCount} Alfa</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                      <span className="text-gray-600 dark:text-gray-400">{meeting.excusedCount} Izin</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
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
          </div>
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
  </>
  )
}
