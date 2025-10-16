'use client'

import { useState } from 'react'
import DataTable from '@/components/table/Table'
import TableActions from '@/components/table/TableActions'
import ConfirmModal from '@/components/ui/modal/ConfirmModal'
import { PencilIcon, TrashBinIcon } from '@/lib/icons'
import { Student } from '@/hooks/useStudents'
import { isAdminLegacy, isAdminDaerah, isAdminDesa, isAdminKelompok } from '@/lib/userUtils'

interface StudentsTableProps {
  students: Student[]
  userRole: string | null
  onEdit: (student: Student) => void
  onDelete: (studentId: string) => void
  userProfile: { 
    role: string; 
    classes?: Array<{ id: string; name: string }> 
  } | null | undefined
}

export default function StudentsTable({ 
  students, 
  userRole, 
  onEdit, 
  onDelete, 
  userProfile 
}: StudentsTableProps) {
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean
    studentId: string
    studentName: string
  }>({
    isOpen: false,
    studentId: '',
    studentName: ''
  })

  const handleDeleteClick = (studentId: string, studentName: string) => {
    setDeleteModal({
      isOpen: true,
      studentId,
      studentName
    })
  }

  const handleDeleteConfirm = () => {
    onDelete(deleteModal.studentId)
    setDeleteModal({
      isOpen: false,
      studentId: '',
      studentName: ''
    })
  }

  const handleDeleteCancel = () => {
    setDeleteModal({
      isOpen: false,
      studentId: '',
      studentName: ''
    })
  }
  // Build columns based on user role
  const buildColumns = (userProfile: any) => {
    const baseColumns = [
      { key: 'name', label: 'Nama', align: 'left' as const },
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
    // Teacher: no org columns
    
    return [
      ...baseColumns,
      ...orgColumns,
      { key: 'actions', label: 'Aksi', align: 'center' as const, width: '24' }
    ];
  };

  const columns = buildColumns(userProfile);

  const tableData = students
    .sort((a, b) => a.name.localeCompare(b.name)) // Sort by name
    .map((student) => ({
      name: student.name,
      gender: student.gender || '-',
      class_name: student.class_name || '-',
      daerah_name: student.daerah_name || '-',
      desa_name: student.desa_name || '-',
      kelompok_name: student.kelompok_name || '-',
      actions: student.id, // We'll use this in renderCell
    }))

  const renderCell = (column: any, item: any, index: number) => {
    if (column.key === 'actions') {
      const student = students.find(s => s.id === item.actions)!;
      
      // Parent decides which actions to include
      const actions: Array<{
        id: string;
        icon: React.ComponentType<{ className?: string }>;
        onClick: () => void;
        title: string;
        color: 'blue' | 'yellow' | 'red' | 'green' | 'indigo';
      }> = [
        {
          id: 'edit',
          icon: PencilIcon,
          onClick: () => onEdit(student),
          title: 'Edit',
          color: 'indigo'
        }
      ];
      
      // Only add delete action if user is admin
      if (userRole === 'admin') {
        actions.push({
          id: 'delete',
          icon: TrashBinIcon,
          onClick: () => handleDeleteClick(item.actions, student?.name || ''),
          title: 'Hapus',
          color: 'red'
        });
      }
      
      return <TableActions actions={actions} />;
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
        pagination={true}
        searchable={true}
        itemsPerPageOptions={[5, 10, 25, 50]}
        defaultItemsPerPage={10}
        searchPlaceholder="Cari siswa..."
        className="bg-white dark:bg-gray-800"
        headerClassName="bg-gray-50 dark:bg-gray-700"
        rowClassName="hover:bg-gray-50 dark:hover:bg-gray-700"
      />

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Hapus Siswa"
        message={`Apakah Anda yakin ingin menghapus siswa "${deleteModal.studentName}"?`}
        confirmText="Hapus"
        cancelText="Batal"
        isDestructive={true}
      />
    </>
  )
}
