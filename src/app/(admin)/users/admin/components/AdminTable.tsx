"use client";

import DataTable from '@/components/table/Table';
import TableActions from '@/components/table/TableActions';
import { PencilIcon, TrashBinIcon, LockIcon } from '@/lib/icons';

interface Admin {
  id: string;
  full_name: string;
  email: string;
  role: string;
  kelompok_name?: string;
  created_at: string;
}

interface AdminTableProps {
  data: Admin[];
  onEdit: (admin: Admin) => void;
  onDelete: (admin: Admin) => void;
  onResetPassword: (admin: Admin) => void;
}

export default function AdminTable({ data, onEdit, onDelete, onResetPassword }: AdminTableProps) {
  const columns = [
    { key: 'full_name', label: 'Nama Lengkap', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'role', label: 'Role', sortable: true },
    { key: 'kelompok_name', label: 'Kelompok', sortable: true },
    { key: 'created_at', label: 'Dibuat', sortable: true },
    { key: 'actions', label: 'Actions', align: 'center' as const, sortable: false }
  ];

  const renderCell = (column: any, item: any) => {
    if (column.key === 'role') {
      const roleColors = {
        admin: 'blue',
        superadmin: 'purple'
      };
      const color = roleColors[item.role as keyof typeof roleColors] || 'gray';
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${color}-100 text-${color}-800 dark:bg-${color}-900 dark:text-${color}-200`}>
          {item.role}
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
          <div className="text-gray-400 text-6xl mb-4">👤</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Belum ada admin
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Mulai dengan menambahkan admin pertama
          </p>
        </div>
      </div>
    );
  }

  return <DataTable columns={columns} data={data} renderCell={renderCell} />;
}