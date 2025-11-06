'use client'

import dayjs from 'dayjs'
import type { AttendanceLog } from '@/app/(admin)/users/siswa/actions'
import MeetingTypeBadge from '@/app/(admin)/absensi/components/MeetingTypeBadge'

interface AttendanceListProps {
  date: string
  meetings: AttendanceLog[]
  onMeetingClick: (meeting: AttendanceLog) => void
  onClose: () => void
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'H':
      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
    case 'I':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
    case 'S':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
    case 'A':
      return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'H':
      return 'Hadir'
    case 'I':
      return 'Izin'
    case 'S':
      return 'Sakit'
    case 'A':
      return 'Alfa'
    default:
      return status
  }
}

export default function AttendanceList({ date, meetings, onMeetingClick, onClose }: AttendanceListProps) {
  console.log(meetings)
  if (meetings.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Pertemuan {dayjs(date).format('DD MMMM YYYY')}
          </h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-400 transition-colors translate-x-[1rem] -translate-y-[1rem] hover:bg-gray-200 hover:text-gray-700"
            title="Tutup"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="text-center py-8">
          <div className="text-gray-400 dark:text-gray-600 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-gray-400">Tidak ada pertemuan pada tanggal ini</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Pertemuan {dayjs(date).format('DD MMMM YYYY')}
        </h3>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-400 transition-colors translate-x-[1rem] -translate-y-[1rem] hover:bg-gray-200 hover:text-gray-700"
          title="Tutup"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="space-y-3">
        {meetings.map(log => (
          <button
            key={log.id}
            onClick={() => onMeetingClick(log)}
            className="w-full text-left p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-white mb-2">
                  {log.meetings.meeting_type_code && (
                    <MeetingTypeBadge 
                      meetingTypeCode={log.meetings.meeting_type_code}
                      isSambungCapable={log.meetings.classes?.class_master_mappings?.[0]?.class_master?.category?.is_sambung_capable}
                    />
                  )}
                  {log.meetings.meeting_type_code && log.meetings.title ? ": " : ""}
                  {log.meetings.title}
                </div>
                {/* {log.meetings.topic && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {log.meetings.topic}
                  </div>
                )} */}
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(log.status)}`}>
                    {getStatusLabel(log.status)}
                  </span>
                  {log.reason && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {log.reason}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-gray-400 dark:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
