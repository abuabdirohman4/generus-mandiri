'use server'

import { createClient } from '@/lib/supabase/server'
import { handleApiError } from '@/lib/errorUtils'
import { getCurrentUserProfile, getDataFilter } from '@/lib/accessControlServer'
import { buildFilterConditions } from '../../dashboardHelpers'
import type { Dashboard, DashboardFilters } from '../types'
import {
    countStudents,
    countClasses,
    fetchMeetingsForOverview,
    fetchAttendanceLogsForOverview,
} from './queries'
import {
    getJakartaDateStrings,
    countMeetingsByPeriod,
    calcAttendanceRate,
    sliceAttendanceByPeriod,
} from './logic'

export type { Dashboard, DashboardFilters, TodayMeeting, ClassPerformance, MeetingTypeDistribution } from '../types'

/**
 * Get dashboard overview statistics
 */
export async function getDashboard(filters?: DashboardFilters): Promise<Dashboard> {
    try {
        const supabase = await createClient()
        const profile = await getCurrentUserProfile()
        const rlsFilter = profile ? getDataFilter(profile) : null

        const { today, weekAgoStr, monthAgoStr } = getJakartaDateStrings()

        const filterConditions = await buildFilterConditions(supabase, filters, rlsFilter)
        const { classIds, studentIds, hasFilters } = filterConditions

        // Count students & classes in parallel
        const [siswaCount, kelasCount] = await Promise.all([
            countStudents(supabase, hasFilters ? studentIds : undefined),
            countClasses(supabase, hasFilters ? classIds : undefined),
        ])

        // If no classes under filter, bail early
        if (hasFilters && classIds.length === 0) {
            return {
                siswa: siswaCount,
                kelas: kelasCount,
                meetingsToday: 0,
                meetingsWeekly: 0,
                meetingsMonthly: 0,
                kehadiranHariIni: 0,
                kehadiranMingguan: 0,
                kehadiranBulanan: 0,
            }
        }

        // Fetch meetings
        const { data: allMeetingsData } = await fetchMeetingsForOverview(
            supabase,
            hasFilters && classIds.length > 0 ? classIds : undefined
        )

        const meetingPeriods = countMeetingsByPeriod(
            allMeetingsData || [],
            today,
            weekAgoStr,
            monthAgoStr
        )

        // If no students under filter, bail early
        if (hasFilters && studentIds.length === 0) {
            return {
                siswa: siswaCount,
                kelas: kelasCount,
                ...meetingPeriods,
                kehadiranHariIni: 0,
                kehadiranMingguan: 0,
                kehadiranBulanan: 0,
            }
        }

        // Fetch attendance logs
        const attendanceData = await fetchAttendanceLogsForOverview(
            supabase,
            monthAgoStr,
            hasFilters ? studentIds : undefined
        )

        const { todayLogs, weekLogs, monthLogs } = sliceAttendanceByPeriod(
            attendanceData,
            today,
            weekAgoStr
        )

        return {
            siswa: siswaCount,
            kelas: kelasCount,
            ...meetingPeriods,
            kehadiranHariIni: calcAttendanceRate(todayLogs),
            kehadiranMingguan: calcAttendanceRate(weekLogs),
            kehadiranBulanan: calcAttendanceRate(monthLogs),
        }
    } catch (error) {
        console.error('Error fetching dashboard stats:', error)
        throw handleApiError(error, 'memuat data', 'Failed to fetch dashboard statistics')
    }
}
