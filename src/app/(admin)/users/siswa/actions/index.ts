/**
 * Backward-compatible re-exports for all siswa server actions.
 * Components importing from '@/app/(admin)/users/siswa/actions' continue to work.
 */

// Students domain
export {
    getUserProfile,
    getAllStudents,
    getStudentsPaginated,
    createStudent,
    updateStudent,
    checkStudentHasAttendance,
    deleteStudent,
    getStudentClasses,
    assignStudentsToClass,
    assignStudentsToClassGroup,
    createStudentsBatch,
    getCurrentUserRole,
    getStudentInfo,
    getStudentAttendanceHistory,
    getMeetingDetail,
    getStudentBiodata,
    updateStudentBiodata,
    type StudentInfo,
    type AttendanceLog,
    type MonthlyStats,
    type AttendanceHistoryResponse,
} from './students/actions'

// Students types — re-export from canonical source (not from use-server file)
export type { StudentWithClasses as Student } from '@/types/student'

// Classes domain
export {
    getAllClasses,
} from './classes/actions'

// Classes types — re-export from canonical source (not from use-server file)
export type { Class } from '@/types/class'

// Management domain
export {
    archiveStudent,
    unarchiveStudent,
    createTransferRequest,
    approveTransferRequest,
    rejectTransferRequest,
    cancelTransferRequest,
    getPendingTransferRequests,
    getAllOrganisationsForTransfer,
    type ArchiveStudentInput,
    type ArchiveStudentResponse,
    type CreateTransferRequestInput,
    type TransferRequestResponse,
} from './management/actions'

// Management types — re-export from canonical source (not from use-server file)
export type { TransferRequest } from './students/permissions'
