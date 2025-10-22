"use client";

import { useState, useEffect } from 'react';
import { useUserProfile } from '@/stores/userProfileStore';
import { getAllClassMasters, deleteClassMaster } from '../actions/masters';
import { ClassMaster } from '../actions/masters';
import { isSuperAdmin } from '@/lib/userUtils';
import Button from '@/components/ui/button/Button';
import { PencilIcon, TrashBinIcon } from '@/lib/icons';
import ClassMasterModal from './ClassMasterModal';
import KelasSkeleton from '@/components/ui/skeleton/KelasSkeleton';
import DataTable from '@/components/table/Table';
import TableActions from '@/components/table/TableActions';
import ConfirmModal from '@/components/ui/modal/ConfirmModal';

export default function ClassMastersTab() {
  const { profile: userProfile } = useUserProfile();
  const [masters, setMasters] = useState<ClassMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMaster, setEditingMaster] = useState<ClassMaster | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [masterToDelete, setMasterToDelete] = useState<ClassMaster | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const handleDelete = (master: ClassMaster) => {
    setMasterToDelete(master);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!masterToDelete) return;

    try {
      setDeleting(true);
      await deleteClassMaster(masterToDelete.id);
      await loadMasters();
      setShowDeleteModal(false);
      setMasterToDelete(null);
    } catch (error) {
      console.error('Error deleting master:', error);
    } finally {
      setDeleting(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setMasterToDelete(null);
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
            Master Kelas
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {canEdit ? 'Kelola kelas yang tersedia' : 'Lihat kelas yang tersedia'}
          </p>
        </div>
        {canEdit && (
          <Button onClick={handleCreate} className="flex items-center gap-2">
            Tambah Master
          </Button>
        )}
      </div>

      {/* Masters Table */}
      <DataTable
        columns={[
          { key: 'sort_order', label: 'No.', width: '0px', align: 'center' },
          { key: 'name', label: 'Nama Kelas', sortable: true },
          { key: 'description', label: 'Deskripsi' },
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
            case 'actions':
              return (
                <TableActions
                  actions={[
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
        searchPlaceholder="Cari Master Kelas..."
        defaultItemsPerPage={10}
      />

      {/* Modal */}
      {showModal && (
        <ClassMasterModal
          master={editingMaster}
          onClose={handleModalClose}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title="Hapus Master Kelas"
        message={`Apakah Anda yakin ingin menghapus template "${masterToDelete?.name}"?`}
        confirmText="Hapus"
        cancelText="Batal"
        isDestructive={true}
        isLoading={deleting}
      />
    </div>
  );
}
