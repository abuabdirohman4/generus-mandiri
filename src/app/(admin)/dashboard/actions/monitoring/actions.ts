'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { handleApiError } from '@/lib/errorUtils'
import { getCurrentUserProfile, getDataFilter } from '@/lib/accessControlServer'
import { buildFilterConditions, fetchByIds } from '../../dashboardHelpers'
import { fetchAttendanceLogsInBatches } from '@/lib/utils/batchFetching'
import type { AttendanceLog, Meeting } from '@/lib/utils/attendanceCalculation'
import type { ClassMonitoringData, ClassMonitoringFilters } from '@/types/dashboard'
import {
    fetchClassesWithOrg,
    fetchMeetingsForMonitoring,
    fetchEnrollments,
    fetchCombinedEnrollments,
} from './queries'
import {
    getDateRangeForPeriod,
    filterMeetingsForClasses,
    buildMeetingsByClass,
    buildEnrollmentsByClass,
    buildClassResult,
    combinedAggregateResult,
    deduplicateLogsForCombined,
} from './logic'

export type { ClassMonitoringData, ClassMonitoringFilters } from '@/types/dashboard'

/**
 * Get class monitoring data for the given period and filters
 */
export async function getClassMonitoring(filters: ClassMonitoringFilters): Promise<ClassMonitoringData[]> {
    try {
        const supabase = await createClient()
        const adminClient = await createAdminClient()
        const profile = await getCurrentUserProfile()
        const rlsFilter = profile ? getDataFilter(profile) : null

        const { startDate, endDate } = getDateRangeForPeriod(
            filters.period,
            filters.startDate && filters.endDate ? { start: filters.startDate, end: filters.endDate } : undefined,
            filters.specificDate,
            filters.weekOffset,
            filters.monthString
        )

        const filterConditions = await buildFilterConditions(supabase, filters, rlsFilter)
        const { classIds, studentIds, hasFilters } = filterConditions

        // Fetch classes with org hierarchy
        const classes = await fetchClassesWithOrg(supabase, hasFilters ? classIds : undefined)
        if (!classes || classes.length === 0) return []

        const allClassIds = classes.map((c: any) => c.id)

        // Fetch meetings in date range via admin client (bypass RLS timeout)
        const { data: allMeetings } = await fetchMeetingsForMonitoring(adminClient, startDate, endDate)

        // Filter only meetings involving our classes
        const meetings = filterMeetingsForClasses(allMeetings || [], allClassIds)

        // Group meetings by class
        const meetingsByClass = buildMeetingsByClass(meetings, allClassIds)

        // Fetch attendance logs in batches
        const allMeetingIds = meetings.map(m => m.id)
        let attendanceLogs: AttendanceLog[] = []

        if (allMeetingIds.length > 0) {
            const { data: logsData, error: logsError } = await fetchAttendanceLogsInBatches(supabase, allMeetingIds)
            if (logsError) {
                console.error('[DASHBOARD] Error fetching attendance logs:', logsError)
                throw logsError
            }
            attendanceLogs = logsData || []
        }

        // Fetch students to build student->kelompok map (kept for future use / compatibility)
        const uniqueStudentIds = [...new Set(attendanceLogs.map(log => (log as any).student_id).filter(Boolean))]
        if (uniqueStudentIds.length > 0) {
            await fetchByIds(supabase, 'students', 'id', uniqueStudentIds, 'id, kelompok_id')
        }

        // Build meeting map for attendance utility
        const meetingMap = new Map<string, Meeting>()
        meetings.forEach(m => meetingMap.set(m.id, m as unknown as Meeting))

        // Fetch all enrollments
        const allEnrollments = await fetchEnrollments(
            supabase,
            allClassIds,
            hasFilters && studentIds.length > 0 ? studentIds : undefined
        )
        const enrollmentsByClass = buildEnrollmentsByClass(allEnrollments)

        // Build separated mode results
        let result: ClassMonitoringData[] = classes.map((cls: any) =>
            buildClassResult(cls, meetingsByClass, enrollmentsByClass, attendanceLogs, meetingMap)
        )

        // Sort by class_name, then kelompok_name
        result.sort((a, b) => {
            const cmp = a.class_name.localeCompare(b.class_name)
            return cmp !== 0 ? cmp : (a.kelompok_name || '').localeCompare(b.kelompok_name || '')
        })

        // Combined mode: aggregate by class_name
        if (filters.classViewMode === 'combined') {
            const combinedMap = new Map<string, {
                classIds: string[]
                kelompokNames: Set<string>
                desaNames: Set<string>
                daerahNames: Set<string>
                totalStudents: number
                hasMeeting: boolean
            }>()

            result.forEach(item => {
                if (!combinedMap.has(item.class_name)) {
                    combinedMap.set(item.class_name, {
                        classIds: [],
                        kelompokNames: new Set(),
                        desaNames: new Set(),
                        daerahNames: new Set(),
                        totalStudents: 0,
                        hasMeeting: false,
                    })
                }
                const combined = combinedMap.get(item.class_name)!
                combined.classIds.push(item.class_id)
                if (item.kelompok_name) combined.kelompokNames.add(item.kelompok_name)
                if (item.desa_name) combined.desaNames.add(item.desa_name)
                if (item.daerah_name) combined.daerahNames.add(item.daerah_name)
                combined.totalStudents += item.student_count || 0
                if (item.has_meeting) combined.hasMeeting = true
            })

            result = await Promise.all(
                Array.from(combinedMap.entries()).map(async ([className, data]) => {
                    const allEnrolledStudents = new Set<string>()
                    const { data: classEnrollments } = await fetchCombinedEnrollments(supabase, data.classIds)
                    classEnrollments?.forEach((sc: any) => allEnrolledStudents.add(sc.student_id))

                    const filteredLogs = deduplicateLogsForCombined(
                        attendanceLogs,
                        meetingMap,
                        data.classIds,
                        allEnrolledStudents
                    )

                    return combinedAggregateResult(className, data, filteredLogs)
                })
            )

            result.sort((a, b) => a.class_name.localeCompare(b.class_name))
        }

        // Filter out classes with no students or no meetings
        return result.filter(item => (item.student_count ?? 0) > 0 && item.has_meeting === true)
    } catch (error) {
        console.error('Error fetching class monitoring:', error)
        throw handleApiError(error, 'memuat data', 'Failed to fetch class monitoring')
    }
}
