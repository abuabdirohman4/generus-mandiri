'use client'

import { useState } from 'react'
import Link from 'next/link'
import dayjs from 'dayjs'
import 'dayjs/locale/id' // Import Indonesian locale
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { updateMeeting, deleteMeeting } from '../actions'
import { toast } from 'sonner'
import ConfirmModal from '@/components/ui/modal/ConfirmModal'
import DropdownMenu from '@/components/ui/dropdown/DropdownMenu'
import CreateMeetingModal from './CreateMeetingModal'
import Spinner from '@/components/ui/spinner/Spinner'

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

interface MeetingChartProps {
  meetings: Meeting[]
  onEdit?: (meeting: Meeting) => void
  onDelete?: (meetingId: string) => void
  className?: string
}

type ChartType = 'line' | 'bar'

export default function MeetingChart({ 
  meetings, 
  onEdit, 
  onDelete, 
  className = '' 
}: MeetingChartProps) {
  const [chartType, setChartType] = useState<ChartType>('line')
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

  // Prepare chart data
  const chartData = meetings
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((meeting) => ({
      id: meeting.id,
      title: meeting.title,
      date: dayjs(meeting.date).format('DD/MM'),
      fullDate: dayjs(meeting.date).format('DD MMM YYYY'),
      attendancePercentage: meeting.attendancePercentage,
      presentCount: meeting.presentCount,
      absentCount: meeting.absentCount,
      excusedCount: meeting.excusedCount,
      sickCount: meeting.sickCount,
      totalStudents: meeting.totalStudents,
      topic: meeting.topic,
      classes: meeting.classes[0]?.name || ''
    }))

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 dark:text-white">
            {data.title}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            {data.fullDate}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            {data.classes}
          </p>
          {data.topic && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {data.topic}
            </p>
          )}
          <div className="space-y-1">
            <p className="text-sm">
              <span className="font-medium text-blue-600 dark:text-blue-400">
                {data.attendancePercentage}%
              </span> kehadiran
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {data.presentCount} hadir, {data.absentCount} alfa
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {data.excusedCount} izin, {data.sickCount} sakit
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  if (meetings.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-gray-400 dark:text-gray-500 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
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
      {/* Chart Controls */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Tren Kehadiran
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setChartType('line')}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              chartType === 'line'
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Garis
          </button>
          <button
            onClick={() => setChartType('bar')}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              chartType === 'bar'
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Batang
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'line' ? (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickLine={{ stroke: '#6B7280' }}
                />
                <YAxis 
                  domain={[0, 100]}
                  tick={{ fontSize: 12 }}
                  tickLine={{ stroke: '#6B7280' }}
                  label={{ value: 'Persentase (%)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="attendancePercentage"
                  stroke="#3B82F6"
                  strokeWidth={3}
                  dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
                />
              </LineChart>
            ) : (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickLine={{ stroke: '#6B7280' }}
                />
                <YAxis 
                  domain={[0, 100]}
                  tick={{ fontSize: 12 }}
                  tickLine={{ stroke: '#6B7280' }}
                  label={{ value: 'Persentase (%)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="attendancePercentage"
                  fill="#3B82F6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Meeting List */}
      <div className="space-y-3">
        <h4 className="text-md font-semibold text-gray-900 dark:text-white">
          Detail Pertemuan
        </h4>
        <div className="space-y-2">
          {chartData.map((meeting) => (
            <Link
              key={meeting.id}
              href={`/absensi/${meeting.id}`}
              className="block"
              onClick={() => handleMeetingClick(meeting.id)}
            >
              <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer relative">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {meeting.attendancePercentage}%
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Kehadiran
                    </div>
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-900 dark:text-white">
                      {meeting.title}
                    </h5>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {meeting.fullDate} • {meeting.classes}
                    </p>
                    {meeting.topic && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {meeting.topic}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <DropdownMenu
                    items={[
                      {
                        label: 'Edit Info',
                        onClick: () => {
                          setEditingMeeting(meetings.find(m => m.id === meeting.id)!)
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

                {/* Loading Overlay */}
                {loadingMeetingId === meeting.id && (
                  <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 rounded-lg flex items-center justify-center z-10">
                    <div className="flex flex-col items-center gap-2">
                      <Spinner size={20} />
                      <span className="text-xs text-gray-600 dark:text-gray-400">Memuat...</span>
                    </div>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
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
    </div>
  )
}
