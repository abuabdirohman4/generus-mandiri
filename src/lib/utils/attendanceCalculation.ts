/**
 * Shared Attendance Calculation Utilities
 * Used by both Dashboard and Laporan to ensure consistent percentage calculations
 */

export interface AttendanceLog {
  meeting_id: string;
  student_id: string;
  status: 'H' | 'I' | 'S' | 'A';
  students?: {
    id: string;
    kelompok_id?: string;
  };
}

export interface Meeting {
  id: string;
  class_id: string;
  class_ids?: string[];
  date: string;
}

export interface EnrollmentMap {
  // classId -> Set of enrolled student IDs
  [classId: string]: Set<string>;
}

/**
 * Find which class in the filter matches this meeting
 * Checks both primary class_id and class_ids array
 */
export function findMatchingClass(
  meeting: Meeting,
  filterClassIds: string[]
): string | null {
  // Check primary class_id
  if (filterClassIds.includes(meeting.class_id)) {
    return meeting.class_id;
  }

  // Check class_ids array for multi-class meetings
  if (meeting.class_ids && Array.isArray(meeting.class_ids)) {
    for (const classId of meeting.class_ids) {
      if (filterClassIds.includes(classId)) {
        return classId;
      }
    }
  }

  return null;
}

/**
 * Check if a student is enrolled in a specific class
 */
export function isStudentEnrolled(
  studentId: string,
  classId: string,
  enrollmentMap: EnrollmentMap
): boolean {
  const enrolledStudents = enrollmentMap[classId];
  return enrolledStudents ? enrolledStudents.has(studentId) : false;
}

/**
 * Filter attendance logs by meeting class with strict enrollment check
 *
 * Key principle: Only count attendance if:
 * 1. Meeting is for one of the selected classes
 * 2. Student is enrolled in THAT SPECIFIC class (not just any selected class)
 *
 * This prevents cross-class contamination in multi-class scenarios
 */
export function filterAttendanceByMeetingClass(
  attendanceLogs: AttendanceLog[],
  meetingMap: Map<string, Meeting>,
  filterClassIds: string[],
  enrollmentMap: EnrollmentMap
): AttendanceLog[] {
  return attendanceLogs.filter((log) => {
    const meeting = meetingMap.get(log.meeting_id);
    if (!meeting) return false;

    // Step 1: Find which class in the filter this meeting belongs to
    const meetingClassId = findMatchingClass(meeting, filterClassIds);
    if (!meetingClassId) return false;

    // Step 2: STRICT enrollment check
    // Only count if student is enrolled in THIS SPECIFIC class that the meeting is for
    // This prevents counting attendance from students who attended for a DIFFERENT class
    // in multi-class meetings
    return isStudentEnrolled(log.student_id, meetingClassId, enrollmentMap);
  });
}

/**
 * Filter attendance logs for a specific single class
 * Used by Dashboard's per-class calculation
 */
export function filterAttendanceForClass(
  attendanceLogs: AttendanceLog[],
  meetingMap: Map<string, Meeting>,
  classId: string,
  enrolledStudents: Set<string>
): AttendanceLog[] {
  let relevantMeetingCount = 0;
  let enrollmentFilteredCount = 0;

  const filtered = attendanceLogs.filter((log) => {
    const meeting = meetingMap.get(log.meeting_id);
    if (!meeting) return false;

    // Check if meeting involves this class
    const isRelevantMeeting =
      meeting.class_id === classId ||
      (meeting.class_ids && Array.isArray(meeting.class_ids) && meeting.class_ids.includes(classId));

    if (!isRelevantMeeting) return false;

    relevantMeetingCount++;

    // STRICT: Only count if student is enrolled in THIS class
    const isEnrolled = enrolledStudents.has(log.student_id);
    if (isEnrolled) {
      enrollmentFilteredCount++;
    }

    return isEnrolled;
  });

  console.log(`[FILTER UTILITY] filterAttendanceForClass for classId ${classId}:`);
  console.log(`[FILTER UTILITY] - Input logs: ${attendanceLogs.length}`);
  console.log(`[FILTER UTILITY] - Logs from relevant meetings: ${relevantMeetingCount}`);
  console.log(`[FILTER UTILITY] - After enrollment filter: ${enrollmentFilteredCount}`);
  console.log(`[FILTER UTILITY] - Enrolled students count: ${enrolledStudents.size}`);

  return filtered;
}

/**
 * Calculate attendance rate from filtered logs
 */
export function calculateAttendanceRate(logs: AttendanceLog[]): number {
  if (logs.length === 0) return 0;

  const presentCount = logs.filter((log) => log.status === 'H').length;
  return Math.round((presentCount / logs.length) * 100);
}

/**
 * Calculate attendance statistics from filtered logs
 */
export interface AttendanceStats {
  total: number;
  hadir: number;
  izin: number;
  sakit: number;
  alpha: number;
  percentage: number;
}

export function calculateAttendanceStats(logs: AttendanceLog[]): AttendanceStats {
  const total = logs.length;
  const hadir = logs.filter((log) => log.status === 'H').length;
  const izin = logs.filter((log) => log.status === 'I').length;
  const sakit = logs.filter((log) => log.status === 'S').length;
  const alpha = logs.filter((log) => log.status === 'A').length;

  const percentage = total > 0 ? Math.round((hadir / total) * 100) : 0;

  return {
    total,
    hadir,
    izin,
    sakit,
    alpha,
    percentage,
  };
}
