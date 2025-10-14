"use client";

import DataTable from '@/components/table/Table';
import TableActions from '@/components/table/TableActions';
import { PencilIcon, TrashBinIcon } from '@/lib/icons';

interface Desa {
  id: string;
  name: string;
  daerah_name?: string;
  created_at: string;
  kelompok_count?: number;
  siswa_count?: number;
}

interface DesaTableProps {
  data: Desa[];
  onEdit: (desa: Desa) => void;
  onDelete: (desa: Desa) => void;
}

export default function DesaTable({ data, onEdit, onDelete }: DesaTableProps) {
  const columns = [
    { key: 'name', label: 'Nama Desa', sortable: true },
    { key: 'daerah_name', label: 'Daerah', sortable: true },
    { key: 'kelompok_count', label: 'Jumlah Kelompok', align: 'center' as const },
    { key: 'siswa_count', label: 'Jumlah Siswa', align: 'center' as const },
    { key: 'created_at', label: 'Dibuat', sortable: true },
    { key: 'actions', label: 'Actions', align: 'center' as const, sortable: false }
  ];

  const renderCell = (column: any, item: any) => {
    if (column.key === 'kelompok_count' || column.key === 'siswa_count') {
      const colorMap = {
        kelompok_count: 'green',
        siswa_count: 'purple'
      };
      const color = colorMap[column.key as keyof typeof colorMap];
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${color}-100 text-${color}-800 dark:bg-${color}-900 dark:text-${color}-200`}>
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
    
    return item[column.key];
  };

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">🏘️</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Belum ada desa
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Mulai dengan menambahkan desa pertama
          </p>
        </div>
      </div>
    );
  }

  return <DataTable columns={columns} data={data} renderCell={renderCell} />;
}
