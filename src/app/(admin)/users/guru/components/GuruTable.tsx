"use client";

import DataTable from '@/components/table/Table';
import TableActions from '@/components/table/TableActions';
import { PencilIcon, TrashBinIcon, LockIcon, SettingsIcon } from '@/lib/icons';
import { isAdminDaerah, isAdminDesa, isAdminKelompok, UserProfile } from '@/lib/userUtils';

interface Guru {
  id: string;
  full_name: string;
  email: string;
  kelompok_name?: string;
  daerah_name?: string;
  desa_name?: string;
  class_names?: string;
  created_at: string;
  permissions?: {
    can_archive_students?: boolean;
    can_transfer_students?: boolean;
    can_soft_delete_students?: boolean;
    can_hard_delete_students?: boolean;
  };
}

interface GuruTableProps {
  data: Guru[];
  onEdit: (guru: Guru) => void;
  onDelete: (guru: Guru) => void;
  onResetPassword: (guru: Guru) => void;
  onConfigureForm?: (guru: Guru) => void;
  userProfile?: UserProfile | null;
}

export default function GuruTable({ data, onEdit, onDelete, onResetPassword, onConfigureForm, userProfile }: GuruTableProps) {
  // Build columns based on user role
  const buildColumns = (userProfile: UserProfile | null | undefined) => {
    const baseColumns = [
      { key: 'full_name', label: 'Nama Lengkap', sortable: true },
      // { key: 'email', label: 'Email', sortable: true },
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
      { key: 'class_names', label: 'Kelas yang Diajar', width: '600px', widthMobile: '150px', sortable: true },
      ...orgColumns,
      // { key: 'created_at', label: 'Dibuat', sortable: true },
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
              id: 'configure-form',
              icon: SettingsIcon,
              onClick: () => onConfigureForm?.(item),
              title: 'Atur Form',
              color: 'blue'
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
    
    // Handle class names
    if (column.key === 'class_names') {
      return (
        <div className="text-sm text-gray-900 dark:text-white">
          {item.class_names || '-'}
        </div>
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