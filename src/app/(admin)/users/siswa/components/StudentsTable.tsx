'use client'

import { useState } from 'react'
import Link from 'next/link'
import DataTable from '@/components/table/Table'
import DeleteStudentModal from './DeleteStudentModal'
import { PencilIcon, TrashBinIcon, EyeIcon, ReportIcon } from '@/lib/icons'
import { Student } from '@/hooks/useStudents'
import { isAdminLegacy, isAdminDaerah, isAdminDesa, isAdminKelompok } from '@/lib/userUtils'
import { checkStudentHasAttendance } from '../actions'

interface StudentsTableProps {
  students: Student[]
  userRole: string | null
  onEdit: (student: Student) => void
  onDelete: (studentId: string, permanent: boolean) => void
  userProfile: { 
    role: string; 
    classes?: Array<{ id: string; name: string }> 
  } | null | undefined
  classes?: Array<{ id: string; name: string; kelompok_id?: string | null }>
}

export default function StudentsTable({ 
  students, 
  userRole, 
  onEdit, 
  onDelete, 
  userProfile,
  classes: classesData
}: StudentsTableProps) {
  const [loadingStudentId, setLoadingStudentId] = useState<string | null>(null)
  const [clickedColumn, setClickedColumn] = useState<'name' | 'actions' | null>(null)
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean
    studentId: string
    studentName: string
    hasAttendance: boolean
    isLoading: boolean
  }>({
    isOpen: false,
    studentId: '',
    studentName: '',
    hasAttendance: false,
    isLoading: false
  })
  
  const handleStudentClick = (studentId: string, column: 'name' | 'actions') => {
    setLoadingStudentId(studentId)
    setClickedColumn(column)
  }

  const handleDeleteClick = async (studentId: string, studentName: string) => {
    // Check attendance before opening modal
    setDeleteModal({
      isOpen: true,
      studentId,
      studentName,
      hasAttendance: false,
      isLoading: true
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
      isLoading: false
    })
  }

  const handleHardDelete = () => {
    onDelete(deleteModal.studentId, true)
    setDeleteModal({
      isOpen: false,
      studentId: '',
      studentName: '',
      hasAttendance: false,
      isLoading: false
    })
  }

  const handleDeleteCancel = () => {
    setDeleteModal({
      isOpen: false,
      studentId: '',
      studentName: '',
      hasAttendance: false,
      isLoading: false
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
          {/* View Action - Link to student detail */}
          <Link 
            href={`/users/siswa/${student.id}`}
            className="text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-300 transition-colors"
            title="Lihat Detail"
            onClick={() => handleStudentClick(student.id, 'actions')}
          >
            <ReportIcon className="w-6 h-6" />
          </Link>
          
          {/* Edit Action */}
          <button
            onClick={() => onEdit(student)}
            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
            title="Edit"
          >
            <PencilIcon className="w-5 h-5" />
          </button>
          
          {/* Delete Action - only for admin */}
          {(userRole === 'admin' || userRole === 'superadmin') && (
            <button
              onClick={() => handleDeleteClick(item.actions, student?.name || '')}
              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors"
              title="Hapus"
            >
              <TrashBinIcon className="w-5 h-5" />
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
      />
    </>
  )
}
