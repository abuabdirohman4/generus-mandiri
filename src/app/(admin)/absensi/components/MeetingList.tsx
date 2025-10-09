'use client'

import { useState } from 'react'
import Link from 'next/link'
import dayjs from 'dayjs'
import 'dayjs/locale/id' // Import Indonesian locale
import { updateMeeting, deleteMeeting } from '../actions'
import { toast } from 'sonner'

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

interface MeetingListProps {
  meetings: Meeting[]
  onEdit?: (meeting: Meeting) => void
  onDelete?: (meetingId: string) => void
  className?: string
}

export default function MeetingList({ 
  meetings, 
  onEdit, 
  onDelete, 
  className = '' 
}: MeetingListProps) {
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null)
  const [deletingMeetingId, setDeletingMeetingId] = useState<string | null>(null)

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
    }
  }

  const handleDelete = async (meetingId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus pertemuan ini?')) {
      return
    }

    setDeletingMeetingId(meetingId)
    try {
      const result = await deleteMeeting(meetingId)
      if (result.success) {
        toast.success('Pertemuan berhasil dihapus')
        if (onDelete) {
          onDelete(meetingId)
        }
      } else {
        toast.error('Gagal menghapus pertemuan: ' + result.error)
      }
    } catch (error) {
      console.error('Error deleting meeting:', error)
      toast.error('Terjadi kesalahan saat menghapus pertemuan')
    } finally {
      setDeletingMeetingId(null)
    }
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
                <div
                  key={meeting.id}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Pengajian {meeting.meeting_number}
                          </h4>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {meeting.classes[0]?.name || ''}
                          </span>
                        </div>

                        {meeting.topic && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {meeting.topic}
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          <span>
                            {meeting.presentCount} hadir, {meeting.absentCount} alfa
                          </span>
                          <span>
                            {meeting.excusedCount} izin, {meeting.sickCount} sakit
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        {/* Attendance Percentage */}
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBgColor(meeting.attendancePercentage)} ${getStatusColor(meeting.attendancePercentage)}`}>
                          {meeting.attendancePercentage}%
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
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
                            onClick={() => handleDelete(meeting.id)}
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
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  )
}
