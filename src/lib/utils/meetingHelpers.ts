import { isTeacherClass } from './classHelpers'

/**
 * Filter out Pengajar meetings for teachers who don't teach Pengajar class
 * Admins and superadmins see all meetings
 *
 * To disable this filter, comment out the filter call in MeetingCards.tsx and MeetingList.tsx
 */
export function filterMeetingsForUser(meetings: any[], userProfile: any): any[] {
  // Admins see all meetings
  if (!userProfile || userProfile.role !== 'teacher') {
    return meetings
  }

  // Check if teacher teaches Pengajar class
  const teacherTeachesPengajar = userProfile.classes?.some((cls: any) =>
    isTeacherClass(cls)
  )

  // If teacher teaches Pengajar, show all meetings
  if (teacherTeachesPengajar) {
    return meetings
  }

  // Filter out Pengajar meetings
  return meetings.filter(meeting => {
    // Check single class
    if (meeting.classes?.name && isTeacherClass(meeting.classes)) {
      return false // Hide this meeting
    }

    // Check multi-class meetings
    if (meeting.class_ids && meeting.allClasses?.length > 0) {
      const hasPengajarClass = meeting.allClasses.some((cls: any) =>
        cls.name && isTeacherClass(cls)
      )
      if (hasPengajarClass) {
        return false // Hide this meeting
      }
    }

    return true // Show this meeting
  })
}
