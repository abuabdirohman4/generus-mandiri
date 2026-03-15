'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import {
    calculateAttendanceStats,
    type AttendanceLog,
} from '@/lib/utils/attendanceCalculation'
import {
    fetchUserProfile,
    fetchMeetingsForDateRange,
    fetchClassHierarchyMaps,
    fetchAttendanceLogs,
    fetchStudentDetails,
    fetchKelompokNames,
    fetchMeetingsWithFullDetails,
    fetchStudentClassesForEnrollment,
} from './queries'
import {
    buildDateFilter,
    filterMeetingsByRole,
    filterAttendanceByClass,
    filterAttendanceByKelompok,
    buildClassHierarchyMaps,
    buildEnrollmentMap,
    enrichAttendanceLogs,
    aggregateStudentSummary,
    aggregateTrendData,
    formatChartData,
} from './logic'

import type { ReportFilters, ReportData } from '@/types/report'

/**
 * Get attendance report based on filters.
 * Thin orchestrator — delegates to queries (Layer 1) and logic (Layer 2).
 */
export async function getAttendanceReport(filters: ReportFilters): Promise<ReportData> {
    try {
        // 1. Auth check
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('User not authenticated')

        // 2. Fetch user profile (Layer 1)
        const { data: profile } = await fetchUserProfile(supabase, user.id)
        if (!profile) throw new Error('User profile not found')

        // 3. Get teacher class IDs
        const teacherClassIds = profile.role === 'teacher' && profile.teacher_classes
            ? profile.teacher_classes.map((tc: any) => tc.classes?.id || tc.class_id).filter(Boolean)
            : []

        // 4. Build date filter (Layer 2)
        const dateFilter = buildDateFilter(filters, new Date())

        // 5. Use admin client for queries that need to bypass RLS
        const adminClient = await createAdminClient()

        // 6. Fetch meetings for date range (Layer 1)
        const { data: meetingsForFilter } = await fetchMeetingsForDateRange(
            adminClient,
            dateFilter,
            filters.meetingType
        )

        // 7. Collect all class IDs from meetings
        const allClassIdsFromMeetings = new Set<string>()
            ; (meetingsForFilter || []).forEach((meeting: any) => {
                if (meeting.class_id) allClassIdsFromMeetings.add(meeting.class_id)
                if (meeting.class_ids && Array.isArray(meeting.class_ids)) {
                    meeting.class_ids.forEach((id: string) => allClassIdsFromMeetings.add(id))
                }
            })

        // 8. Fetch class hierarchy maps (Layer 1)
        const { data: classesForMapping } = await fetchClassHierarchyMaps(
            adminClient,
            Array.from(allClassIdsFromMeetings)
        )
        const maps = buildClassHierarchyMaps(classesForMapping || [])

        // 9. Filter meetings by role (Layer 2)
        const meetingIdsForAttendance = filterMeetingsByRole(
            meetingsForFilter || [],
            profile,
            teacherClassIds,
            maps
        )

        // 10. Fetch attendance logs in batches (Layer 1)
        const { data: attendanceLogsData, error: attendanceError } = await fetchAttendanceLogs(
            adminClient,
            meetingIdsForAttendance
        )
        if (attendanceError) throw attendanceError

        // 11. Build meeting map
        const meetingMap = new Map<string, any>()
            ; (meetingsForFilter || []).forEach((meeting: any) => meetingMap.set(meeting.id, meeting))

        // 12. Fetch student details (Layer 1)
        const studentIds = [...new Set((attendanceLogsData || []).map((log: any) => log.student_id))]
        const { data: studentsData, error: studentsError } = await fetchStudentDetails(adminClient, studentIds)
        if (studentsError) throw studentsError

        // 13. Build student map
        const studentMap = new Map<string, any>()
            ; (studentsData || []).forEach((student: any) => studentMap.set(student.id, student))

        // 14. Enrich attendance logs (Layer 2)
        let enrichedLogs = enrichAttendanceLogs(
            attendanceLogsData || [],
            studentMap,
            meetingMap
        )

        // 15. Fetch full meeting details (for final assembly + trend chart)
        const { data: meetings } = await fetchMeetingsWithFullDetails(
            adminClient,
            dateFilter,
            filters.meetingType
        )

        // 16. Enrich classKelompokMap from full meetings
        if (meetings) {
            meetings.forEach((meeting: any) => {
                if (meeting.class_id && meeting.classes?.kelompok_id) {
                    maps.classKelompokMap.set(meeting.class_id, meeting.classes.kelompok_id)
                }
            })
        }

        // 17. Enrich from student_classes
        if (studentsData) {
            studentsData.forEach((student: any) => {
                student.student_classes?.forEach((sc: any) => {
                    if (sc.classes?.id && sc.classes?.kelompok_id) {
                        maps.classKelompokMap.set(sc.classes.id, sc.classes.kelompok_id)
                    }
                })
            })
        }

        // 18. Build enrollment map for strict class filtering (Layer 2)
        const allClassIdsSet = new Set<string>()
            ; (meetings || []).forEach((meeting: any) => {
                if (meeting.class_id) allClassIdsSet.add(meeting.class_id)
                if (meeting.class_ids && Array.isArray(meeting.class_ids)) {
                    meeting.class_ids.forEach((id: string) => allClassIdsSet.add(id))
                }
            })
        const { data: studentClassesData } = await fetchStudentClassesForEnrollment(
            adminClient,
            Array.from(allClassIdsSet)
        )
        const enrollmentMap = buildEnrollmentMap(studentClassesData || [])

        // 19. Apply filters (Layer 2)
        if (filters.classId) {
            enrichedLogs = filterAttendanceByClass(enrichedLogs, filters.classId, enrollmentMap, meetingMap)
        }
        if (filters.kelompokId) {
            enrichedLogs = filterAttendanceByKelompok(enrichedLogs, filters.kelompokId, maps, meetingMap)
        }
        if (filters.gender) {
            enrichedLogs = enrichedLogs.filter((log: any) => log.students.gender === filters.gender)
        }

        // 20. Filter meetings for teacher (for trend chart)
        const meetingsToFilter = profile.role === 'teacher' && teacherClassIds.length > 0
            ? (meetings || []).filter((meeting: any) => {
                if (meeting.class_ids && Array.isArray(meeting.class_ids) && meeting.class_ids.length > 0) {
                    return meeting.class_ids.some((id: string) => teacherClassIds.includes(id))
                }
                return meeting.class_id && teacherClassIds.includes(meeting.class_id)
            })
            : meetings || []

        // 21. Apply class filter to meetings (for trend chart)
        const filteredMeetings = filters.classId
            ? meetingsToFilter.filter((meeting: any) => {
                const classIds = filters.classId!.split(',')
                if (classIds.includes(meeting.class_id)) {
                    if (filters.kelompokId) {
                        const kelompokIds = filters.kelompokId.split(',')
                        const meetingClassKelompok = maps.classKelompokMap.get(meeting.class_id)
                        if (!meetingClassKelompok || !kelompokIds.includes(meetingClassKelompok)) return false
                    }
                    return true
                }
                if (meeting.class_ids && Array.isArray(meeting.class_ids)) {
                    return meeting.class_ids.some((id: string) => {
                        if (!classIds.includes(id)) return false
                        if (filters.kelompokId) {
                            const kelompokIds = filters.kelompokId.split(',')
                            const classKelompok = maps.classKelompokMap.get(id)
                            if (!classKelompok || !kelompokIds.includes(classKelompok)) return false
                        }
                        return true
                    })
                }
                return false
            })
            : meetingsToFilter

        // 22. Aggregation (Layer 2)
        const summary = calculateAttendanceStats(enrichedLogs as AttendanceLog[])
        const chartData = formatChartData(summary)
        const trendChartData = aggregateTrendData(filteredMeetings, enrichedLogs, filters)

        // 23. Fetch kelompok names for student summary (Layer 1)
        const { data: kelompokData } = await fetchKelompokNames(adminClient)
        const kelompokMap = new Map<string, string>()
            ; (kelompokData || []).forEach((k: any) => kelompokMap.set(k.id, k.name))

        const detailedRecords = aggregateStudentSummary(enrichedLogs, kelompokMap)

        // 24. Return final report
        return {
            summary,
            chartData,
            trendChartData,
            detailedRecords,
            period: filters.period,
            dateRange: {
                start: dateFilter.date?.gte || null,
                end: dateFilter.date?.lte || dateFilter.date?.eq || null
            }
        }

    } catch (error) {
        console.error('[MEMUAT DATA] Error:', {
            message: 'Gagal memuat laporan kehadiran',
            originalError: error,
            timestamp: new Date().toISOString()
        })
        throw error
    }
}
