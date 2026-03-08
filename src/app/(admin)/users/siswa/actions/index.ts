/**
 * Backward-compatible re-exports for all siswa server actions.
 * Components importing from '@/app/(admin)/users/siswa/actions' continue to work.
 */

// Students domain
export {
    getUserProfile,
    getAllStudents,
    createStudent,
    updateStudent,
    checkStudentHasAttendance,
    deleteStudent,
    getStudentClasses,
    assignStudentsToClass,
    createStudentsBatch,
    getCurrentUserRole,
    getStudentInfo,
    getStudentAttendanceHistory,
    getStudentBiodata,
    updateStudentBiodata,
    type Student,
    type StudentInfo,
    type AttendanceLog,
    type MonthlyStats,
    type AttendanceHistoryResponse,
} from './students/actions'

// Classes domain
export {
    getAllClasses,
    type Class,
} from './classes/actions'

// Management domain
export {
    archiveStudent,
    unarchiveStudent,
    createTransferRequest,
    approveTransferRequest,
    rejectTransferRequest,
    cancelTransferRequest,
    getPendingTransferRequests,
    type ArchiveStudentInput,
    type ArchiveStudentResponse,
    type CreateTransferRequestInput,
    type TransferRequestResponse,
    type TransferRequest,
} from './management/actions'
