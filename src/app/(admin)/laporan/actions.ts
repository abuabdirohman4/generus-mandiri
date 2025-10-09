'use server'

import { createClient } from '@/lib/supabase/server'
import { handleApiError } from '@/lib/errorUtils'

export interface ReportFilters {
  period: 'daily' | 'weekly' | 'monthly' | 'yearly'
  classId?: string
  startDate?: string
  endDate?: string
}

export interface ReportData {
  summary: {
    total: number
    hadir: number
    izin: number
    sakit: number
    alpha: number
  }
  chartData: Array<{ name: string; value: number }>
  detailedRecords: Array<{
    student_id: string
    student_name: string
    student_gender: string
    class_name: string
    total_days: number
    hadir: number
    izin: number
    sakit: number
    alpha: number
    attendance_rate: number
  }>
  period: string
  dateRange: {
    start: string | null
    end: string | null
  }
}

/**
 * Mendapatkan data laporan kehadiran berdasarkan filter
 */
export async function getAttendanceReport(filters: ReportFilters): Promise<ReportData> {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Build date range based on period
    let dateFilter: {
      date?: {
        eq?: string
        gte?: string
        lte?: string
      }
    } = {}
    const now = new Date()
    
    if (filters.startDate && filters.endDate) {
      dateFilter = {
        date: {
          gte: filters.startDate,
          lte: filters.endDate
        }
      }
    } else {
      switch (filters.period) {
        case 'daily':
          const today = now.toISOString().split('T')[0]
          dateFilter = { date: { eq: today } }
          break
        case 'weekly':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          dateFilter = {
            date: {
              gte: weekAgo.toISOString().split('T')[0],
              lte: now.toISOString().split('T')[0]
            }
          }
          break
        case 'monthly':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          dateFilter = {
            date: {
              gte: monthAgo.toISOString().split('T')[0],
              lte: now.toISOString().split('T')[0]
            }
          }
          break
        case 'yearly':
          const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
          dateFilter = {
            date: {
              gte: yearAgo.toISOString().split('T')[0],
              lte: now.toISOString().split('T')[0]
            }
          }
          break
      }
    }

    // Build query
    let query = supabase
      .from('attendance_logs')
      .select(`
        id,
        student_id,
        date,
        status,
        reason,
        students!inner(
          id,
          name,
          gender,
          classes!inner(
            id,
            name
          )
        )
      `)

    // Apply filters
    if (filters.classId) {
      query = query.eq('students.class_id', filters.classId)
    }

    // Apply date filter
    if (dateFilter.date?.eq) {
      query = query.eq('date', dateFilter.date.eq)
    } else if (dateFilter.date?.gte && dateFilter.date?.lte) {
      query = query
        .gte('date', dateFilter.date.gte)
        .lte('date', dateFilter.date.lte)
    }

    const { data: attendanceLogs, error } = await query

    if (error) {
      throw error
    }

    // Process data for summary
    const summary = {
      total: attendanceLogs?.length || 0,
      hadir: attendanceLogs?.filter(log => log.status === 'H').length || 0,
      izin: attendanceLogs?.filter(log => log.status === 'I').length || 0,
      sakit: attendanceLogs?.filter(log => log.status === 'S').length || 0,
      alpha: attendanceLogs?.filter(log => log.status === 'A').length || 0,
    }

    // Prepare chart data
    const chartData = [
      { name: 'Hadir', value: summary.hadir },
      { name: 'Izin', value: summary.izin },
      { name: 'Sakit', value: summary.sakit },
      { name: 'Alpha', value: summary.alpha },
    ].filter(item => item.value > 0) // Only include non-zero values

    // Group by student for detailed view
    const studentSummary = attendanceLogs?.reduce((acc: any, log: any) => {
      const studentId = log.student_id
      if (!acc[studentId]) {
        acc[studentId] = {
          student_id: studentId,
          student_name: log.students.name,
          student_gender: log.students.gender,
          class_name: log.students.classes.name,
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

    // Calculate attendance rate for each student
    Object.values(studentSummary).forEach((student: any) => {
      student.attendance_rate = student.total_days > 0 
        ? Math.round((student.hadir / student.total_days) * 100) 
        : 0
    })

    const detailedRecords = Object.values(studentSummary) as Array<{
      student_id: string
      student_name: string
      student_gender: string
      class_name: string
      total_days: number
      hadir: number
      izin: number
      sakit: number
      alpha: number
      attendance_rate: number
    }>

    return {
      summary,
      chartData,
      detailedRecords,
      period: filters.period,
      dateRange: {
        start: dateFilter.date?.gte || null,
        end: dateFilter.date?.lte || dateFilter.date?.eq || null
      }
    }

  } catch (error) {
    handleApiError(error, 'memuat data', 'Gagal memuat laporan kehadiran')
    throw error
  }
}

/**
 * Mendapatkan daftar kelas untuk filter dropdown
 */
export async function getClasses() {
  try {
    const supabase = await createClient()
    
    const { data: classes, error } = await supabase
      .from('classes')
      .select('id, name')
      .order('name')

    if (error) {
      throw error
    }

    return classes || []
  } catch (error) {
    handleApiError(error, 'memuat data', 'Gagal memuat daftar kelas')
    throw error
  }
}
