"use client";

import { useState, useEffect } from 'react';
import { useUserProfile } from '@/stores/userProfileStore';
import { getAllClassMasters, deleteClassMaster, toggleClassMasterActive } from '../actions/masters';
import { ClassMaster } from '../actions/masters';
import { isSuperAdmin } from '@/lib/userUtils';
import Button from '@/components/ui/button/Button';
import { PlusIcon, PencilIcon, TrashBinIcon, EyeIcon, EyeOffIcon } from '@/lib/icons';
import ClassMasterModal from './ClassMasterModal';
import KelasSkeleton from '@/components/ui/skeleton/KelasSkeleton';
import DataTable from '@/components/table/Table';
import TableActions from '@/components/table/TableActions';

export default function ClassMastersTab() {
  const { profile: userProfile } = useUserProfile();
  const [masters, setMasters] = useState<ClassMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMaster, setEditingMaster] = useState<ClassMaster | null>(null);

  const canEdit = userProfile ? isSuperAdmin(userProfile) : false;

  useEffect(() => {
    loadMasters();
  }, []);

  const loadMasters = async () => {
    try {
      setLoading(true);
      const data = await getAllClassMasters();
      setMasters(data);
    } catch (error) {
      console.error('Error loading masters:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingMaster(null);
    setShowModal(true);
  };

  const handleEdit = (master: ClassMaster) => {
    setEditingMaster(master);
    setShowModal(true);
  };

  const handleDelete = async (master: ClassMaster) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus "${master.name}"?`)) {
      return;
    }

    try {
      await deleteClassMaster(master.id);
      await loadMasters();
    } catch (error) {
      console.error('Error deleting master:', error);
    }
  };

  const handleToggleActive = async (master: ClassMaster) => {
    try {
      await toggleClassMasterActive(master.id, !master.is_active);
      await loadMasters();
    } catch (error) {
      console.error('Error toggling master status:', error);
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingMaster(null);
    loadMasters();
  };

  if (loading) {
    return <KelasSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Template Kelas
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {canEdit ? 'Kelola template kelas yang tersedia' : 'Lihat template kelas yang tersedia'}
          </p>
        </div>
        {canEdit && (
          <Button onClick={handleCreate} className="flex items-center gap-2">
            Tambah Template
          </Button>
        )}
      </div>

      {/* Masters Table */}
      <DataTable
        columns={[
          { key: 'sort_order', label: 'No.', width: '0px', align: 'center' },
          { key: 'name', label: 'Nama Kelas', sortable: true },
          { key: 'description', label: 'Deskripsi' },
          // { key: 'is_active', label: 'Status', width: '120px', align: 'center' },
          ...(canEdit ? [{ key: 'actions', label: 'Aksi', width: '120px', align: 'center' as const }] : [])
        ]}
        data={masters}
        renderCell={(column, master) => {
          switch (column.key) {
            case 'sort_order':
              return (
                <span className="text-sm text-gray-900 dark:text-white">
                  {master.sort_order}
                </span>
              );
            case 'name':
              return (
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {master.name}
                </div>
              );
            case 'description':
              return (
                <div className="text-sm text-gray-900 dark:text-white">
                  {master.description || '-'}
                </div>
              );
            // case 'is_active':
            //   return (
            //     <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            //       master.is_active 
            //         ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            //         : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
            //     }`}>
            //       {master.is_active ? 'Aktif' : 'Tidak Aktif'}
            //     </span>
            //   );
            case 'actions':
              return (
                <TableActions
                  actions={[
                    // {
                    //   id: 'toggle-active',
                    //   icon: master.is_active ? EyeOffIcon : EyeIcon,
                    //   onClick: () => handleToggleActive(master),
                    //   title: master.is_active ? 'Nonaktifkan' : 'Aktifkan',
                    //   color: 'indigo'
                    // },
                    {
                      id: 'edit',
                      icon: PencilIcon,
                      onClick: () => handleEdit(master),
                      title: 'Edit',
                      color: 'blue'
                    },
                    {
                      id: 'delete',
                      icon: TrashBinIcon,
                      onClick: () => handleDelete(master),
                      title: 'Hapus',
                      color: 'red'
                    }
                  ]}
                />
              );
            default:
              return null;
          }
        }}
        searchPlaceholder="Cari template kelas..."
        defaultItemsPerPage={10}
      />

      {/* Modal */}
      {showModal && (
        <ClassMasterModal
          master={editingMaster}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
}
