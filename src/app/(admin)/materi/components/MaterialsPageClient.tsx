'use client';

import { useState } from 'react';
import { ClassMaster } from '../types';
import MaterialsLayout from './MaterialsLayout';
import MasterDataView from './MasterDataView';

interface MaterialsPageClientProps {
  classMasters: ClassMaster[];
  userProfile: any;
}

type ViewMode = 'daily' | 'master';

export default function MaterialsPageClient({ classMasters, userProfile }: MaterialsPageClientProps) {
  const [activeTab, setActiveTab] = useState<ViewMode>('master');

  return (
    <div className="bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Materi Pembelajaran</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {activeTab === 'daily' 
              ? 'Akses materi pembelajaran per minggu' 
              : 'Kelola master data kategori, jenis materi, dan item materi'}
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              {/* <button
                onClick={() => setActiveTab('daily')}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${
                    activeTab === 'daily'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }
                `}
              >
                Materi Harian
              </button> */}
              <button
                onClick={() => setActiveTab('master')}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${
                    activeTab === 'master'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }
                `}
              >
                Master Data
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'daily' ? (
          <MaterialsLayout 
            classMasters={classMasters}
            userProfile={userProfile}
          />
        ) : (
          <MasterDataView />
        )}
      </div>
    </div>
  );
}

