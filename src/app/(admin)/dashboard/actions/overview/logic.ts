/**
 * Overview Logic (Layer 2)
 *
 * Pure business logic for dashboard overview stats.
 * NO 'use server' directive. No database access. No side effects.
 */

/**
 * Get Jakarta timezone date string (YYYY-MM-DD) for today, week ago, month ago
 */
export function getJakartaDateStrings() {
    const jakartaDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
    const today = jakartaDate.toISOString().split('T')[0]

    const weekAgo = new Date(jakartaDate)
    weekAgo.setDate(weekAgo.getDate() - 7)
    const weekAgoStr = weekAgo.toISOString().split('T')[0]

    const monthAgo = new Date(jakartaDate)
    monthAgo.setDate(monthAgo.getDate() - 30)
    const monthAgoStr = monthAgo.toISOString().split('T')[0]

    return { today, weekAgoStr, monthAgoStr }
}

/**
 * Count meetings by period from a list of meeting rows
 */
export function countMeetingsByPeriod(
    meetings: Array<{ date: string }>,
    today: string,
    weekAgoStr: string,
    monthAgoStr: string
) {
    return {
        meetingsToday: meetings.filter(m => m.date === today).length,
        meetingsWeekly: meetings.filter(m => m.date >= weekAgoStr).length,
        meetingsMonthly: meetings.filter(m => m.date >= monthAgoStr).length,
    }
}

/**
 * Calculate attendance percentage for a period
 * Returns 0 if no records
 */
export function calcAttendanceRate(logs: Array<{ status: string }>): number {
    if (logs.length === 0) return 0
    const present = logs.filter(a => a.status === 'H').length
    return Math.round((present / logs.length) * 100)
}

/**
 * Slice attendance logs by date range
 */
export function sliceAttendanceByPeriod(
    allLogs: Array<{ date: string; status: string }>,
    today: string,
    weekAgoStr: string
) {
    return {
        todayLogs: allLogs.filter(a => a.date === today),
        weekLogs: allLogs.filter(a => a.date >= weekAgoStr),
        monthLogs: allLogs, // allLogs is already filtered to monthAgoStr at query level
    }
}
