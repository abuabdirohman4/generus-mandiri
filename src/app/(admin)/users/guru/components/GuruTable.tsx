"use client";

import DataTable from '@/components/table/Table';
import TableActions from '@/components/table/TableActions';
import { PencilIcon, TrashBinIcon, LockIcon } from '@/lib/icons';
import { isAdminDaerah, isAdminDesa } from '@/lib/userUtils';
import { UserProfile } from '@/lib/accessControl';

interface Guru {
  id: string;
  full_name: string;
  email: string;
  kelompok_name?: string;
  daerah_name?: string;
  desa_name?: string;
  class_count?: number;
  created_at: string;
}

interface GuruTableProps {
  data: Guru[];
  onEdit: (guru: Guru) => void;
  onDelete: (guru: Guru) => void;
  onResetPassword: (guru: Guru) => void;
  userProfile?: UserProfile | null;
}

export default function GuruTable({ data, onEdit, onDelete, onResetPassword, userProfile }: GuruTableProps) {
  // Build columns based on user role
  const buildColumns = (userProfile: UserProfile | null | undefined) => {
    const baseColumns = [
      { key: 'full_name', label: 'Nama Lengkap', sortable: true },
      { key: 'email', label: 'Email', sortable: true },
    ];
    
    const orgColumns = [];
    
    // Superadmin sees all org levels
    if (userProfile?.role === 'superadmin') {
      orgColumns.push(
        { key: 'daerah_name', label: 'Daerah', sortable: true },
        { key: 'desa_name', label: 'Desa', sortable: true },
        { key: 'kelompok_name', label: 'Kelompok', sortable: true }
      );
    }
    // Admin Daerah sees Desa & Kelompok
    else if (userProfile && isAdminDaerah(userProfile)) {
      orgColumns.push(
        { key: 'desa_name', label: 'Desa', sortable: true },
        { key: 'kelompok_name', label: 'Kelompok', sortable: true }
      );
    }
    // Admin Desa sees Kelompok only
    else if (userProfile && isAdminDesa(userProfile)) {
      orgColumns.push(
        { key: 'kelompok_name', label: 'Kelompok', sortable: true }
      );
    }
    // Teacher & Admin Kelompok: no org columns
    
    return [
      ...baseColumns,
      ...orgColumns,
      { key: 'created_at', label: 'Dibuat', sortable: true },
      { key: 'actions', label: 'Actions', align: 'center' as const, sortable: false }
    ];
  };

  const columns = buildColumns(userProfile);

  const renderCell = (column: any, item: any) => {
    if (column.key === 'created_at') {
      return new Date(item[column.key]).toLocaleDateString('id-ID');
    }
    
    if (column.key === 'actions') {
      return (
        <TableActions
          actions={[
            {
              id: 'edit',
              icon: PencilIcon,
              onClick: () => onEdit(item),
              title: 'Edit',
              color: 'indigo'
            },
            {
              id: 'reset-password',
              icon: LockIcon,
              onClick: () => onResetPassword(item),
              title: 'Reset Password',
              color: 'yellow'
            },
            {
              id: 'delete',
              icon: TrashBinIcon,
              onClick: () => onDelete(item),
              title: 'Hapus',
              color: 'red'
            }
          ]}
        />
      );
    }
    
    // Handle organizational columns
    if (['daerah_name', 'desa_name', 'kelompok_name'].includes(column.key)) {
      return item[column.key] || '-';
    }
    
    return item[column.key] || '-';
  };

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">👨‍🏫</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Belum ada guru
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Mulai dengan menambahkan guru pertama
          </p>
        </div>
      </div>
    );
  }

  return <DataTable columns={columns} data={data} renderCell={renderCell} />;
}