/**
 * Shared types for users/guru actions
 */

export interface TeacherData {
    username: string
    full_name: string
    email: string
    password?: string
    daerah_id: string
    desa_id?: string | null
    kelompok_id?: string
    permissions?: {
        can_archive_students?: boolean
        can_transfer_students?: boolean
        can_soft_delete_students?: boolean
        can_hard_delete_students?: boolean
    }
}

export interface MeetingFormSettings {
    showTitle: boolean
    showTopic: boolean
    showDescription: boolean
    showDate: boolean
    showMeetingType: boolean
    showClassSelection: boolean
    showStudentSelection: boolean
    showGenderFilter: boolean
}
