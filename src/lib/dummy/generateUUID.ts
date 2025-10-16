/**
 * UUID Generation Utility for Dummy Data
 * 
 * Generates consistent, deterministic UUIDs from string IDs to ensure
 * relationships remain intact when converting dummy data to proper format.
 */

/**
 * Generate a consistent UUID from a string ID
 * Uses a simple hash function to ensure same input always produces same output
 * 
 * @param prefix - Prefix for the ID (e.g., 'meeting', 'student', 'log')
 * @param id - The original string ID (e.g., '1', 'meeting-1')
 * @returns A valid UUID v4 format string
 */
export function generateConsistentUUID(prefix: string, id: string): string {
  // Create a deterministic string from prefix and id
  const input = `${prefix}-${id}`;
  
  // Simple hash function to convert string to number
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Convert hash to positive number
  const positiveHash = Math.abs(hash);
  
  // Generate UUID v4 format using the hash
  // Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  const hex = positiveHash.toString(16).padStart(8, '0');
  
  // Create UUID v4 format
  const uuid = [
    hex.substring(0, 8),
    hex.substring(0, 4),
    '4' + hex.substring(1, 4), // Version 4
    ((parseInt(hex[0], 16) & 0x3) | 0x8).toString(16) + hex.substring(1, 4), // Variant bits
    hex.substring(0, 12)
  ].join('-');
  
  return uuid;
}

/**
 * Predefined UUIDs for common dummy data entities
 * These ensure consistent relationships across all dummy data
 */
export const DUMMY_UUIDS = {
  // Class
  CLASS_1: generateConsistentUUID('class', '1'),
  
  // Students (25 students)
  STUDENTS: Array.from({ length: 25 }, (_, i) => 
    generateConsistentUUID('student', (i + 1).toString())
  ),
  
  // Meetings (38 meetings)
  MEETINGS: Array.from({ length: 38 }, (_, i) => 
    generateConsistentUUID('meeting', (i + 1).toString())
  ),
  
  // Attendance logs (will be generated dynamically)
  LOGS: Array.from({ length: 7600 }, (_, i) => 
    generateConsistentUUID('log', (i + 1).toString())
  ),
  
  // Organization hierarchy
  DAERAH_1: generateConsistentUUID('daerah', '1'),
  DESA_1: generateConsistentUUID('desa', '1'),
  KELOMPOK_1: generateConsistentUUID('kelompok', '1'),
  
  // Teacher (for meetings)
  TEACHER_1: generateConsistentUUID('teacher', '1'),
} as const;

/**
 * Get student UUID by student number (1-25)
 */
export function getStudentUUID(studentNumber: number): string {
  if (studentNumber < 1 || studentNumber > 25) {
    throw new Error('Student number must be between 1 and 25');
  }
  return DUMMY_UUIDS.STUDENTS[studentNumber - 1];
}

/**
 * Get meeting UUID by meeting number (1-38)
 */
export function getMeetingUUID(meetingNumber: number): string {
  if (meetingNumber < 1 || meetingNumber > 38) {
    throw new Error('Meeting number must be between 1 and 38');
  }
  return DUMMY_UUIDS.MEETINGS[meetingNumber - 1];
}

/**
 * Get log UUID by log number (1-7600)
 */
export function getLogUUID(logNumber: number): string {
  if (logNumber < 1 || logNumber > 7600) {
    throw new Error('Log number must be between 1 and 7600');
  }
  return DUMMY_UUIDS.LOGS[logNumber - 1];
}

/**
 * Convert date string to ISO timestamp
 * @param dateString - Date in YYYY-MM-DD format
 * @param time - Time in HH:MM:SS format (default: 08:00:00)
 * @returns ISO timestamp string
 */
export function toISOTimestamp(dateString: string, time: string = '08:00:00'): string {
  return `${dateString}T${time}Z`;
}

/**
 * Convert date string to ISO date (for date fields)
 * @param dateString - Date in YYYY-MM-DD format
 * @returns ISO date string
 */
export function toISODate(dateString: string): string {
  return dateString;
}
