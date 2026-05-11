'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { getStudentInfo, getStudentAttendanceHistory, type MonthlyStats } from './students/actions'
import { getStudentMateriProgress } from '../[studentId]/actions/materi'
import { getActiveAcademicYear } from '@/app/(admin)/tahun-ajaran/actions/academic-years'
import { getSemesterMonths } from '@/app/(admin)/materi/types'
import dayjs from 'dayjs'

export interface PeriodStats {
    tuntas: number
    total: number
    percentage: number
    avgNilai: number
}

export interface StudentOverviewData {
    student: any
    attendance: {
        semester: MonthlyStats
        monthly: MonthlyStats
    }
    materi: {
        semester: PeriodStats
        monthly: PeriodStats
    }
}

export async function getStudentOverview(
    studentId: string,
    date: string // ISO date string
): Promise<StudentOverviewData> {
    const d = dayjs(date)
    const year = d.year()
    const month = d.month() + 1
    const semester = month >= 7 ? 1 : 2

    // 1. Get Student Info
    const student = await getStudentInfo(studentId)
    const activeYear = await getActiveAcademicYear()
    const academicYearId = activeYear?.id || ''

    // 2. Attendance Stats
    // Monthly
    const monthlyAttendance = await getStudentAttendanceHistory(studentId, year, month)
    
    // Semester (Need to fetch all months in semester)
    const months = getSemesterMonths(semester as 1 | 2)
    const startDate = `${semester === 1 ? year : year - 1}-${months[0].toString().padStart(2, '0')}-01`
    const lastDay = new Date(semester === 2 ? year : year, months[5], 0).getDate()
    const endDate = `${semester === 2 ? year : year}-${months[5].toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`

    // We can't easily use getStudentAttendanceHistory for range, but we can query directly
    const supabase = await createAdminClient()
    const { data: semesterLogs } = await supabase
        .from('attendance_logs')
        .select('status')
        .eq('student_id', studentId)
        .gte('date', startDate)
        .lte('date', endDate)

    const semesterAttendance: MonthlyStats = {
        total: semesterLogs?.length || 0,
        hadir: semesterLogs?.filter(l => l.status === 'H').length || 0,
        izin: semesterLogs?.filter(l => l.status === 'I').length || 0,
        sakit: semesterLogs?.filter(l => l.status === 'S').length || 0,
        absen: semesterLogs?.filter(l => l.status === 'A').length || 0,
    }

    // 3. Materi Stats
    const materiProgress = await getStudentMateriProgress(studentId, academicYearId, semester)
    
    // Semester Materi
    const semesterMateri: PeriodStats = {
        tuntas: materiProgress.totalTuntas,
        total: materiProgress.totalItems,
        percentage: materiProgress.totalItems > 0 ? Math.round((materiProgress.totalTuntas / materiProgress.totalItems) * 100) : 0,
        avgNilai: materiProgress.allProgress.length > 0 
            ? Math.round(materiProgress.allProgress.filter(i => (i.nilai || 0) > 0).reduce((acc, curr) => acc + (curr.nilai || 0), 0) / 
              (materiProgress.allProgress.filter(i => (i.nilai || 0) > 0).length || 1))
            : 0
    }

    // Monthly Materi
    const monthlyItems = materiProgress.allProgress.filter(item => item.months.includes(month))
    const monthlyTuntas = monthlyItems.filter(i => i.nilai !== null && i.nilai >= 70).length
    const monthlyMateri: PeriodStats = {
        tuntas: monthlyTuntas,
        total: monthlyItems.length,
        percentage: monthlyItems.length > 0 ? Math.round((monthlyTuntas / monthlyItems.length) * 100) : 0,
        avgNilai: monthlyItems.length > 0
            ? Math.round(monthlyItems.filter(i => (i.nilai || 0) > 0).reduce((acc, curr) => acc + (curr.nilai || 0), 0) /
              (monthlyItems.filter(i => (i.nilai || 0) > 0).length || 1))
            : 0
    }

    return {
        student,
        attendance: {
            semester: semesterAttendance,
            monthly: monthlyAttendance.stats
        },
        materi: {
            semester: semesterMateri,
            monthly: monthlyMateri
        }
    }
}
