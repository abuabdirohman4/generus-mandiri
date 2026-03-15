/**
 * Dashboard types for metrics and monitoring
 */

import type { DashboardFilters } from '../app/(admin)/dashboard/dashboardHelpers'

export type { DashboardFilters }

// ─── Core Entities ────────────────────────────────────────────────────────────

export interface ClassMonitoringData {
    class_id: string
    class_name: string
    kelompok_name?: string
    desa_name?: string
    daerah_name?: string
    has_meeting: boolean
    meeting_count: number
    attendance_rate: number
    student_count?: number
    meeting_ids?: string[]
}

/** Legacy interface - kept for backward compatibility */
export interface ClassPerformance {
    class_id: string
    class_name: string
    attendance_percentage: number
    total_meetings: number
}

export interface Dashboard {
    siswa: number
    kelas: number
    meetingsToday: number
    meetingsWeekly: number
    meetingsMonthly: number
    kehadiranHariIni: number
    kehadiranMingguan: number
    kehadiranBulanan: number
}

/** Legacy interface - kept for backward compatibility */
export interface MeetingTypeDistribution {
    type: string
    label: string
    count: number
}

export interface TodayMeeting {
    id: string
    title: string
    date: string
    class_id: string
    class_name: string
    teacher_name: string
    meeting_type_code: string | null
    total_students: number
    present_count: number
    attendance_percentage: number
}

// ─── Filters ──────────────────────────────────────────────────────────────────

export interface ClassMonitoringFilters extends DashboardFilters {
    period: 'today' | 'week' | 'month' | 'custom'
    startDate?: string
    endDate?: string
    classViewMode?: 'separated' | 'combined'
    specificDate?: string
    weekOffset?: number
    monthString?: string
}
