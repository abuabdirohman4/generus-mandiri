/**
 * Report types for laporan feature
 */

// ─── Request/Response ─────────────────────────────────────────────────────────

export interface ReportData {
    summary: {
        total: number
        hadir: number
        izin: number
        sakit: number
        alpha: number
    }
    chartData: Array<{ name: string; value: number }>
    trendChartData: Array<{
        date: string
        fullDate: string
        attendancePercentage: number
        presentCount: number
        absentCount: number
        excusedCount: number
        sickCount: number
        totalRecords: number
        meetingsCount: number
    }>
    detailedRecords: Array<{
        student_id: string
        student_name: string
        student_gender: string
        class_name: string
        all_classes?: Array<{ id: string; name: string }>
        kelompok_name?: string | null
        desa_name?: string | null
        daerah_name?: string | null
        total_days: number
        hadir: number
        izin: number
        sakit: number
        alpha: number
        attendance_rate: number
    }>
    meetings?: Array<{
        id: string
        title: string
        date: string
        student_snapshot: string[]
        class_id: string
        class_ids?: string[]
    }>
    period: string
    dateRange: {
        start: string | null
        end: string | null
    }
}

// ─── Filters ──────────────────────────────────────────────────────────────────

export interface ReportFilters {
    // General mode filters
    month?: number
    year?: number
    viewMode?: 'general' | 'detailed'

    // Detailed mode filters - Period-specific
    period: 'daily' | 'weekly' | 'monthly' | 'yearly'
    classId?: string
    kelompokId?: string
    gender?: string
    meetingType?: string

    // Daily filters
    startDate?: string
    endDate?: string

    // Weekly filters
    weekYear?: number
    weekMonth?: number
    startWeekNumber?: number
    endWeekNumber?: number

    // Monthly filters
    monthYear?: number
    startMonth?: number
    endMonth?: number

    // Yearly filters
    startYear?: number
    endYear?: number
}
