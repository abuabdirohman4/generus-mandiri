export const ATTENDANCE_COLORS = {
  hadir: '#10B981', // green
  izin: '#F59E0B', // yellow
  sakit: '#3B82F6', // blue
  absen: '#EF4444' // red
} as const

export type AttendanceStatus = keyof typeof ATTENDANCE_COLORS
