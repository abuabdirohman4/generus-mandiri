"use client";

import { useState } from 'react';
import { useDaerah } from '@/hooks/useDaerah';
import { useDesa } from '@/hooks/useDesa';
import { useKelompok } from '@/hooks/useKelompok';
import { deleteDaerah } from './actions/daerah';
import { deleteDesa } from './actions/desa';
import { deleteKelompok } from './actions/kelompok';
import DaerahTable from './components/DaerahTable';
import DesaTable from './components/DesaTable';
import KelompokTable from './components/KelompokTable';
import DaerahModal from './components/DaerahModal';
import DesaModal from './components/DesaModal';
import KelompokModal from './components/KelompokModal';
import ConfirmModal from '@/components/ui/modal/ConfirmModal';
import SuperadminTableSkeleton from '@/components/ui/skeleton/SuperadminTableSkeleton';

type TabType = 'daerah' | 'desa' | 'kelompok';

export default function OrganisasiManagementPage() {
  const { daerah, isLoading: daerahLoading, error: daerahError, mutate: mutateDaerah } = useDaerah();
  const { desa, isLoading: desaLoading, error: desaError, mutate: mutateDesa } = useDesa();
  const { kelompok, isLoading: kelompokLoading, error: kelompokError, mutate: mutateKelompok } = useKelompok();
  
  const [activeTab, setActiveTab] = useState<TabType>('daerah');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; item: any; type: TabType }>({
    isOpen: false,
    item: null,
    type: 'daerah'
  });

  const isLoading = daerahLoading || desaLoading || kelompokLoading;
  const error = daerahError || desaError || kelompokError;

  const handleCreate = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = (item: any, type: TabType) => {
    setDeleteConfirm({ isOpen: true, item, type });
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleDeleteClose = () => {
    setDeleteConfirm({ isOpen: false, item: null, type: 'daerah' });
  };

  const handleDeleteConfirm = async () => {
    try {
      switch (deleteConfirm.type) {
        case 'daerah':
          await deleteDaerah(deleteConfirm.item.id);
          mutateDaerah();
          break;
        case 'desa':
          await deleteDesa(deleteConfirm.item.id);
          mutateDesa();
          break;
        case 'kelompok':
          await deleteKelompok(deleteConfirm.item.id);
          mutateKelompok();
          break;
      }
      handleDeleteClose();
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const handleSuccess = () => {
    switch (activeTab) {
      case 'daerah':
        mutateDaerah();
        break;
      case 'desa':
        mutateDesa();
        break;
      case 'kelompok':
        mutateKelompok();
        break;
    }
    handleModalClose();
  };

  const tabs = [
    { id: 'daerah', label: 'Daerah', count: daerah?.length || 0 },
    { id: 'desa', label: 'Desa', count: desa?.length || 0 },
    { id: 'kelompok', label: 'Kelompok', count: kelompok?.length || 0 }
  ];

  if (isLoading) {
    return <SuperadminTableSkeleton />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold">Error loading data</div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
            <div className="flex justify-between items-center">
                <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    Manajemen Organisasi
                </h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                    Kelola data daerah, desa, dan kelompok dalam sistem
                </p>
                </div>
                <button
                onClick={handleCreate}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                Tambah
                </button>
            </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
                <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
                >
                {tab.label}
                <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                    activeTab === tab.id
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                }`}>
                    {tab.count}
                </span>
                </button>
            ))}
            </nav>
        </div>

        {/* Content */}
        <div className="mt-6">
            {activeTab === 'daerah' && (
            <DaerahTable
                data={daerah || []}
                onEdit={handleEdit}
                onDelete={(item) => handleDelete(item, 'daerah')}
            />
            )}
            
            {activeTab === 'desa' && (
            <DesaTable
                data={desa || []}
                onEdit={handleEdit}
                onDelete={(item) => handleDelete(item, 'desa')}
            />
            )}
            
            {activeTab === 'kelompok' && (
            <KelompokTable
                data={kelompok || []}
                onEdit={handleEdit}
                onDelete={(item) => handleDelete(item, 'kelompok')}
            />
            )}
        </div>

        {/* Modals */}
        {activeTab === 'daerah' && (
            <DaerahModal
            isOpen={isModalOpen}
            onClose={handleModalClose}
            daerah={editingItem}
            onSuccess={handleSuccess}
            />
        )}
        
        {activeTab === 'desa' && (
            <DesaModal
            isOpen={isModalOpen}
            onClose={handleModalClose}
            desa={editingItem}
            daerahList={daerah || []}
            onSuccess={handleSuccess}
            />
        )}
        
        {activeTab === 'kelompok' && (
            <KelompokModal
            isOpen={isModalOpen}
            onClose={handleModalClose}
            kelompok={editingItem}
            desaList={desa || []}
            onSuccess={handleSuccess}
            />
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmModal
            isOpen={deleteConfirm.isOpen}
            onClose={handleDeleteClose}
            onConfirm={handleDeleteConfirm}
            title={`Hapus ${tabs.find(t => t.id === deleteConfirm.type)?.label}?`}
            message={`Apakah Anda yakin ingin menghapus ${deleteConfirm.type} "${deleteConfirm.item?.name}"?`}
            confirmText="Hapus"
            cancelText="Batal"
            isDestructive={true}
            isLoading={false}
        />
        </div>
    </div>
  );
}
