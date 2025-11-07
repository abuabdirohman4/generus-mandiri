"use client";

import { useState } from 'react';
import { useUserProfile } from '@/stores/userProfileStore';
import { useKelasStore } from './stores/kelasStore';
import { isSuperAdmin, isAdminDaerah, isAdminDesa, isAdminKelompok } from '@/lib/userUtils';
import ClassMastersTab from './components/ClassMastersTab';
import ClassesKelompokTab from './components/ClassesKelompokTab';
import Button from '@/components/ui/button/Button';

type TabType = 'masters' | 'kelompok';

export default function KelasPage() {
  const { profile: userProfile } = useUserProfile();
  const [activeTab, setActiveTab] = useState<TabType>('kelompok');
  
  // Get store actions for buttons
  const { openCreateKelompokModal, openCreateMasterModal } = useKelasStore();
  
  const tabs = [
    { id: 'kelompok', label: 'Kelas' },
    { id: 'masters', label: 'Master' }
  ];

  // Determine which button to show based on active tab and user permissions
  const canManageKelompok = userProfile ? (
    isSuperAdmin(userProfile) || 
    isAdminDaerah(userProfile) || 
    isAdminDesa(userProfile) || 
    isAdminKelompok(userProfile)
  ) : false;

  const canManageMasters = userProfile ? isSuperAdmin(userProfile) : false;

  const handleCreateClick = () => {
    if (activeTab === 'kelompok') {
      openCreateKelompokModal();
    } else if (activeTab === 'masters') {
      openCreateMasterModal();
    }
  };

  const getButtonText = () => {
    if (activeTab === 'kelompok') return 'Tambah Kelas';
    if (activeTab === 'masters') return 'Tambah Master';
    return 'Tambah';
  };

  const canShowButton = () => {
    if (activeTab === 'kelompok') return canManageKelompok;
    if (activeTab === 'masters') return canManageMasters;
    return false;
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Kelas
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Kelola kelas di setiap kelompok
              </p>
            </div>
            {canShowButton() && (
              <Button
                onClick={handleCreateClick}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {getButtonText()}
              </Button>
            )}
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
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        {activeTab === 'masters' && <ClassMastersTab />}
        {activeTab === 'kelompok' && <ClassesKelompokTab />}
      </div>
    </div>
  );
}
