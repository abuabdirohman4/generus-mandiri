"use client";

import DataTable from '@/components/table/Table';
import TableActions from '@/components/table/TableActions';
import { PencilIcon, TrashBinIcon, LockIcon } from '@/lib/icons';

interface Guru {
  id: string;
  full_name: string;
  email: string;
  kelompok_name?: string;
  class_count?: number;
  created_at: string;
}

interface GuruTableProps {
  data: Guru[];
  onEdit: (guru: Guru) => void;
  onDelete: (guru: Guru) => void;
  onResetPassword: (guru: Guru) => void;
}

export default function GuruTable({ data, onEdit, onDelete, onResetPassword }: GuruTableProps) {
  const columns = [
    { key: 'full_name', label: 'Nama Lengkap', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'kelompok_name', label: 'Kelompok', sortable: true },
    { key: 'class_count', label: 'Jumlah Kelas', align: 'center' as const },
    { key: 'created_at', label: 'Dibuat', sortable: true },
    { key: 'actions', label: 'Actions', align: 'center' as const, sortable: false }
  ];

  const renderCell = (column: any, item: any) => {
    if (column.key === 'class_count') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          {item[column.key] || 0}
        </span>
      );
    }
    
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