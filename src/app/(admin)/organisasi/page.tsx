"use client";

import { useOrganisasiPage } from './hooks/useOrganisasiPage';
import DaerahTable from './components/DaerahTable';
import DesaTable from './components/DesaTable';
import KelompokTable from './components/KelompokTable';
import DaerahModal from './components/DaerahModal';
import DesaModal from './components/DesaModal';
import KelompokModal from './components/KelompokModal';
import DataFilter from '@/components/shared/DataFilter';
import ConfirmModal from '@/components/ui/modal/ConfirmModal';
import SuperadminTableSkeleton from '@/components/ui/skeleton/SuperadminTableSkeleton';
import { isAdminDaerah, isAdminDesa, isAdminKelompok } from '@/lib/userUtils';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

type TabType = 'daerah' | 'desa' | 'kelompok';

// Helper function to generate dynamic description based on user role
const getPageDescription = (userProfile: any) => {
  const isSuperAdminUser = userProfile?.role === 'superadmin'
  const isAdminDaerahUser = isAdminDaerah(userProfile)
  const isAdminDesaUser = isAdminDesa(userProfile)
  
  if (isSuperAdminUser) {
    return 'Kelola data daerah, desa, dan kelompok dalam sistem'
  } else if (isAdminDaerahUser) {
    return 'Kelola data desa dan kelompok dalam sistem'
  } else if (isAdminDesaUser) {
    return 'Kelola data kelompok dalam sistem'
  }
  
  return 'Kelola struktur organisasi'
}

export default function OrganisasiManagementPage() {
  const router = useRouter();
  const {
    daerah,
    desa,
    kelompok,
    userProfile,
    isLoading,
    error,
    activeTab,
    isModalOpen,
    editingItem,
    deleteConfirm,
    daerahFilter,
    desaFilter,
    tabs,
    setActiveTab,
    openCreateModal,
    openEditModal,
    closeModal,
    openDeleteConfirm,
    closeDeleteConfirm,
    setDaerahFilter,
    setDesaFilter,
    handleDelete,
    handleSuccess
  } = useOrganisasiPage();

  // Check if user has access to this page
  useEffect(() => {
    if (!userProfile) return
    
    const isAdminKelompokUser = isAdminKelompok(userProfile)
    const isTeacher = userProfile.role === 'teacher'
    
    if (isAdminKelompokUser || isTeacher) {
      // Redirect to home page
      router.push('/home')
    }
  }, [userProfile, router])

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
                    Organisasi
                </h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                    {getPageDescription(userProfile)}
                </p>
                </div>
                <button
                onClick={openCreateModal}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                Tambah
                </button>
            </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
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

        {/* Conditional Filters */}
        {activeTab === 'desa' && (
          <div className="mt-6">
            <DataFilter
              filters={{
                daerah: daerahFilter,
                desa: '',
                kelompok: '',
                kelas: ''
              }}
              onFilterChange={(filters) => {
                setDaerahFilter(filters.daerah);
                setDesaFilter('');
              }}
              userProfile={userProfile}
              daerahList={daerah || []}
              desaList={desa || []}
              kelompokList={kelompok || []}
              classList={[]}
              showKelas={false}
              showDesa={false}
              showKelompok={false}
            />
          </div>
        )}
        
        {activeTab === 'kelompok' && (
          <div className="mt-6">
            <DataFilter
              filters={{
                daerah: daerahFilter,
                desa: desaFilter,
                kelompok: '',
                kelas: ''
              }}
              onFilterChange={(filters) => {
                setDaerahFilter(filters.daerah);
                setDesaFilter(filters.desa);
              }}
              userProfile={userProfile}
              daerahList={daerah || []}
              desaList={desa || []}
              kelompokList={kelompok || []}
              classList={[]}
              showKelas={false}
              showKelompok={false}
            />
          </div>
        )}

        {/* Content */}
        {activeTab === 'daerah' && (
          <DaerahTable
              data={daerah || []}
              onEdit={openEditModal}
              onDelete={(item) => openDeleteConfirm(item, 'daerah')}
          />
        )}
        
        {activeTab === 'desa' && (
          <DesaTable
              data={desa || []}
              onEdit={openEditModal}
              onDelete={(item) => openDeleteConfirm(item, 'desa')}
          />
        )}
        
        {activeTab === 'kelompok' && (
          <KelompokTable
              data={kelompok || []}
              onEdit={openEditModal}
              onDelete={(item) => openDeleteConfirm(item, 'kelompok')}
          />
        )}

        {/* Modals */}
        {activeTab === 'daerah' && (
            <DaerahModal
            isOpen={isModalOpen}
            onClose={closeModal}
            daerah={editingItem}
            onSuccess={handleSuccess}
            />
        )}
        
        {activeTab === 'desa' && (
            <DesaModal
            isOpen={isModalOpen}
            onClose={closeModal}
            desa={editingItem}
            daerahList={daerah || []}
            onSuccess={handleSuccess}
            />
        )}
        
        {activeTab === 'kelompok' && (
            <KelompokModal
            isOpen={isModalOpen}
            onClose={closeModal}
            kelompok={editingItem}
            desaList={desa || []}
            onSuccess={handleSuccess}
            />
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmModal
            isOpen={deleteConfirm.isOpen}
            onClose={closeDeleteConfirm}
            onConfirm={handleDelete}
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
