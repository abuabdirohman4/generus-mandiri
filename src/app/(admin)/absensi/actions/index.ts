// Re-export all server actions for backward compatibility
// Components continue to use: import { createMeeting } from '@/app/(admin)/absensi/actions'

export {
  createMeeting,
  updateMeeting,
  deleteMeeting,
  getMeetingById,
  getMeetingsByClass,
  getMeetingsWithStats
} from './meetings/actions'

export {
  saveAttendance,
  saveAttendanceForMeeting,
  getAttendanceByDate,
  getAttendanceByMeeting,
  getAttendanceStats,
  getStudentsFromSnapshot
} from './attendance/actions'
