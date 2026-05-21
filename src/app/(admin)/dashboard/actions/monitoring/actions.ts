'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { handleApiError } from '@/lib/errorUtils'
import { getCurrentUserProfile, getDataFilter, getTeacherAllowedClassIds } from '@/lib/accessControlServer'
import { buildFilterConditions } from '../../dashboardHelpers'
import { fetchAttendanceLogsInBatches } from '@/lib/utils/batchFetching'
import type { AttendanceLog, Meeting } from '@/lib/utils/attendanceCalculation'
import type { ClassMonitoringData, ClassMonitoringFilters } from '@/types/dashboard'
import {
    fetchClassesWithOrg,
    fetchMeetingsForMonitoring,
    fetchEnrollments,
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
export async function getClassMonitoring(filters: ClassMonitoringFilters) {
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

        const effectiveRlsFilter = profile?.role === 'teacher' ? null : rlsFilter
        const filterConditions = await buildFilterConditions(supabase, filters, effectiveRlsFilter)
        const { classIds, studentIds, hasFilters } = filterConditions

        let effectiveClassIds = classIds
        if (profile?.role === 'teacher') {
            const allowedClassIdsSet = await getTeacherAllowedClassIds(profile.id, profile)
            if (allowedClassIdsSet) {
                if (hasFilters) {
                    effectiveClassIds = classIds.filter(id => allowedClassIdsSet.has(id))
                } else {
                    effectiveClassIds = Array.from(allowedClassIdsSet)
                }
            }
        }

        const classes = await fetchClassesWithOrg(supabase, (hasFilters || (profile?.role === 'teacher' && effectiveClassIds.length > 0)) ? effectiveClassIds : undefined)
        if (!classes || classes.length === 0) return { success: true, data: [] }

        const allClassIds = classes.map((c: any) => c.id)

        const { data: allMeetings } = await fetchMeetingsForMonitoring(adminClient, startDate, endDate)

        const meetings = filterMeetingsForClasses(allMeetings || [], allClassIds)
        const meetingsByClass = buildMeetingsByClass(meetings, allClassIds)

        const allMeetingIds = meetings.map(m => m.id)
        let attendanceLogs: AttendanceLog[] = []

        if (allMeetingIds.length > 0) {
            const { data: logsData, error: logsError } = await fetchAttendanceLogsInBatches(supabase, allMeetingIds)
            if (logsError) throw logsError
            attendanceLogs = logsData || []
        }

        const meetingMap = new Map<string, Meeting>()
        meetings.forEach(m => meetingMap.set(m.id, m as unknown as Meeting))

        const allEnrollments = await fetchEnrollments(
            supabase,
            allClassIds,
            hasFilters && studentIds.length > 0 ? studentIds : undefined
        )
        const enrollmentsByClass = buildEnrollmentsByClass(allEnrollments)

        let result: ClassMonitoringData[] = classes.map((cls: any) =>
            buildClassResult(cls, meetingsByClass, enrollmentsByClass, attendanceLogs, meetingMap)
        )

        result.sort((a, b) => {
            const cmp = a.class_name.localeCompare(b.class_name)
            return cmp !== 0 ? cmp : (a.kelompok_name || '').localeCompare(b.kelompok_name || '')
        })

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

            result = Array.from(combinedMap.entries()).map(([className, data]) => {
                const allEnrolledStudents = new Set<string>()
                data.classIds.forEach(classId => {
                    const enrolled = enrollmentsByClass.get(classId)
                    if (enrolled) enrolled.forEach(sid => allEnrolledStudents.add(sid))
                })

                const filteredLogs = deduplicateLogsForCombined(
                    attendanceLogs,
                    meetingMap,
                    data.classIds,
                    allEnrolledStudents
                )

                return combinedAggregateResult(className, { ...data, totalStudents: allEnrolledStudents.size }, filteredLogs)
            })

            result.sort((a, b) => a.class_name.localeCompare(b.class_name))
        }

        const filteredResult = result.filter(item => (item.student_count ?? 0) > 0)
        return { success: true, data: filteredResult }
    } catch (error) {
        const errorInfo = handleApiError(error, 'memuat data', 'Gagal memuat monitoring kelas')
        return { success: false, message: errorInfo.message, data: [] }
    }
}
