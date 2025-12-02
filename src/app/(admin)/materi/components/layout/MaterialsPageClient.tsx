'use client';

import { useState, useEffect } from 'react';
import { ClassMaster, MaterialCategory, MaterialType, MaterialItem } from '../../types';
import { getMaterialCategories, getMaterialTypes, getAllMaterialItems } from '../../actions';
import MaterialsLayout from '../daily/MaterialsLayout';
import MasterDataView from '../views/MasterDataView';
import MateriContentView from '../views/MateriContentView';
import MateriSidebar from './MateriSidebar';
import { useMateriStore } from '../../stores/materiStore';
import { isAdmin, isTeacher } from '@/lib/accessControl';

interface MaterialsPageClientProps {
  classMasters: ClassMaster[];
  userProfile: any;
}

type ViewMode = 'daily' | 'master';

export default function MaterialsPageClient({ classMasters, userProfile }: MaterialsPageClientProps) {
  const [activeTab, setActiveTab] = useState<ViewMode>('master');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Data for sidebar
  const [categories, setCategories] = useState<MaterialCategory[]>([]);
  const [types, setTypes] = useState<MaterialType[]>([]);
  const [items, setItems] = useState<MaterialItem[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Determine user role
  const isAdminUser = userProfile ? isAdmin(userProfile) : false;
  const isTeacherUser = userProfile ? isTeacher(userProfile) : false;

  // Load data for sidebar
  useEffect(() => {
    if (activeTab === 'master') {
      loadSidebarData();
    }
  }, [activeTab]);

  const loadSidebarData = async () => {
    try {
      setDataLoading(true);
      const [categoriesData, typesData, itemsData] = await Promise.all([
        getMaterialCategories(),
        getMaterialTypes(),
        getAllMaterialItems()
      ]);
      setCategories(categoriesData);
      setTypes(typesData);
      setItems(itemsData);
    } catch (error) {
      console.error('Error loading sidebar data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900">
      <div className="max-w-full px-0">
        {/* Header - Only show when not in master tab with sidebar */}
        {activeTab !== 'master' && (
          <div className="px-6 py-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Materi Pembelajaran</h1>
            <p className="text-gray-600 dark:text-gray-400">
              {activeTab === 'daily'
                ? 'Akses materi pembelajaran per minggu'
                : 'Kelola master data kategori, jenis materi, dan item materi'}
            </p>
          </div>
        )}

        {/* Tabs - Only show for Admin */}
        {/* {isAdminUser && (
          <div className="px-6">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                <button
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
              </button>
                <button
                  onClick={() => setActiveTab('master')}
                  className={`
                    py-4 px-1 border-b-2 font-medium text-sm transition-colors
                    ${activeTab === 'master'
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
        )} */}

        {/* Content */}
        {activeTab === 'daily' ? (
          <div className="px-6 py-6">
            <MaterialsLayout
              classMasters={classMasters}
              userProfile={userProfile}
            />
          </div>
        ) : (
          // Master Data with Sidebar Layout
          <div className="flex h-[calc(100vh-8rem)] relative">
            {/* Sidebar */}
            {!dataLoading && (
              <MateriSidebar
                categories={categories}
                types={types}
                items={items}
                isOpen={sidebarOpen}
                onToggle={() => setSidebarOpen(!sidebarOpen)}
              />
            )}

            {/* Main Content */}
            <div className="flex-1 overflow-auto">
              {/* Mobile Header with Hamburger */}
              <div className="lg:hidden sticky top-0 z-20 bg-white dark:bg-gray-800 rounded-lg border shadow-sm border-gray-200 dark:border-gray-700 px-4 py-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSidebarOpen(true)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                  <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {isAdminUser ? 'Daftar Materi' : 'Materi Pembelajaran'}
                  </h1>
                </div>
              </div>

              {/* Role-Based Content */}
              <div className="pb-12 py-0 md:pb-0 md:px-6">
                <MateriContentView
                  categories={categories}
                  types={types}
                  items={items}
                  userProfile={userProfile}
                  onEditItem={isAdminUser ? (item) => {
                    // TODO: Open edit modal
                    console.log('Edit item:', item);
                  } : undefined}
                  onDeleteItem={isAdminUser ? (item) => {
                    // TODO: Open delete confirmation
                    console.log('Delete item:', item);
                  } : undefined}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
