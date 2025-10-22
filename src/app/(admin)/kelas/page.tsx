"use client";

import { useState } from 'react';
import { useUserProfile } from '@/stores/userProfileStore';
import ClassMastersTab from './components/ClassMastersTab';
import ClassesKelompokTab from './components/ClassesKelompokTab';

type TabType = 'masters' | 'kelompok';

export default function KelasPage() {
  const { profile: userProfile } = useUserProfile();
  const [activeTab, setActiveTab] = useState<TabType>('masters');
  
  const tabs = [
    { id: 'masters', label: 'Template Kelas' },
    { id: 'kelompok', label: 'Kelas Kelompok' }
  ];

  return (
    <div className="bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
