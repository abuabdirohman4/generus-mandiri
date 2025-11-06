'use client'

import { Modal } from '@/components/ui/modal'
import dayjs from 'dayjs'
import type { AttendanceLog } from '@/app/(admin)/users/siswa/actions'
import MeetingTypeBadge from '@/app/(admin)/absensi/components/MeetingTypeBadge'

interface MeetingDetailModalProps {
  isOpen: boolean
  onClose: () => void
  meeting: AttendanceLog | null
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

export default function MeetingDetailModal({ isOpen, onClose, meeting }: MeetingDetailModalProps) {
  if (!meeting) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl m-4">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Detail Pertemuan
          </h2>
          {/* <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button> */}
        </div>

        <div className="space-y-4">
          {/* Meeting Title */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2 flex items-center flex-wrap">
              {meeting.meetings.meeting_type_code && (
                <MeetingTypeBadge 
                  meetingTypeCode={meeting.meetings.meeting_type_code}
                  isSambungCapable={meeting.meetings.classes?.class_master_mappings?.[0]?.class_master?.category?.is_sambung_capable}
                />
              )}
              {meeting.meetings.meeting_type_code && meeting.meetings.title ? ": " : ""}
              {meeting.meetings.title}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {dayjs(meeting.date).format('dddd, DD MMMM YYYY')}
            </p>
          </div>

          {/* Topic */}
          {meeting.meetings.topic && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Topik
              </label>
              {/* <p className="text-gray-500 dark:text-white">{meeting.meetings.topic}</p> */}
              <p className="text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                {meeting.meetings.topic}
              </p>
            </div>
          )}

          {/* Description */}
          {meeting.meetings.description && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Deskripsi
              </label>
              <p className="text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-3 rounded-lg whitespace-pre-wrap">
                {meeting.meetings.description}
              </p>
              {/* <p className="text-gray-500 dark:text-white whitespace-pre-wrap">
                {meeting.meetings.description}
              </p> */}
            </div>
          )}

          {/* Attendance Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status Kehadiran
            </label>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(meeting.status)}`}>
                {getStatusLabel(meeting.status)}
              </span>
            </div>
          </div>

          {/* Reason */}
          {meeting.reason && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Keterangan
              </label>
              <p className="text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                {meeting.reason}
              </p>
            </div>
          )}

          {/* Meeting Info */}
          {/* <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Tanggal:</span>
                <span className="ml-2 text-gray-900 dark:text-white">
                  {dayjs(meeting.date).format('DD/MM/YYYY')}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">ID Pertemuan:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-mono text-xs">
                  {meeting.meeting_id}
                </span>
              </div>
            </div>
          </div> */}
        </div>

        {/* Close Button */}
        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </Modal>
  )
}
