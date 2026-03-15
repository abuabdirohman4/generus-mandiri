/**
 * Monitoring Logic (Layer 2)
 *
 * Pure business logic for class monitoring (getClassMonitoring).
 * NO 'use server' directive. No database access. No side effects.
 */

import type { AttendanceLog, Meeting } from '@/lib/utils/attendanceCalculation'
import { filterAttendanceForClass, calculateAttendanceRate } from '@/lib/utils/attendanceCalculation'
import type { ClassMonitoringData } from '@/types/dashboard'

/**
 * Get date range for a given period selector
 */
export function getDateRangeForPeriod(
    period: 'today' | 'week' | 'month' | 'custom',
    customRange?: { start: string; end: string },
    specificDate?: string,
    weekOffset?: number,
    monthString?: string
): { startDate: string; endDate: string } {
    const jakartaDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
    const today = jakartaDate.toISOString().split('T')[0]

    if (period === 'custom' && customRange) {
        return { startDate: customRange.start, endDate: customRange.end }
    }

    if (period === 'today') {
        const targetDate = specificDate || today
        return { startDate: targetDate, endDate: targetDate }
    }

    if (period === 'week') {
        const offset = weekOffset ?? 0
        const targetDate = new Date(jakartaDate)
        targetDate.setDate(targetDate.getDate() - offset * 7)

        const dayOfWeek = targetDate.getDay()
        const diff = targetDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
        const weekStart = new Date(targetDate)
        weekStart.setDate(diff)

        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)

        return {
            startDate: weekStart.toISOString().split('T')[0],
            endDate: weekEnd.toISOString().split('T')[0],
        }
    }

    if (period === 'month' && monthString) {
        const [year, month] = monthString.split('-').map(Number)
        const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
        const lastDayOfMonth = new Date(year, month, 0).getDate()
        const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`
        return { startDate: monthStart, endDate: monthEnd }
    }

    // Default: last 30 days
    const monthAgo = new Date(jakartaDate)
    monthAgo.setDate(monthAgo.getDate() - 30)
    return { startDate: monthAgo.toISOString().split('T')[0], endDate: today }
}

/**
 * Build a map of classId -> Set<meetingId> from meetings data
 * Handles multi-class meetings (class_ids array)
 */
export function buildMeetingsByClass(
    meetings: Array<{ id: string; class_id: string | null; class_ids?: string[] | null }>,
    allowedClassIds: string[]
): Map<string, Set<string>> {
    const meetingsByClass = new Map<string, Set<string>>()

    meetings.forEach(meeting => {
        const involvedClassIds = new Set<string>()
        if (meeting.class_id) involvedClassIds.add(meeting.class_id)
        if (meeting.class_ids && Array.isArray(meeting.class_ids)) {
            meeting.class_ids.forEach(id => involvedClassIds.add(id))
        }

        involvedClassIds.forEach(classId => {
            if (allowedClassIds.includes(classId)) {
                if (!meetingsByClass.has(classId)) meetingsByClass.set(classId, new Set())
                meetingsByClass.get(classId)!.add(meeting.id)
            }
        })
    })

    return meetingsByClass
}

/**
 * Filter meetings to only those involving given class IDs
 */
export function filterMeetingsForClasses(
    meetings: Array<{ id: string; class_id: string | null; class_ids?: string[] | null }>,
    classIds: string[]
) {
    return meetings.filter(meeting => {
        if (meeting.class_id && classIds.includes(meeting.class_id)) return true
        if (meeting.class_ids && Array.isArray(meeting.class_ids)) {
            return meeting.class_ids.some(id => classIds.includes(id))
        }
        return false
    })
}

/**
 * Build enrollment map: classId -> Set<studentId>
 */
export function buildEnrollmentsByClass(enrollments: Array<{ class_id: string; student_id: string }>): Map<string, Set<string>> {
    const map = new Map<string, Set<string>>()
    enrollments.forEach(e => {
        if (!map.has(e.class_id)) map.set(e.class_id, new Set())
        map.get(e.class_id)!.add(e.student_id)
    })
    return map
}

/**
 * Extract org hierarchy names from a class row
 */
export function extractOrgNames(cls: any): { kelompok_name?: string; desa_name?: string; daerah_name?: string } {
    const kelompokData = Array.isArray(cls.kelompok) ? cls.kelompok[0] : cls.kelompok
    const desaData = kelompokData?.desa
        ? Array.isArray(kelompokData.desa) ? kelompokData.desa[0] : kelompokData.desa
        : null
    const daerahData = desaData?.daerah
        ? Array.isArray(desaData.daerah) ? desaData.daerah[0] : desaData.daerah
        : null

    return {
        kelompok_name: kelompokData?.name,
        desa_name: desaData?.name,
        daerah_name: daerahData?.name,
    }
}

/**
 * Build ClassMonitoringData for a single class in separated mode
 */
export function buildClassResult(
    cls: any,
    meetingsByClass: Map<string, Set<string>>,
    enrollmentsByClass: Map<string, Set<string>>,
    attendanceLogs: AttendanceLog[],
    meetingMap: Map<string, Meeting>
): ClassMonitoringData {
    const orgNames = extractOrgNames(cls)
    const classMeetingIdsSet = meetingsByClass.get(cls.id) || new Set<string>()
    const enrolledStudents = enrollmentsByClass.get(cls.id) || new Set<string>()
    const studentCount = enrolledStudents.size

    if (classMeetingIdsSet.size === 0) {
        return {
            class_id: cls.id,
            class_name: cls.name,
            ...orgNames,
            has_meeting: false,
            meeting_count: 0,
            attendance_rate: 0,
            student_count: studentCount,
            meeting_ids: [],
        }
    }

    const filteredLogs = filterAttendanceForClass(attendanceLogs, meetingMap, cls.id, enrolledStudents)
    const meetingsWithLogs = new Set(filteredLogs.map(log => log.meeting_id))
    const attendanceRate = calculateAttendanceRate(filteredLogs)

    return {
        class_id: cls.id,
        class_name: cls.name,
        ...orgNames,
        has_meeting: true,
        meeting_count: meetingsWithLogs.size,
        attendance_rate: attendanceRate,
        student_count: studentCount,
        meeting_ids: Array.from(meetingsWithLogs),
    }
}

/**
 * Combine ClassMonitoringData rows by class_name (for combined view mode)
 * Returns aggregated data without DB access needed (enrollment passed in)
 */
export function combinedAggregateResult(
    className: string,
    data: {
        classIds: string[]
        kelompokNames: Set<string>
        desaNames: Set<string>
        daerahNames: Set<string>
        totalStudents: number
        hasMeeting: boolean
    },
    filteredLogs: AttendanceLog[]
): ClassMonitoringData {
    const meetingsWithLogs = new Set(filteredLogs.map(log => log.meeting_id))
    const attendanceRate = calculateAttendanceRate(filteredLogs)

    return {
        class_id: data.classIds.join(','),
        class_name: className,
        kelompok_name: Array.from(data.kelompokNames).sort().join(', '),
        desa_name: Array.from(data.desaNames).sort().join(', '),
        daerah_name: Array.from(data.daerahNames).sort().join(', '),
        has_meeting: data.hasMeeting,
        meeting_count: meetingsWithLogs.size,
        attendance_rate: attendanceRate,
        student_count: data.totalStudents,
        meeting_ids: Array.from(meetingsWithLogs),
    }
}

/**
 * Deduplicate attendance logs across multiple classIds for combined mode
 */
export function deduplicateLogsForCombined(
    attendanceLogs: AttendanceLog[],
    meetingMap: Map<string, Meeting>,
    classIds: string[],
    allEnrolledStudents: Set<string>
): AttendanceLog[] {
    const processedLogs = new Set<string>()
    const filteredLogs: AttendanceLog[] = []

    for (const classId of classIds) {
        const classLogs = filterAttendanceForClass(attendanceLogs, meetingMap, classId, allEnrolledStudents)
        classLogs.forEach(log => {
            const logKey = `${log.meeting_id}-${log.student_id}`
            if (!processedLogs.has(logKey)) {
                processedLogs.add(logKey)
                filteredLogs.push(log)
            }
        })
    }

    return filteredLogs
}
