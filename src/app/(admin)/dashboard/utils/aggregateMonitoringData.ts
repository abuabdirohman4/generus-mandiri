import type { ClassMonitoringData } from '../actions'

export interface AggregatedData {
  name: string
  attendance_rate: number
  meeting_count: number
  student_count: number
}

/**
 * Aggregates monitoring data by comparison level (class/kelompok/desa/daerah)
 * Uses weighted average for attendance rate calculation
 *
 * @param monitoringData - Class-level monitoring data from server
 * @param comparisonLevel - Level to aggregate by
 * @param filters - Current filter state
 * @returns Aggregated data with weighted attendance rates
 */
export function aggregateMonitoringData(
  monitoringData: ClassMonitoringData[],
  comparisonLevel: 'class' | 'kelompok' | 'desa' | 'daerah',
  filters: {
    kelompok: string[]
    kelas: string[]
    desa: string[]
    daerah: string[]
  }
): AggregatedData[] {
  // Step 1: Determine group key based on comparison level
  const groupKey = comparisonLevel === 'class' ? 'class_name' :
    comparisonLevel === 'kelompok' ? 'kelompok_name' :
      comparisonLevel === 'desa' ? 'desa_name' : 'daerah_name'

  // Step 2: For class level, filter by selected class IDs
  if (comparisonLevel === 'class') {
    const selectedClassIds = filters.kelas

    // If no classes selected, return empty
    if (!selectedClassIds || selectedClassIds.length === 0) {
      return []
    }

    // Filter by class_id and group
    const grouped = monitoringData.reduce((acc, item) => {
      const entityName = item.class_name
      const entityId = item.class_id

      // Only include if class is in selected filter
      // Handle comma-separated IDs for multi-kelompok classes
      const classIdsToCheck = entityId?.includes(',') ? entityId.split(',') : [entityId]
      const isSelected = classIdsToCheck.some((id: string) => selectedClassIds.includes(id))

      if (!entityName || !isSelected) return acc

      if (!acc[entityName]) {
        acc[entityName] = {
          name: entityName,
          totalPresent: 0,
          totalPotential: 0,
          meetingCount: 0,
          studentCount: 0
        }
      }

      // Weighted attendance calculation
      const potential = (item.student_count || 0) * item.meeting_count
      const present = (item.attendance_rate / 100) * potential

      acc[entityName].totalPresent += present
      acc[entityName].totalPotential += potential
      acc[entityName].meetingCount += item.meeting_count
      acc[entityName].studentCount += (item.student_count || 0)

      return acc
    }, {} as Record<string, any>)

    // Calculate weighted average attendance rate
    const result = Object.values(grouped).map((g: any) => ({
      name: g.name,
      attendance_rate: g.totalPotential > 0
        ? Math.round((g.totalPresent / g.totalPotential) * 100)
        : 0,
      meeting_count: g.meetingCount,
      student_count: g.studentCount
    }))

    // Sort by attendance rate descending
    return result.sort((a, b) => b.attendance_rate - a.attendance_rate)
  }

  // Step 3: For organizational levels (kelompok/desa/daerah)
  // The monitoring data is already filtered by the server based on the organizational filters
  // We just need to group and aggregate by the entity name
  const grouped = monitoringData.reduce((acc, item) => {
    const entityName = item[groupKey]

    // DEBUG: Log items without entity name
    if (!entityName) {
      return acc;
    }

    if (!acc[entityName]) {
      acc[entityName] = {
        name: entityName,
        totalPresent: 0,
        totalPotential: 0,
        meetingCount: 0,
        studentCount: 0
      }
    }

    // Weighted attendance calculation
    const potential = (item.student_count || 0) * item.meeting_count
    const present = (item.attendance_rate / 100) * potential

    acc[entityName].totalPresent += present
    acc[entityName].totalPotential += potential
    acc[entityName].meetingCount += item.meeting_count
    acc[entityName].studentCount += (item.student_count || 0)

    return acc
  }, {} as Record<string, any>)

  // Calculate weighted average attendance rate
  const result = Object.values(grouped).map((g: any) => ({
    name: g.name,
    attendance_rate: g.totalPotential > 0
      ? Math.round((g.totalPresent / g.totalPotential) * 100)
      : 0,
    meeting_count: g.meetingCount,
    student_count: g.studentCount
  }))

  // Sort by attendance rate descending
  return result.sort((a, b) => b.attendance_rate - a.attendance_rate)
}
