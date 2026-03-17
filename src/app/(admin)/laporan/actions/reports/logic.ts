/**
 * Report Logic (Layer 2)
 *
 * Pure business logic for attendance reports.
 * NO 'use server' directive - 100% testable pure functions.
 * No database access, no side effects.
 */

import type { ReportFilters } from '@/types/report'

// ─── Date Helpers ─────────────────────────────────────────────────────────────

/**
 * Helper function to get week start date
 */
export function getWeekStartDate(year: number, month: number, weekNumber: number): string {
    const firstDay = new Date(year, month - 1, 1)
    const firstWeekDays = 7 - firstDay.getDay() + 1 // Days in first week

    if (weekNumber === 1) {
        return firstDay.toISOString().split('T')[0]
    }

    const startDay = firstWeekDays + (weekNumber - 2) * 7
    const startDate = new Date(year, month - 1, startDay)
    return startDate.toISOString().split('T')[0]
}

/**
 * Helper function to get week end date
 */
export function getWeekEndDate(year: number, month: number, weekNumber: number): string {
    const firstDay = new Date(year, month - 1, 1)
    const firstWeekDays = 7 - firstDay.getDay() + 1 // Days in first week

    if (weekNumber === 1) {
        const endDay = firstWeekDays
        const endDate = new Date(year, month - 1, endDay)
        return endDate.toISOString().split('T')[0]
    }

    const startDay = firstWeekDays + (weekNumber - 2) * 7
    const endDay = Math.min(startDay + 6, new Date(year, month, 0).getDate())
    const endDate = new Date(year, month - 1, endDay)
    return endDate.toISOString().split('T')[0]
}

/**
 * Helper function to get week number in month
 */
export function getWeekNumberInMonth(date: Date): number {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1)
    const firstWeekDays = 7 - firstDay.getDay() + 1 // Days in first week
    const dayOfMonth = date.getDate()

    if (dayOfMonth <= firstWeekDays) {
        return 1
    }

    const remainingDays = dayOfMonth - firstWeekDays
    return Math.ceil(remainingDays / 7) + 1
}

// ─── Date Filter Builder ──────────────────────────────────────────────────────

/**
 * Build date filter object based on view mode and period
 */
export function buildDateFilter(
    filters: ReportFilters,
    now: Date
): {
    date?: {
        eq?: string
        gte?: string
        lte?: string
    }
} {
    let dateFilter: {
        date?: {
            eq?: string
            gte?: string
            lte?: string
        }
    } = {}

    if (filters.viewMode === 'general' && filters.month && filters.year) {
        const startDate = new Date(filters.year, filters.month - 1, 1)
        const endDate = new Date(filters.year, filters.month, 0) // Last day of the month
        dateFilter = {
            date: {
                gte: startDate.toISOString().split('T')[0],
                lte: endDate.toISOString().split('T')[0]
            }
        }
    } else {
        switch (filters.period) {
            case 'daily':
                if (filters.startDate && filters.endDate) {
                    dateFilter = {
                        date: { gte: filters.startDate, lte: filters.endDate }
                    }
                } else {
                    dateFilter = { date: { eq: now.toISOString().split('T')[0] } }
                }
                break

            case 'weekly':
                if (filters.weekYear && filters.weekMonth && filters.startWeekNumber && filters.endWeekNumber) {
                    const startDate = getWeekStartDate(filters.weekYear, filters.weekMonth, filters.startWeekNumber)
                    const endDate = getWeekEndDate(filters.weekYear, filters.weekMonth, filters.endWeekNumber)
                    dateFilter = { date: { gte: startDate, lte: endDate } }
                } else {
                    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
                    dateFilter = {
                        date: {
                            gte: weekAgo.toISOString().split('T')[0],
                            lte: now.toISOString().split('T')[0]
                        }
                    }
                }
                break

            case 'monthly':
                if (filters.monthYear && filters.startMonth && filters.endMonth) {
                    const startDate = new Date(filters.monthYear, filters.startMonth - 1, 1)
                    const endDate = new Date(filters.monthYear, filters.endMonth, 0) // Last day of end month
                    dateFilter = {
                        date: {
                            gte: startDate.toISOString().split('T')[0],
                            lte: endDate.toISOString().split('T')[0]
                        }
                    }
                } else {
                    const currentMonth = now.getMonth() + 1
                    const currentYear = now.getFullYear()
                    const startDate = new Date(currentYear, currentMonth - 1, 1)
                    const endDate = new Date(currentYear, currentMonth, 0)
                    dateFilter = {
                        date: {
                            gte: startDate.toISOString().split('T')[0],
                            lte: endDate.toISOString().split('T')[0]
                        }
                    }
                }
                break

            case 'yearly':
                if (filters.startYear && filters.endYear) {
                    const startDate = new Date(filters.startYear, 0, 1)
                    const endDate = new Date(filters.endYear, 11, 31)
                    dateFilter = {
                        date: {
                            gte: startDate.toISOString().split('T')[0],
                            lte: endDate.toISOString().split('T')[0]
                        }
                    }
                } else {
                    const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
                    dateFilter = {
                        date: {
                            gte: yearAgo.toISOString().split('T')[0],
                            lte: now.toISOString().split('T')[0]
                        }
                    }
                }
                break
        }
    }

    return dateFilter
}

// ─── Map Builders ─────────────────────────────────────────────────────────────

/**
 * Build lookup maps for class organizational hierarchy
 */
export function buildClassHierarchyMaps(classesData: any[]) {
    const classKelompokMap = new Map<string, string>()
    const classToDesaMap = new Map<string, string>()
    const classToDaerahMap = new Map<string, string>()

    if (classesData) {
        classesData.forEach((cls: any) => {
            if (cls.kelompok_id) {
                classKelompokMap.set(cls.id, cls.kelompok_id)
            }

            const kelompok = Array.isArray(cls.kelompok) ? cls.kelompok[0] : cls.kelompok
            if (kelompok?.desa_id) {
                classToDesaMap.set(cls.id, kelompok.desa_id)

                const desa = Array.isArray(kelompok.desa) ? kelompok.desa[0] : kelompok.desa
                if (desa?.daerah_id) {
                    classToDaerahMap.set(cls.id, desa.daerah_id)
                }
            }
        })
    }

    return { classKelompokMap, classToDesaMap, classToDaerahMap }
}

/**
 * Build enrollment mapping: class+kelompok → enrolled students.
 * CRITICAL: Handles null kelompok_id by using 'null' string as key.
 */
export function buildEnrollmentMap(studentClassesData: any[]) {
    const classStudentsByKelompok = new Map<string, Map<string, Set<string>>>()

    if (studentClassesData) {
        studentClassesData.forEach((sc: any) => {
            const classId = sc.class_id
            const studentId = sc.student_id
            const kelompokId = sc.students?.kelompok_id || 'null'

            if (classId && studentId) {
                if (!classStudentsByKelompok.has(classId)) {
                    classStudentsByKelompok.set(classId, new Map())
                }
                const kelompokMap = classStudentsByKelompok.get(classId)!
                if (!kelompokMap.has(kelompokId)) {
                    kelompokMap.set(kelompokId, new Set())
                }
                kelompokMap.get(kelompokId)!.add(studentId)
            }
        })
    }

    return classStudentsByKelompok
}

// ─── Log Enrichment ───────────────────────────────────────────────────────────

/**
 * Enrich attendance logs with student and meeting data
 */
export function enrichAttendanceLogs(
    logsData: any[],
    studentMap: Map<string, any>,
    meetingMap: Map<string, any>
) {
    return (logsData || [])
        .map((log: any) => {
            const meeting = meetingMap.get(log.meeting_id)
            return {
                id: log.meeting_id + '-' + log.student_id,
                student_id: log.student_id,
                meeting_id: log.meeting_id,
                date: meeting?.date || null,
                status: log.status,
                reason: null,
                students: studentMap.get(log.student_id)
            }
        })
        .filter((log: any) => log.students && log.date)
}

// ─── Permission Filters ───────────────────────────────────────────────────────

/**
 * Filter meetings based on user role and organizational scope.
 * Returns array of meeting IDs the user is allowed to see.
 */
export function filterMeetingsByRole(
    meetings: any[],
    profile: any,
    teacherClassIds: string[],
    maps: {
        classKelompokMap: Map<string, string>
        classToDesaMap: Map<string, string>
        classToDaerahMap: Map<string, string>
    }
): string[] {
    if (profile.role === 'teacher') {
        const teacherMeetings = (meetings || []).filter((meeting: any) => {
            const meetingClassIds = meeting.class_ids || [meeting.class_id]

            if (teacherClassIds.length > 0 && meetingClassIds.some((id: string) => teacherClassIds.includes(id))) {
                return true
            }

            if (profile.kelompok_id) {
                return false
            } else if (profile.desa_id) {
                return meetingClassIds.some((classId: string) => maps.classToDesaMap.get(classId) === profile.desa_id)
            } else if (profile.daerah_id) {
                return meetingClassIds.some((classId: string) => maps.classToDaerahMap.get(classId) === profile.daerah_id)
            }

            return false
        })

        return teacherMeetings.map((m: any) => m.id)

    } else if (profile.role === 'admin') {
        let filteredMeetings = meetings || []

        if (profile.kelompok_id) {
            filteredMeetings = filteredMeetings.filter((meeting: any) => {
                const meetingClassIds = meeting.class_ids || [meeting.class_id]
                return meetingClassIds.some((classId: string) => maps.classKelompokMap.get(classId) === profile.kelompok_id)
            })
        } else if (profile.desa_id) {
            filteredMeetings = filteredMeetings.filter((meeting: any) => {
                const meetingClassIds = meeting.class_ids || [meeting.class_id]
                return meetingClassIds.some((classId: string) => maps.classToDesaMap.get(classId) === profile.desa_id)
            })
        } else if (profile.daerah_id) {
            filteredMeetings = filteredMeetings.filter((meeting: any) => {
                const meetingClassIds = meeting.class_ids || [meeting.class_id]
                return meetingClassIds.some((classId: string) => maps.classToDaerahMap.get(classId) === profile.daerah_id)
            })
        }
        // else: Superadmin sees all meetings (no filtering)

        return filteredMeetings.map((m: any) => m.id)
    }

    // For other roles (student, etc.), use all meetings
    return (meetings || []).map((m: any) => m.id)
}

// ─── Attendance Filters ───────────────────────────────────────────────────────

/**
 * Filter attendance logs by class with strict enrollment validation
 */
export function filterAttendanceByClass(
    logs: any[],
    classId: string,
    enrollmentMap: Map<string, Map<string, Set<string>>>,
    meetingMap: Map<string, any>
) {
    const classIds = classId.split(',')

    return logs.filter((log: any) => {
        const student = log.students
        const meeting = meetingMap.get(log.meeting_id)
        if (!meeting || !student) return false

        // Collect ALL class IDs from this meeting that match the filter
        const matchingClassIds: string[] = []

        if (classIds.includes(meeting.class_id)) {
            matchingClassIds.push(meeting.class_id)
        }

        if (meeting.class_ids && Array.isArray(meeting.class_ids)) {
            for (const id of meeting.class_ids) {
                if (classIds.includes(id) && !matchingClassIds.includes(id)) {
                    matchingClassIds.push(id)
                }
            }
        }

        if (matchingClassIds.length === 0) return false

        // STRICT enrollment check: student must be enrolled in ANY of the matching classes
        for (const meetingClassId of matchingClassIds) {
            const kelompokMapForClass = enrollmentMap.get(meetingClassId)
            if (!kelompokMapForClass) continue

            for (const [, enrolledStudents] of kelompokMapForClass.entries()) {
                if (enrolledStudents.has(student.id)) {
                    return true
                }
            }
        }

        return false
    })
}

/**
 * Filter attendance logs by kelompok (meeting location).
 * Students from any kelompok are included if they attended meetings in the selected kelompok.
 */
export function filterAttendanceByKelompok(
    logs: any[],
    kelompokId: string,
    maps: {
        classKelompokMap: Map<string, string>
    },
    meetingMap: Map<string, any>
) {
    const kelompokIds = kelompokId.split(',')

    return logs.filter((log: any) => {
        const student = log.students
        const meeting = meetingMap.get(log.meeting_id)
        if (!student || !meeting) return false

        let meetingBelongsToKelompok = false

        const primaryClassKelompok = maps.classKelompokMap.get(meeting.class_id)
        if (primaryClassKelompok && kelompokIds.includes(primaryClassKelompok)) {
            meetingBelongsToKelompok = true
        }

        if (!meetingBelongsToKelompok && meeting.class_ids && Array.isArray(meeting.class_ids)) {
            for (const classId of meeting.class_ids) {
                const kelompok = maps.classKelompokMap.get(classId)
                if (kelompok && kelompokIds.includes(kelompok)) {
                    meetingBelongsToKelompok = true
                    break
                }
            }
        }

        return meetingBelongsToKelompok
    })
}

// ─── Chart Formatters ─────────────────────────────────────────────────────────

/**
 * Format summary data for pie chart
 */
export function formatChartData(summary: {
    total: number
    hadir: number
    izin: number
    sakit: number
    alpha: number
}) {
    return [
        { name: 'Hadir', value: summary.hadir },
        { name: 'Izin', value: summary.izin },
        { name: 'Sakit', value: summary.sakit },
        { name: 'Alpha', value: summary.alpha },
    ].filter(item => item.value > 0)
}

// ─── Trend Aggregation ────────────────────────────────────────────────────────

/**
 * Aggregate attendance data by period for trend chart
 */
export function aggregateTrendData(
    meetings: any[],
    logs: any[],
    filters: ReportFilters
) {
    // Group meetings by period for meeting count per period
    const meetingsByPeriod = meetings.reduce((acc: any, meeting: any) => {
        const meetingDate = new Date(meeting.date)
        let groupKey: string

        if (filters.viewMode === 'general') {
            groupKey = meeting.date
        } else {
            switch (filters.period) {
                case 'daily':
                    groupKey = meeting.date
                    break
                case 'weekly':
                    groupKey = `week-${getWeekNumberInMonth(meetingDate)}`
                    break
                case 'monthly':
                    groupKey = `${meetingDate.getFullYear()}-${meetingDate.getMonth() + 1}`
                    break
                case 'yearly':
                    groupKey = meetingDate.getFullYear().toString()
                    break
                default:
                    groupKey = meeting.date
            }
        }

        if (!acc[groupKey]) acc[groupKey] = []
        acc[groupKey].push(meeting)
        return acc
    }, {})

    // Aggregate attendance per period
    const dailyData = meetings.reduce((acc: any, meeting: any) => {
        const meetingDate = new Date(meeting.date)
        const meetingLogs = logs.filter((log: any) => log.meeting_id === meeting.id) || []

        const visibleStudentIds = new Set(meetingLogs.map((log: any) => log.student_id))
        const totalStudents = visibleStudentIds.size > 0
            ? visibleStudentIds.size
            : meeting.student_snapshot?.length || 0

        let groupKey: string
        let displayDate: string

        if (filters.viewMode === 'general') {
            groupKey = meeting.date
            displayDate = meetingDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
        } else {
            switch (filters.period) {
                case 'daily':
                    groupKey = meeting.date
                    displayDate = meetingDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
                    break
                case 'weekly': {
                    const weekNum = getWeekNumberInMonth(meetingDate)
                    groupKey = `week-${weekNum}`
                    displayDate = `Minggu ${weekNum}`
                    break
                }
                case 'monthly': {
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
                    groupKey = `${meetingDate.getFullYear()}-${meetingDate.getMonth() + 1}`
                    displayDate = monthNames[meetingDate.getMonth()]
                    break
                }
                case 'yearly':
                    groupKey = meetingDate.getFullYear().toString()
                    displayDate = meetingDate.getFullYear().toString()
                    break
                default:
                    groupKey = meeting.date
                    displayDate = meetingDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
            }
        }

        if (!acc[groupKey]) {
            acc[groupKey] = {
                date: groupKey,
                displayDate,
                presentCount: 0,
                absentCount: 0,
                excusedCount: 0,
                sickCount: 0,
                totalRecords: 0,
                meetingsCount: meetingsByPeriod[groupKey]?.length || 0
            }
        }

        acc[groupKey].presentCount += meetingLogs.filter((log: any) => log.status === 'H').length
        acc[groupKey].absentCount += meetingLogs.filter((log: any) => log.status === 'A').length
        acc[groupKey].excusedCount += meetingLogs.filter((log: any) => log.status === 'I').length
        acc[groupKey].sickCount += meetingLogs.filter((log: any) => log.status === 'S').length
        acc[groupKey].totalRecords += totalStudents

        return acc
    }, {})

    return Object.values(dailyData)
        .sort((a: any, b: any) => {
            switch (filters.period) {
                case 'weekly':
                    return parseInt(a.date.split('-')[1]) - parseInt(b.date.split('-')[1])
                case 'yearly':
                    return parseInt(a.date) - parseInt(b.date)
                default:
                    return new Date(a.date).getTime() - new Date(b.date).getTime()
            }
        })
        .map((day: any) => {
            const attendancePercentage = day.totalRecords > 0
                ? Math.round((day.presentCount / day.totalRecords) * 100)
                : 0

            return {
                date: day.displayDate,
                fullDate: day.displayDate,
                attendancePercentage,
                presentCount: day.presentCount,
                absentCount: day.absentCount,
                excusedCount: day.excusedCount,
                sickCount: day.sickCount,
                totalRecords: day.totalRecords,
                meetingsCount: day.meetingsCount
            }
        })
}

// ─── Student Summary ──────────────────────────────────────────────────────────

/**
 * Aggregate attendance logs by student for detailed records view
 */
export function aggregateStudentSummary(
    logs: any[],
    kelompokMap: Map<string, string>
) {
    const studentSummary = logs.reduce((acc: any, log: any) => {
        const studentId = log.student_id

        const studentClasses = log.students?.student_classes || []
        const allClasses = studentClasses
            .map((sc: any) => sc.classes)
            .filter(Boolean)
            .map((cls: any) => ({
                id: cls.id,
                name: cls.name,
                kelompok_id: cls.kelompok_id,
                kelompok_name: cls.kelompok?.name || kelompokMap.get(cls.kelompok_id) || null
            }))

        if (allClasses.length === 0) {
            if (log.students.classes) {
                const primaryClass = log.students.classes
                allClasses.push({ id: primaryClass.id, name: primaryClass.name, kelompok_id: null, kelompok_name: null })
            } else if (log.students.class_id) {
                allClasses.push({ id: log.students.class_id, name: 'Unknown Class', kelompok_id: null, kelompok_name: null })
            }
        }

        const primaryClass = allClasses[0] || null

        if (!acc[studentId]) {
            const nameCounts = allClasses.reduce((counts: Record<string, number>, cls: any) => {
                counts[cls.name] = (counts[cls.name] || 0) + 1
                return counts
            }, {})

            const formattedClassNames = allClasses.map((cls: any) => {
                const hasDuplicate = nameCounts[cls.name] > 1
                if (hasDuplicate && cls.kelompok_name) {
                    return `${cls.name} (${cls.kelompok_name})`
                }
                return cls.name
            })

            acc[studentId] = {
                student_id: studentId,
                student_name: log.students?.name || 'Unknown Student',
                student_gender: log.students?.gender || null,
                class_name: formattedClassNames.length > 0
                    ? formattedClassNames.join(', ')
                    : primaryClass?.name || 'Unknown Class',
                all_classes: allClasses.map((cls: any) => ({ id: cls.id, name: cls.name })),
                kelompok_name: log.students?.kelompok?.name || null,
                desa_name: log.students?.desa?.name || null,
                daerah_name: log.students?.daerah?.name || null,
                total_days: 0,
                hadir: 0,
                izin: 0,
                sakit: 0,
                alpha: 0,
                attendance_rate: 0
            }
        }

        acc[studentId].total_days++
        acc[studentId][log.status === 'H' ? 'hadir' :
            log.status === 'I' ? 'izin' :
                log.status === 'S' ? 'sakit' : 'alpha']++

        return acc
    }, {})

    Object.values(studentSummary).forEach((student: any) => {
        student.attendance_rate = student.total_days > 0
            ? Math.round((student.hadir / student.total_days) * 100)
            : 0
    })

    return Object.values(studentSummary).map((student: any) => ({
        student_id: student.student_id,
        student_name: student.student_name,
        student_gender: student.student_gender,
        class_name: student.class_name,
        all_classes: student.all_classes || [],
        kelompok_name: student.kelompok_name || null,
        desa_name: student.desa_name || null,
        daerah_name: student.daerah_name || null,
        total_days: student.total_days,
        hadir: student.hadir,
        izin: student.izin,
        sakit: student.sakit,
        alpha: student.alpha,
        attendance_rate: student.attendance_rate
    }))
}
