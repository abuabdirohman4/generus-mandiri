import Link from 'next/link';
import type { TodayMeeting } from '../actions';
import { getMeetingTypeLabel } from '@/lib/constants/meetingTypes';

interface TodayMeetingsProps {
    meetings: TodayMeeting[];
}

export default function TodayMeetings({ meetings }: TodayMeetingsProps) {
    if (meetings.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Pertemuan Hari Ini
                </h3>
                <div className="text-center py-8">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        Tidak ada pertemuan hari ini
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Pertemuan Hari Ini
                </h3>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                    {meetings.length} pertemuan
                </span>
            </div>

            <div className="space-y-4">
                {meetings.map((meeting) => (
                    <Link
                        key={meeting.id}
                        href={`/admin/absensi/${meeting.id}`}
                        className="block border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                        <div className="flex items-start justify-between mb-2">
                            <div>
                                <h4 className="font-medium text-gray-900 dark:text-white">
                                    {meeting.class_name}
                                </h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    {meeting.title}
                                </p>
                            </div>
                            {meeting.meeting_type_code && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                    {getMeetingTypeLabel(meeting.meeting_type_code)}
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                            <div className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <span>{meeting.teacher_name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                <span>{meeting.present_count}/{meeting.total_students} hadir</span>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-3">
                            <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-gray-600 dark:text-gray-400">Kehadiran</span>
                                <span className={`font-medium ${meeting.attendance_percentage >= 80
                                        ? 'text-green-600 dark:text-green-400'
                                        : meeting.attendance_percentage >= 60
                                            ? 'text-yellow-600 dark:text-yellow-400'
                                            : 'text-red-600 dark:text-red-400'
                                    }`}>
                                    {meeting.attendance_percentage}%
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div
                                    className={`h-2 rounded-full transition-all ${meeting.attendance_percentage >= 80
                                            ? 'bg-green-500'
                                            : meeting.attendance_percentage >= 60
                                                ? 'bg-yellow-500'
                                                : 'bg-red-500'
                                        }`}
                                    style={{ width: `${meeting.attendance_percentage}%` }}
                                />
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
