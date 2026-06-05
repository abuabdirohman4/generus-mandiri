// ─── Teachers CRUD + getAllTeachers + kelompok assignment + delete impact ──────
export {
    createTeacher,
    updateTeacher,
    deleteTeacher,
    getTeacherDeleteImpact,
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
    getTeacherMaterialPermissions,
    updateTeacherMaterialPermissions,
} from './settings/actions'

// ─── Settings Types ────────────────────────────────────────────────────────────
export type { MeetingFormSettings } from './settings/actions'

// ─── Class Master Restrictions (Guru Desa/Daerah) ──────────────────────────────
export {
    getTeacherClassMasters,
    updateTeacherClassMasters,
} from './teacher-class-masters/actions'

// ─── Kelompok Access Restrictions (Guru Desa) ──────────────────────────────────
export {
    getTeacherKelompokAccess,
    updateTeacherKelompokAccess,
} from './teacher-kelompok-access/actions'
