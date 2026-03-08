// Re-export all server actions for backward compatibility
// This allows existing imports like:
//   import { createMeeting } from '@/app/(admin)/absensi/actions'
// to continue working without changes

// Server Actions - from action files
export {
  createMeeting,
  updateMeeting,
  deleteMeeting,
  getMeetingById,
  getMeetingsByClass,
  getMeetingsWithStats,
} from './meetings'

export {
  saveAttendance,
  saveAttendanceForMeeting,
  getAttendanceByDate,
  getAttendanceByMeeting,
  getAttendanceStats,
  getStudentsFromSnapshot,
} from './attendance'

// Business Logic Functions - from utils files
export {
  validateMeetingData,
  buildStudentSnapshot,
  canUserAccessMeeting,
} from '../utils/meetingValidation'

export {
  calculateAttendanceStats,
  validateAttendanceData,
} from '../utils/attendanceCalculation'
