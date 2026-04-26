'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { handleApiError } from '@/lib/errorUtils'
import { getCurrentUserProfile, getDataFilter, getTeacherAllowedClassIds } from '@/lib/accessControlServer'
import { buildFilterConditions } from '../../dashboardHelpers'
import type { Dashboard, DashboardFilters } from '@/types/dashboard'
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

export type { Dashboard, DashboardFilters, TodayMeeting, ClassPerformance, MeetingTypeDistribution } from '@/types/dashboard'

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

        // Apply class master restriction for Guru Desa/Daerah
        let effectiveClassIds = classIds
        let effectiveStudentIds = studentIds
        
        if (
            profile?.role === 'teacher' &&
            (profile.desa_id || profile.daerah_id) &&
            !profile.kelompok_id &&
            profile.id
        ) {
            const allowedClassIdsSet = await getTeacherAllowedClassIds(profile.id, profile)

            if (allowedClassIdsSet) {
                const allowedClassIds = Array.from(allowedClassIdsSet)
                
                // 1. Filter class IDs
                if (hasFilters) {
                    effectiveClassIds = classIds.filter(id => allowedClassIdsSet.has(id))
                } else {
                    effectiveClassIds = allowedClassIds
                }
                
                // 2. Filter student IDs (if hasFilters is false, we need to get allowed students)
                if (hasFilters) {
                    effectiveStudentIds = studentIds.filter(id => {
                        // This is a bit tricky since we don't have student-to-class mapping here easily.
                        // For now, let's keep it as is if filters are applied, 
                        // as buildFilterConditions already respects RLS.
                        return true
                    })
                } else {
                    // For student count, we'll let countStudents handle it if we pass effectiveClassIds
                    // but wait, countStudents takes studentIds.
                }
            }
        }

        // Count students & classes in parallel
        const [siswaCount, kelasCount] = await Promise.all([
            countStudents(supabase, hasFilters ? effectiveStudentIds : undefined, profile?.role === 'teacher' ? effectiveClassIds : undefined),
            countClasses(supabase, (hasFilters || profile?.role === 'teacher') ? effectiveClassIds : undefined),
        ])

        // If no classes under filter, bail early
        if (hasFilters && effectiveClassIds.length === 0) {
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
            hasFilters && effectiveClassIds.length > 0 ? effectiveClassIds : undefined
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
