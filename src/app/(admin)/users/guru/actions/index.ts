// ─── Teachers CRUD + getAllTeachers + kelompok assignment ──────────────────────
export {
    createTeacher,
    updateTeacher,
    deleteTeacher,
    resetTeacherPassword,
    getAllTeachers,
    assignTeacherToKelompok,
} from './teachers/actions'

// ─── Teacher Types ─────────────────────────────────────────────────────────────
export type { TeacherData } from './teachers/actions'

// ─── Class Assignments ─────────────────────────────────────────────────────────
export {
    getTeacherClasses,
    updateTeacherClasses,
    assignTeacherToClass,
} from './classes/actions'

// ─── Settings & Permissions ────────────────────────────────────────────────────
export {
    getMeetingFormSettings,
    updateMeetingFormSettings,
    updateTeacherPermissions,
} from './settings/actions'

// ─── Settings Types ────────────────────────────────────────────────────────────
export type { MeetingFormSettings } from './settings/actions'
