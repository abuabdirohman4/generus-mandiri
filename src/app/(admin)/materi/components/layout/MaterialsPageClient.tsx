'use client';

import { useState, useEffect } from 'react';
import { ClassMaster, MaterialCategory, MaterialType, MaterialItem } from '../../types';
import { getMaterialCategories, getMaterialTypes, getAllMaterialItems, getClassesWithMaterialItems, getMaterialItemsWithClassMappings, deleteMaterialItem } from '../../actions';
import MaterialsLayout from '../daily/MaterialsLayout';
import MasterDataView from '../views/MasterDataView';
import MateriContentView from '../views/MateriContentView';
import MateriSidebar from './MateriSidebar';
import { MateriContentSkeleton } from '@/components/ui/skeleton/MateriSkeleton';
import { useMateriStore } from '../../stores/materiStore';
import { isAdmin, isTeacher } from '@/lib/accessControl';
import ItemModal from '../modals/ItemModal';
import ConfirmModal from '@/components/ui/modal/ConfirmModal';
import { toast } from 'sonner';

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
  const [classes, setClasses] = useState<ClassMaster[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Modal states
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MaterialItem | null>(null);
  const [defaultTypeId, setDefaultTypeId] = useState<string | undefined>();
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    item: MaterialItem | null;
    type: 'item';
  }>({
    isOpen: false,
    item: null,
    type: 'item'
  });

  // Determine user role
  const isAdminUser = userProfile ? isAdmin(userProfile) : false;
  const isTeacherUser = userProfile ? isTeacher(userProfile) : false;
  const isKelas6Warlob = isTeacher(userProfile) && userProfile.id === '88888888-8888-8888-8888-888888888888'

  // Materi store
  const { filters } = useMateriStore();

  const selectedCategory = categories.find(c => c.id === filters.selectedCategoryId);
  const selectedType = types.find(t => t.id === filters.selectedTypeId);
  const selectedClass = classes.find(c => c.id === filters.selectedClassId);

  // Load data for sidebar
  useEffect(() => {
    if (activeTab === 'master') {
      loadSidebarData();
    }
  }, [activeTab, filters.viewMode]);

  const loadSidebarData = async () => {
    try {
      setDataLoading(true);

      if (filters.viewMode === 'by_material') {
        // Load data for material view
        const [categoriesData, typesData, itemsData] = await Promise.all([
          getMaterialCategories(),
          getMaterialTypes(),
          getAllMaterialItems()
        ]);
        setCategories(categoriesData);
        setTypes(typesData);
        setItems(itemsData);
        setClasses([]); // Clear classes when in material mode
      } else {
        // Load data for class view - need class mappings
        const [categoriesData, typesData, classesData, itemsData] = await Promise.all([
          getMaterialCategories(),
          getMaterialTypes(),
          getClassesWithMaterialItems(),
          getMaterialItemsWithClassMappings()
        ]);
        setCategories(categoriesData);
        setTypes(typesData);
        setClasses(classesData);
        setItems(itemsData);
      }
    } catch (error) {
      console.error('Error loading sidebar data:', error);
    } finally {
      setDataLoading(false);
    }
  };


  // CRUD Handlers for Items
  const handleEditItem = (item: MaterialItem) => {
    setEditingItem(item);
    setDefaultTypeId(undefined);
    setItemModalOpen(true);
  };

  const handleDeleteItem = (item: MaterialItem) => {
    setDeleteConfirm({
      isOpen: true,
      item: item,
      type: 'item'
    });
  };

  // Delete confirmation handler
  const handleConfirmDelete = async () => {
    if (!deleteConfirm.item) return;

    try {
      await deleteMaterialItem(deleteConfirm.item.id);
      toast.success('Item materi berhasil dihapus');
      await loadSidebarData();
      setDeleteConfirm({ isOpen: false, item: null, type: 'item' });
    } catch (error: any) {
      console.error('Error deleting item:', error);
      toast.error(error.message || 'Gagal menghapus item materi');
    }
  };

  // Success handler after create/update
  const handleItemSuccess = async () => {
    await loadSidebarData();
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
            <MateriSidebar
              categories={categories}
              types={types}
              items={items}
              classes={classes}
              isOpen={sidebarOpen}
              onToggle={() => setSidebarOpen(!sidebarOpen)}
              isLoading={dataLoading}
            />

            {/* Main Content */}
            <div className="flex-1 overflow-auto">
              {/* Mobile Header with Hamburger */}
              <div className="lg:hidden sticky top-0 z-20 bg-white dark:bg-gray-800 rounded-lg border shadow-sm border-gray-200 dark:border-gray-700 px-2 py-3">
                {isSearchOpen ? (
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cari materi..."
                        autoFocus
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                      <svg
                        className="absolute left-3 top-2.5 w-5 h-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <button
                      onClick={() => {
                        setIsSearchOpen(false);
                        setSearchQuery('');
                      }}
                      className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      Batal
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                      </button>
                      <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate max-w-[200px]">
                        {selectedType
                          ? selectedType.name
                          : (filters.viewMode === 'by_class' && selectedClass
                            ? selectedClass.name
                            : (selectedCategory ? selectedCategory.name : 'Daftar Materi')
                          )
                        }
                      </h1>
                    </div>
                    <button
                      onClick={() => setIsSearchOpen(true)}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              {/* Role-Based Content */}
              <div className="pb-12 py-0 md:pb-0 md:px-6">
                {dataLoading ? (
                  <MateriContentSkeleton />
                ) : (
                  <MateriContentView
                    categories={categories}
                    types={types}
                    items={items}
                    userProfile={userProfile}
                    onEditItem={isAdminUser || isKelas6Warlob ? handleEditItem : undefined}
                    onDeleteItem={isAdminUser || isKelas6Warlob ? handleDeleteItem : undefined}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modals */}
        <ItemModal
          isOpen={itemModalOpen}
          onClose={() => {
            setItemModalOpen(false);
            setEditingItem(null);
            setDefaultTypeId(undefined);
          }}
          item={editingItem}
          defaultTypeId={defaultTypeId}
          onSuccess={handleItemSuccess}
        />

        <ConfirmModal
          isOpen={deleteConfirm.isOpen}
          onClose={() => setDeleteConfirm({ isOpen: false, item: null, type: 'item' })}
          onConfirm={handleConfirmDelete}
          title="Hapus Item Materi?"
          message={`Apakah Anda yakin ingin menghapus item materi "${deleteConfirm.item?.name}"?`}
          confirmText="Hapus"
          cancelText="Batal"
          isDestructive={true}
        />
      </div>
    </div>
  );
}
