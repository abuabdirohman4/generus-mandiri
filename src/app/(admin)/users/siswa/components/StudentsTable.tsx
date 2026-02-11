'use client'

import { useState } from 'react'
import Link from 'next/link'
import DataTable from '@/components/table/Table'
import DeleteStudentModal from './DeleteStudentModal'
import { PencilIcon, TrashBinIcon, EyeIcon, ReportIcon, UserCircleIcon } from '@/lib/icons'
import { Student } from '@/hooks/useStudents'
import { isAdminLegacy, isAdminDaerah, isAdminDesa, isAdminKelompok } from '@/lib/userUtils'
import { checkStudentHasAttendance } from '../actions'
import {
  canArchiveStudent,
  canTransferStudent,
  canSoftDeleteStudent,
  canHardDeleteStudent
} from '@/lib/studentPermissions'

interface StudentsTableProps {
  students: Student[]
  userRole: string | null
  onEdit: (student: Student) => void
  onDelete: (studentId: string, permanent: boolean) => void
  onArchive?: (student: Student) => void
  onTransfer?: (students: Student[]) => void
  onUnarchive?: (student: Student) => void
  userProfile: {
    id: string;
    full_name: string;
    role: string;
    classes?: Array<{ id: string; name: string }>
    daerah_id?: string | null;
    desa_id?: string | null;
    kelompok_id?: string | null;
    permissions?: {
      can_archive_students?: boolean;
      can_transfer_students?: boolean;
      can_soft_delete_students?: boolean;
      can_hard_delete_students?: boolean;
    };
  } | null | undefined
  classes?: Array<{ id: string; name: string; kelompok_id?: string | null }>
  studentsWithPendingTransfer?: Set<string>
}

export default function StudentsTable({
  students,
  userRole,
  onEdit,
  onDelete,
  onArchive,
  onTransfer,
  onUnarchive,
  userProfile,
  classes: classesData,
  studentsWithPendingTransfer
}: StudentsTableProps) {
  const [loadingStudentId, setLoadingStudentId] = useState<string | null>(null)
  const [clickedColumn, setClickedColumn] = useState<'name' | 'actions' | null>(null)
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean
    studentId: string
    studentName: string
    hasAttendance: boolean
    isLoading: boolean
    deletedAt: string | null
  }>({
    isOpen: false,
    studentId: '',
    studentName: '',
    hasAttendance: false,
    isLoading: false,
    deletedAt: null
  })
  
  const handleStudentClick = (studentId: string, column: 'name' | 'actions') => {
    setLoadingStudentId(studentId)
    setClickedColumn(column)
  }

  const handleDeleteClick = async (studentId: string, studentName: string) => {
    // Find student to get deleted_at
    const student = students.find(s => s.id === studentId)

    // Check attendance before opening modal
    setDeleteModal({
      isOpen: true,
      studentId,
      studentName,
      hasAttendance: false,
      isLoading: true,
      deletedAt: student?.deleted_at || null
    })

    try {
      const hasAttendance = await checkStudentHasAttendance(studentId)
      setDeleteModal(prev => ({
        ...prev,
        hasAttendance,
        isLoading: false
      }))
    } catch (error) {
      console.error('Error checking student attendance:', error)
      setDeleteModal(prev => ({
        ...prev,
        hasAttendance: false,
        isLoading: false
      }))
    }
  }

  const handleSoftDelete = () => {
    onDelete(deleteModal.studentId, false)
    setDeleteModal({
      isOpen: false,
      studentId: '',
      studentName: '',
      hasAttendance: false,
      isLoading: false,
      deletedAt: null
    })
  }

  const handleHardDelete = () => {
    onDelete(deleteModal.studentId, true)
    setDeleteModal({
      isOpen: false,
      studentId: '',
      studentName: '',
      hasAttendance: false,
      isLoading: false,
      deletedAt: null
    })
  }

  const handleDeleteCancel = () => {
    setDeleteModal({
      isOpen: false,
      studentId: '',
      studentName: '',
      hasAttendance: false,
      isLoading: false,
      deletedAt: null
    })
  }
  // Build columns based on user role
  const buildColumns = (userProfile: any) => {
    const baseColumns = [
      { key: 'name', label: 'Nama', widthMobile: '200px', align: 'left' as const },
      { key: 'gender', label: 'Jenis Kelamin', align: 'center' as const },
    ];
    
    const orgColumns = [];
    
    // Only show org columns for admin users
    if (isAdminLegacy(userProfile?.role)) {
      // Superadmin sees all
      if (userProfile?.role === 'superadmin') {
        orgColumns.push(
          { key: 'daerah_name', label: 'Daerah', align: 'center' as const },
          { key: 'desa_name', label: 'Desa', align: 'center' as const },
          { key: 'kelompok_name', label: 'Kelompok', align: 'center' as const },
          { key: 'class_name', label: 'Kelas', align: 'center' as const }
        );
      }
      // Admin Daerah
      else if (isAdminDaerah(userProfile)) {
        orgColumns.push(
          { key: 'desa_name', label: 'Desa', align: 'center' as const },
          { key: 'kelompok_name', label: 'Kelompok', align: 'center' as const },
          { key: 'class_name', label: 'Kelas', align: 'center' as const }
        );
      }
      // Admin Desa
      else if (isAdminDesa(userProfile)) {
        orgColumns.push(
          { key: 'kelompok_name', label: 'Kelompok', align: 'center' as const },
          { key: 'class_name', label: 'Kelas', align: 'center' as const }
        );
      }
      // Admin Kelompok - only Kelas
      else if (isAdminKelompok(userProfile)) {
        orgColumns.push(
          { key: 'class_name', label: 'Kelas', align: 'center' as const }
        );
      }
    }
    
    // Teacher with multiple classes: show class_name column
    if (userProfile?.role === 'teacher' && userProfile.classes && userProfile.classes.length > 1) {
      // Cek apakah classes yang diajarkan teacher memiliki kelompok_id yang berbeda
      const teacherClassIds = userProfile.classes.map((c: { id: string; name: string }) => c.id)
      const teacherClasses = classesData?.filter((c: { id: string; name: string; kelompok_id?: string | null }) => teacherClassIds.includes(c.id)) || []
      const uniqueKelompokIds = new Set(
        teacherClasses
          .map((c: { id: string; name: string; kelompok_id?: string | null }) => c.kelompok_id)
          .filter(Boolean)
      )
      
      // Jika teacher mengajar classes dari different kelompok, tambahkan kolom kelompok
      if (uniqueKelompokIds.size > 1) {
        orgColumns.push(
          { key: 'kelompok_name', label: 'Kelompok', align: 'center' as const }
        )
      }
      
      // Selalu tampilkan class_name untuk teacher dengan multiple classes
      orgColumns.push(
        { key: 'class_name', label: 'Kelas', align: 'center' as const }
      );
    }
    
    return [
      ...baseColumns,
      ...orgColumns,
      { key: 'actions', label: 'Aksi', align: 'center' as const, width: '24' }
    ];
  };

  const columns = buildColumns(userProfile);

  // Filter classes based on user role for display
  const getDisplayClasses = (student: Student): string => {
    try {
      if (!student || typeof student !== 'object') {
        return '-'
      }
      
      if (!student.classes || !Array.isArray(student.classes) || student.classes.length === 0) {
        return String(student.class_name || '-')
      }
      
      // If admin, show all classes
      if (userProfile?.role === 'admin' || userProfile?.role === 'superadmin') {
        return student.classes
          .filter(c => c && c.name)
          .map(c => String(c.name))
          .join(', ') || '-'
      }
      
      // If teacher, filter to only classes they teach
      if (userProfile?.role === 'teacher' && userProfile.classes && Array.isArray(userProfile.classes)) {
        const teacherClassIds = userProfile.classes
          .filter(c => c && c.id)
          .map(c => String(c.id))
        const studentTeacherClasses = student.classes.filter(c => 
          c && c.id && teacherClassIds.includes(String(c.id))
        )
        if (studentTeacherClasses.length === 0) {
          return '-' // Student tidak punya kelas yang diajarkan guru ini
        }
        return studentTeacherClasses
          .filter(c => c && c.name)
          .map(c => String(c.name))
          .join(', ') || '-'
      }
      
      // Default: return first class
      const firstClass = student.classes[0]
      return (firstClass && firstClass.name) ? String(firstClass.name) : '-'
    } catch (error) {
      console.error('Error in getDisplayClasses:', error, student)
      return '-'
    }
  }

  // Ensure students is an array and filter out invalid entries
  const validStudents = Array.isArray(students) 
    ? students.filter(s => s && typeof s === 'object' && s.id && s.name)
    : []

  const tableData = validStudents.length > 0
    ? validStudents
        .sort((a, b) => {
          const nameA = String(a.name || '').toLowerCase()
          const nameB = String(b.name || '').toLowerCase()
          return nameA.localeCompare(nameB)
        })
        .map((student) => {
          try {
            return {
              id: String(student.id || ''),
              name: String(student.name || ''),
              gender: String(student.gender || '-'),
              class_name: getDisplayClasses(student),
              daerah_name: String(student.daerah_name || '-'),
              desa_name: String(student.desa_name || '-'),
              kelompok_name: String(student.kelompok_name || '-'),
              actions: String(student.id || ''), // We'll use this in renderCell
            }
          } catch (error) {
            console.error('Error mapping student to table data:', error, student)
            return null
          }
        })
        .filter(Boolean) // Remove any null entries
    : []

  const renderCell = (column: any, item: any, index: number) => {
    if (column.key === 'actions') {
      const student = validStudents.find(s => s && s.id === item.actions);
      
      if (!student) {
        return null;
      }
      
      return (
        <div className="flex gap-4 justify-center items-center">
          {/* View Attendance - Link to student detail */}
          <Link
            href={`/users/siswa/${student.id}`}
            className="text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-300 transition-colors"
            title="Lihat Absensi"
            onClick={() => handleStudentClick(student.id, 'actions')}
          >
            <ReportIcon className="w-6 h-6" />
          </Link>

          {/* View Biodata */}
          <Link
            href={`/users/siswa/${student.id}/biodata`}
            className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 transition-colors"
            title="Lihat Biodata"
            onClick={() => handleStudentClick(student.id, 'actions')}
          >
            <UserCircleIcon className="w-6 h-6" />
          </Link>

          {/* Edit Action */}
          <button
            onClick={() => onEdit(student)}
            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
            title="Edit"
          >
            <PencilIcon className="w-5 h-5" />
          </button>

          {/* Archive Action - only for users with permission and active students */}
          {canArchiveStudent(userProfile as any || null, student) && onArchive && student.status === 'active' && (
            <button
              onClick={() => onArchive(student)}
              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
              title="Arsipkan"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                />
              </svg>
            </button>
          )}

          {/* Unarchive Action - only for users with permission and archived students */}
          {canArchiveStudent(userProfile as any || null, student) && onUnarchive && (student.status === 'graduated' || student.status === 'inactive') && (
            <button
              onClick={() => onUnarchive(student)}
              className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 transition-colors"
              title="Kembalikan ke Aktif"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          )}

          {/* Transfer Action - for users with transfer permission, disabled if has pending transfer */}
          {canTransferStudent(userProfile as any || null, student) && onTransfer && (() => {
            const hasPendingTransfer = studentsWithPendingTransfer?.has(student.id)
            return (
              <button
                onClick={() => !hasPendingTransfer && onTransfer([student])}
                disabled={hasPendingTransfer}
                className={`transition-colors ${
                  hasPendingTransfer
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300'
                }`}
                title={hasPendingTransfer ? 'Siswa memiliki permintaan transfer yang pending' : 'Transfer'}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                  />
                </svg>
              </button>
            )
          })()}

          {/* Soft Delete Action - for users with permission, only if not already soft deleted */}
          {canSoftDeleteStudent(userProfile as any || null, student) && !student.deleted_at && (
            <button
              onClick={() => handleDeleteClick(item.actions, student?.name || '')}
              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors"
              title="Hapus (Soft Delete)"
            >
              <TrashBinIcon className="w-5 h-5" />
            </button>
          )}

          {/* Hard Delete Action - ONLY for superadmin and ONLY if already soft deleted */}
          {canHardDeleteStudent(userProfile as any || null, student) && student.deleted_at && (
            <button
              onClick={() => handleDeleteClick(item.actions, student?.name || '')}
              className="text-red-700 hover:text-red-900 dark:text-red-500 dark:hover:text-red-400 transition-colors"
              title="Hapus Permanen (Hard Delete) ⚠️"
            >
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM8 9h8v10H8V9zm7.5-5l-1-1h-5l-1 1H5v2h14V4z"
                />
              </svg>
            </button>
          )}
        </div>
      );
    }
    
    // Handle name column - make it clickable
    if (column.key === 'name') {
      const student = validStudents.find(s => s && s.id === item.actions)
      
      if (!student) {
        return item.name || '-'
      }
      
      return (
        <Link 
          href={`/users/siswa/${student.id}`}
          className="hover:text-blue-600 hover:underline"
          onClick={() => handleStudentClick(student.id, 'name')}
        >
          {item.name}
        </Link>
      )
    }
    
    // Handle organizational columns
    if (['daerah_name', 'desa_name', 'kelompok_name', 'class_name'].includes(column.key)) {
      return item[column.key] || '-';
    }
    
    return item[column.key] || '-'
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={tableData}
        renderCell={renderCell}
        loadingRowId={loadingStudentId}
        loadingColumnKey={clickedColumn}
        spinnerSize={16}
        pagination={true}
        searchable={true}
        itemsPerPageOptions={[5, 10, 25, 50]}
        defaultItemsPerPage={10}
        searchPlaceholder="Cari siswa..."
        className="bg-white dark:bg-gray-800"
        headerClassName="bg-gray-50 dark:bg-gray-700"
        rowClassName="hover:bg-gray-50 dark:hover:bg-gray-700"
      />

      <DeleteStudentModal
        isOpen={deleteModal.isOpen}
        onClose={handleDeleteCancel}
        onSoftDelete={handleSoftDelete}
        onHardDelete={handleHardDelete}
        studentId={deleteModal.studentId}
        studentName={deleteModal.studentName}
        hasAttendance={deleteModal.hasAttendance}
        isLoading={deleteModal.isLoading}
        userProfile={userProfile}
        studentDeletedAt={deleteModal.deletedAt}
      />
    </>
  )
}
