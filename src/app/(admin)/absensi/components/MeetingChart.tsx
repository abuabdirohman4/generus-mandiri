'use client'

import { useState } from 'react'
import Link from 'next/link'
import dayjs from 'dayjs'
import 'dayjs/locale/id' // Import Indonesian locale
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
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
  const [deletingMeetingId, setDeletingMeetingId] = useState<string | null>(null)

  const handleEdit = async (meeting: Meeting) => {
    if (onEdit) {
      onEdit(meeting)
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

  // Prepare chart data
  const chartData = meetings
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((meeting) => ({
      id: meeting.id,
      meetingNumber: meeting.meeting_number,
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
            Pertemuan {data.meetingNumber}
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
            <div
              key={meeting.id}
              className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
            >
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
                    Pertemuan {meeting.meetingNumber}
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
                  onClick={() => handleEdit(meetings.find(m => m.id === meeting.id)!)}
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
          ))}
        </div>
      </div>
    </div>
  )
}
