'use client';

import { useState, useEffect, useMemo } from 'react';
import { MaterialCategory, MaterialType, MaterialItem, ClassMaster } from '../types';
import { 
  getMaterialCategories, 
  getMaterialTypes, 
  getAllMaterialItems,
  getClassesWithMaterialItems,
  getMaterialItemsByClass,
  getMaterialItemsWithClassMappings,
  deleteMaterialCategory,
  deleteMaterialType,
  deleteMaterialItem
} from '../actions';
import Button from '@/components/ui/button/Button';
import { PencilIcon, TrashBinIcon } from '@/lib/icons';
import ConfirmModal from '@/components/ui/modal/ConfirmModal';
import CategoryModal from './CategoryModal';
import TypeModal from './TypeModal';
import ItemModal from './ItemModal';
import DataTable from '@/components/table/Table';
import { toast } from 'sonner';

type ViewMode = 'material' | 'class';

// Helper component untuk Material Items Table
interface MaterialItemsTableProps {
  items: MaterialItem[];
  onEdit: (item: MaterialItem) => void;
  onDelete: (item: MaterialItem) => void;
  typeName?: string;
  typeDescription?: string | null;
  typeId?: string;
  onCreateItem?: (typeId: string) => void;
  onEditType?: (type: MaterialType) => void;
  onDeleteType?: (type: MaterialType) => void;
  type?: MaterialType; // Full type object for edit/delete
}

function MaterialItemsTable({ items, onEdit, onDelete, typeName, typeDescription, typeId, onCreateItem, onEditType, onDeleteType, type }: MaterialItemsTableProps) {
  const columns = [
    // {
    //   key: 'no',
    //   label: 'No',
    //   align: 'center' as const,
    //   width: '48px',
    //   sortable: false
    // },
    {
      key: 'name',
      label: 'Nama Item',
      align: 'left' as const,
      sortable: true
    },
    {
      key: 'actions',
      label: 'Aksi',
      align: 'center' as const,
      sortable: false
    }
  ];

  // Create a map for quick lookup
  const itemsMap = new Map(items.map(item => [item.id, item]));

  // Sort items by name for consistent display
  const sortedItems = [...items].sort((a, b) => a.name.localeCompare(b.name));
  
  const tableData = sortedItems.map((item) => ({
    id: item.id,
    name: item.name,
    itemId: item.id // Store the item ID for reference
  }));

  const renderCell = (column: any, item: any, index: number) => {
    const materialItem = itemsMap.get(item.itemId);
    
    if (column.key === 'no') {
      // Use index from DataTable (already adjusted for pagination/sorting)
      return (
        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          {index + 1}
        </div>
      );
    }
    
    if (column.key === 'name') {
      return (
        <div className="text-sm font-medium text-gray-900 dark:text-white">
          {item.name}
        </div>
      );
    }
    
    if (column.key === 'actions') {
      if (!materialItem) return null;
      
      return (
        <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onEdit(materialItem)}
            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
            title="Edit"
          >
            <PencilIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => onDelete(materialItem)}
            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors"
            title="Hapus"
          >
            <TrashBinIcon className="w-5 h-5" />
          </button>
        </div>
      );
    }
    
    return item[column.key] || '-';
  };

  return (
    <div className="p-3">
      {/* Type Header Section - Consolidated */}
      {typeName && (
        <div className="mb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                {/* <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div> */}
                <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                  {typeName}
                </h4>
              </div>
              {/* {typeDescription && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-5">
                  {typeDescription}
                </p>
              )}
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 ml-5">
                {items.length} item
              </p> */}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {onEditType && type && (
                <button
                  onClick={() => onEditType(type)}
                  className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                  title="Edit Type"
                >
                  <PencilIcon className="w-5 h-5" />
                </button>
              )}
              {onDeleteType && type && (
                <button
                  onClick={() => onDeleteType(type)}
                  className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                  title="Hapus Type"
                >
                  <TrashBinIcon className="w-5 h-5" />
                </button>
              )}
              {typeId && onCreateItem && (
                <Button
                  onClick={() => onCreateItem(typeId)}
                  variant="primary"
                  size="xs"
                >
                  + Tambah Item
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Table Section */}
      {items.length === 0 ? (
        <div className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
          Belum ada item untuk jenis materi ini
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={tableData}
          renderCell={renderCell}
          pagination={false}
          searchable={false}
          searchPlaceholder="Cari item..."
          className="bg-white dark:bg-gray-800"
          headerClassName="bg-gray-50 dark:bg-gray-700"
          rowClassName="hover:bg-gray-50 dark:hover:bg-gray-700"
        />
      )}
    </div>
  );
}

export default function MasterDataView() {
  const [categories, setCategories] = useState<MaterialCategory[]>([]);
  const [types, setTypes] = useState<MaterialType[]>([]);
  const [items, setItems] = useState<MaterialItem[]>([]);
  const [classes, setClasses] = useState<ClassMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('material');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MaterialCategory | null>(null);
  const [editingType, setEditingType] = useState<MaterialType | null>(null);
  const [editingItem, setEditingItem] = useState<MaterialItem | null>(null);
  const [defaultCategoryId, setDefaultCategoryId] = useState<string | undefined>();
  const [defaultTypeId, setDefaultTypeId] = useState<string | undefined>();
  
  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    item: MaterialCategory | MaterialType | MaterialItem | null;
    type: 'category' | 'type' | 'item';
  }>({
    isOpen: false,
    item: null,
    type: 'category'
  });

  useEffect(() => {
    loadMasterData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  const loadMasterData = async () => {
    try {
      setLoading(true);
      if (viewMode === 'material') {
        const [categoriesData, typesData, itemsData] = await Promise.all([
          getMaterialCategories(),
          getMaterialTypes(),
          getAllMaterialItems()
        ]);

        setCategories(categoriesData);
        setTypes(typesData);
        setItems(itemsData);
      } else {
        // Load data for "View by Class"
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
      console.error('Error loading master data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMasterData();
  }, [viewMode]);

  // Group types by category
  const typesByCategory = useMemo(() => {
    const grouped: Record<string, MaterialType[]> = {};
    types.forEach(type => {
      if (!grouped[type.category_id]) {
        grouped[type.category_id] = [];
      }
      grouped[type.category_id].push(type);
    });
    return grouped;
  }, [types]);

  // Group items by material type
  const itemsByType = useMemo(() => {
    const grouped: Record<string, MaterialItem[]> = {};
    items.forEach(item => {
      if (!grouped[item.material_type_id]) {
        grouped[item.material_type_id] = [];
      }
      grouped[item.material_type_id].push(item);
    });
    return grouped;
  }, [items]);

  // Group items by class for "View by Class" mode
  const itemsByClass = useMemo(() => {
    if (viewMode !== 'class') return {};
    
    const grouped: Record<string, {
      class: ClassMaster;
      itemsByType: Record<string, MaterialItem[]>;
    }> = {};

    classes.forEach(classMaster => {
      const classItems = items.filter(item => 
        item.classes?.some(c => c.id === classMaster.id)
      );
      
      if (classItems.length > 0) {
        const itemsByTypeForClass: Record<string, MaterialItem[]> = {};
        classItems.forEach(item => {
          if (!itemsByTypeForClass[item.material_type_id]) {
            itemsByTypeForClass[item.material_type_id] = [];
          }
          itemsByTypeForClass[item.material_type_id].push(item);
        });
        
        grouped[classMaster.id] = {
          class: classMaster,
          itemsByType: itemsByTypeForClass
        };
      }
    });

    return grouped;
  }, [viewMode, classes, items]);

  // Filter classes for "View by Class" mode
  const filteredClasses = useMemo(() => {
    if (viewMode !== 'class') return [];
    if (!searchQuery.trim()) return classes;

    const query = searchQuery.toLowerCase();
    return classes.filter(classMaster => {
      const classMatches = classMaster.name.toLowerCase().includes(query);
      const classData = itemsByClass[classMaster.id];
      if (!classData) return false;

      const typeMatches = Object.keys(classData.itemsByType).some(typeId => {
        const type = types.find(t => t.id === typeId);
        if (!type) return false;
        return type.name.toLowerCase().includes(query) ||
               (type.description?.toLowerCase().includes(query) || false);
      });

      const itemMatches = Object.values(classData.itemsByType).some(typeItems => {
        return typeItems.some(item =>
          item.name.toLowerCase().includes(query) ||
          (item.description?.toLowerCase().includes(query) || false) ||
          (item.content?.toLowerCase().includes(query) || false)
        );
      });

      return classMatches || typeMatches || itemMatches;
    });
  }, [viewMode, classes, itemsByClass, types, searchQuery]);

  // Filter data based on search query (for "View by Material" mode)
  const filteredCategories = useMemo(() => {
    if (viewMode !== 'material') return [];
    if (!searchQuery.trim()) return categories;

    const query = searchQuery.toLowerCase();
    return categories.filter(cat => {
      const categoryMatches = cat.name.toLowerCase().includes(query) ||
                              (cat.description?.toLowerCase().includes(query) || false);
      
      const categoryTypes = typesByCategory[cat.id] || [];
      const typeMatches = categoryTypes.some(type => 
        type.name.toLowerCase().includes(query) ||
        (type.description?.toLowerCase().includes(query) || false)
      );

      const itemMatches = categoryTypes.some(type => {
        const typeItems = itemsByType[type.id] || [];
        return typeItems.some(item =>
          item.name.toLowerCase().includes(query) ||
          (item.description?.toLowerCase().includes(query) || false) ||
          (item.content?.toLowerCase().includes(query) || false)
        );
      });

      return categoryMatches || typeMatches || itemMatches;
    });
  }, [viewMode, categories, typesByCategory, itemsByType, searchQuery]);

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleType = (typeId: string) => {
    const newExpanded = new Set(expandedTypes);
    if (newExpanded.has(typeId)) {
      newExpanded.delete(typeId);
    } else {
      newExpanded.add(typeId);
    }
    setExpandedTypes(newExpanded);
  };

  const getCategoryIcon = (categoryName: string): string => {
    const icons: Record<string, string> = {
      'Alim: Baca-Tulis': '📖',
      'Alim: Hafalan': '🧠',
      'Alim: Keilmuan': '📚',
      'Faqih': '📜',
      'Akhlakul Karimah': '💎',
    };
    return icons[categoryName] || '📝';
  };

  // CRUD Handlers for Categories
  const handleCreateCategory = () => {
    setEditingCategory(null);
    setCategoryModalOpen(true);
  };

  const handleEditCategory = (category: MaterialCategory) => {
    setEditingCategory(category);
    setCategoryModalOpen(true);
  };

  const handleDeleteCategory = (category: MaterialCategory) => {
    setDeleteConfirm({
      isOpen: true,
      item: category,
      type: 'category'
    });
  };

  // CRUD Handlers for Types
  const handleCreateType = (categoryId?: string) => {
    setEditingType(null);
    setDefaultCategoryId(categoryId);
    setTypeModalOpen(true);
  };

  const handleEditType = (type: MaterialType) => {
    setEditingType(type);
    setTypeModalOpen(true);
  };

  const handleDeleteType = (type: MaterialType) => {
    setDeleteConfirm({
      isOpen: true,
      item: type,
      type: 'type'
    });
  };

  // CRUD Handlers for Items
  const handleCreateItem = (typeId?: string) => {
    setEditingItem(null);
    setDefaultTypeId(typeId);
    setItemModalOpen(true);
  };

  const handleEditItem = (item: MaterialItem) => {
    setEditingItem(item);
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
  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.item) return;

    try {
      if (deleteConfirm.type === 'category') {
        await deleteMaterialCategory((deleteConfirm.item as MaterialCategory).id);
        toast.success('Kategori berhasil dihapus');
      } else if (deleteConfirm.type === 'type') {
        await deleteMaterialType((deleteConfirm.item as MaterialType).id);
        toast.success('Jenis materi berhasil dihapus');
      } else if (deleteConfirm.type === 'item') {
        await deleteMaterialItem((deleteConfirm.item as MaterialItem).id);
        toast.success('Item materi berhasil dihapus');
      }
      
      await loadMasterData();
      setDeleteConfirm({ isOpen: false, item: null, type: 'category' });
    } catch (error: any) {
      console.error('Error deleting:', error);
      toast.error(error.message || 'Gagal menghapus');
    }
  };

  const getDeleteMessage = (): string => {
    if (!deleteConfirm.item) return '';
    
    const itemName = 'name' in deleteConfirm.item ? deleteConfirm.item.name : '';
    
    if (deleteConfirm.type === 'category') {
      return `Apakah Anda yakin ingin menghapus kategori <br> "${itemName}"?`;
    } else if (deleteConfirm.type === 'type') {
      return `Apakah Anda yakin ingin menghapus jenis materi <br> "${itemName}"?`;
    } else {
      return `Apakah Anda yakin ingin menghapus item materi <br> "${itemName}"?`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Master Data Materi
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Kelola kategori, jenis materi, dan item materi
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Add Category Button */}
            {/* {viewMode === 'material' && (
              <Button
                onClick={handleCreateCategory}
                variant="primary"
                size="sm"
              >
                + Tambah Kategori
              </Button>
            )} */}
            
            {/* View Mode Switcher */}
            <div className="flex gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('material')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'material'
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              View by Material
            </button>
            <button
              onClick={() => setViewMode('class')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'class'
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              View by Class
              </button>
            </div>
          </div>
          </div>

        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari kategori, jenis materi, atau item..."
            className="w-full px-4 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
          <svg
            className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* View by Material */}
      {viewMode === 'material' && (
        <>
          {/* Categories List */}
          {filteredCategories.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              {searchQuery ? 'Tidak ada hasil untuk pencarian ini' : 'Belum ada kategori materi'}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCategories.map((category) => {
                const allCategoryTypes = typesByCategory[category.id] || [];
                const categoryTypes = !searchQuery.trim()
                  ? allCategoryTypes
                  : allCategoryTypes.filter(type => {
                      const query = searchQuery.toLowerCase();
                      const typeMatches = type.name.toLowerCase().includes(query) ||
                                        (type.description?.toLowerCase().includes(query) || false);
                      const typeItems = itemsByType[type.id] || [];
                      const itemMatches = typeItems.some(item =>
                        item.name.toLowerCase().includes(query) ||
                        (item.description?.toLowerCase().includes(query) || false) ||
                        (item.content?.toLowerCase().includes(query) || false)
                      );
                      return typeMatches || itemMatches;
                    });
                    
                  const isExpanded = expandedCategories.has(category.id);
                  const totalItems = allCategoryTypes.reduce((sum, type) => {
                  return sum + (itemsByType[type.id]?.length || 0);
                }, 0);

                return (
                  <div
                    key={category.id}
                    className="bg-white dark:bg-gray-800 rounded-lg border shadow-sm overflow-hidden"
                  >
                    {/* Category Header */}
                    <div className="flex items-center">
                      <button
                        onClick={() => toggleCategory(category.id)}
                        className="flex-1 px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <span className="text-3xl">{getCategoryIcon(category.name)}</span>
                          <div className="text-left flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {category.name}
                            </h3>
                            {category.description && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {category.description}
                              </p>
                            )}
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                              {categoryTypes.length} jenis materi • {totalItems} item
                            </p>
                          </div>
                        </div>
                        <svg
                          className={`h-5 w-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {/* Edit/Delete Buttons */}
                      <div className="flex items-center gap-2 px-4" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleEditCategory(category)}
                          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                          title="Edit"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                          title="Hapus"
                        >
                          <TrashBinIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Category Content - Types */}
                    {isExpanded && (
                      <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                        {/* <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700">
                          <Button
                            onClick={() => handleCreateType(category.id)}
                            variant="primary"
                            size="sm"
                          >
                            + Tambah Jenis Materi
                          </Button>
                        </div> */}
                        {categoryTypes.length === 0 ? (
                          <div className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                            Belum ada jenis materi untuk kategori ini
                          </div>
                        ) : (
                          <div className="space-y-2 p-4">
                            {categoryTypes
                              .filter(type => {
                                if (!searchQuery.trim()) return true;
                                const query = searchQuery.toLowerCase();
                                const typeMatches = type.name.toLowerCase().includes(query) ||
                                                  (type.description?.toLowerCase().includes(query) || false);
                                const typeItems = itemsByType[type.id] || [];
                                const itemMatches = typeItems.some(item =>
                                  item.name.toLowerCase().includes(query) ||
                                  (item.description?.toLowerCase().includes(query) || false) ||
                                  (item.content?.toLowerCase().includes(query) || false)
                                );
                                return typeMatches || itemMatches;
                              })
                              .map((type) => {
                                const allTypeItems = itemsByType[type.id] || [];
                                const filteredTypeItems = !searchQuery.trim() 
                                  ? allTypeItems 
                                  : allTypeItems.filter(item => {
                                      const query = searchQuery.toLowerCase();
                                      return item.name.toLowerCase().includes(query) ||
                                            (item.description?.toLowerCase().includes(query) || false) ||
                                            (item.content?.toLowerCase().includes(query) || false);
                                    });

                              return (
                                <div
                                  key={type.id}
                                  className="bg-white dark:bg-gray-800 rounded-lg"
                                >
                                  {/* Type Content - Items Table (Always Visible) */}
                                  <div className="bg-gray-50 dark:bg-gray-900/30">
                                    <MaterialItemsTable
                                      items={filteredTypeItems}
                                      onEdit={handleEditItem}
                                      onDelete={handleDeleteItem}
                                      typeName={type.name}
                                      typeDescription={type.description}
                                      typeId={type.id}
                                      onCreateItem={handleCreateItem}
                                      onEditType={handleEditType}
                                      onDeleteType={handleDeleteType}
                                      type={type}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* View by Class */}
      {viewMode === 'class' && (
        <>
          {filteredClasses.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              {searchQuery ? 'Tidak ada hasil untuk pencarian ini' : 'Belum ada kelas dengan item materi'}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredClasses.map((classMaster) => {
                const classData = itemsByClass[classMaster.id];
                if (!classData) return null;

                const isExpanded = expandedClasses.has(classMaster.id);
                const classTypes = Object.keys(classData.itemsByType)
                  .map(typeId => types.find(t => t.id === typeId))
                  .filter((type): type is MaterialType => type !== undefined);

                // Filter types based on search query
                const filteredClassTypes = !searchQuery.trim()
                  ? classTypes
                  : classTypes.filter(type => {
                      const query = searchQuery.toLowerCase();
                      const typeMatches = type.name.toLowerCase().includes(query) ||
                                         (type.description?.toLowerCase().includes(query) || false);
                      const typeItems = classData.itemsByType[type.id] || [];
                      const itemMatches = typeItems.some(item =>
                        item.name.toLowerCase().includes(query) ||
                        (item.description?.toLowerCase().includes(query) || false) ||
                        (item.content?.toLowerCase().includes(query) || false)
                      );
                      return typeMatches || itemMatches;
                    });

                const totalItems = classTypes.reduce((sum, type) => {
                  return sum + (classData.itemsByType[type.id]?.length || 0);
                }, 0);

                return (
                  <div
                    key={classMaster.id}
                    className="bg-white dark:bg-gray-800 rounded-lg border shadow-sm overflow-hidden"
                  >
                    {/* Class Header */}
                    <button
                      onClick={() => {
                        const newExpanded = new Set(expandedClasses);
                        if (newExpanded.has(classMaster.id)) {
                          newExpanded.delete(classMaster.id);
                        } else {
                          newExpanded.add(classMaster.id);
                        }
                        setExpandedClasses(newExpanded);
                      }}
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <span className="text-3xl">🏫</span>
                        <div className="text-left flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {classMaster.name}
                          </h3>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {filteredClassTypes.length} jenis materi • {totalItems} item
                          </p>
                        </div>
                      </div>
                      <svg
                        className={`h-5 w-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Class Content - Material Types */}
                    {isExpanded && (
                      <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                        {filteredClassTypes.length === 0 ? (
                          <div className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                            Belum ada jenis materi untuk kelas ini
                          </div>
                        ) : (
                          <div className="space-y-2 p-4">
                            {filteredClassTypes
                              .sort((a, b) => {
                                // Sort by category display_order, then by type display_order
                                const categoryA = a.category?.display_order || 0;
                                const categoryB = b.category?.display_order || 0;
                                if (categoryA !== categoryB) return categoryA - categoryB;
                                return a.display_order - b.display_order;
                              })
                              .map((type) => {
                                const typeItems = classData.itemsByType[type.id] || [];
                                const filteredTypeItems = !searchQuery.trim()
                                  ? typeItems
                                  : typeItems.filter(item => {
                                      const query = searchQuery.toLowerCase();
                                      return item.name.toLowerCase().includes(query) ||
                                             (item.description?.toLowerCase().includes(query) || false) ||
                                             (item.content?.toLowerCase().includes(query) || false);
                                    });
                                const categoryIcon = type.category ? getCategoryIcon(type.category.name) : '📝';

                                return (
                                  <div
                                    key={type.id}
                                    className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                                  >
                                    {/* Type Content - Items Table (Always Visible) */}
                                    <div className="bg-gray-50 dark:bg-gray-900/30">
                                      <MaterialItemsTable
                                        items={filteredTypeItems}
                                        onEdit={handleEditItem}
                                        onDelete={handleDeleteItem}
                                        typeName={type.name}
                                        typeDescription={type.description}
                                        typeId={type.id}
                                        onCreateItem={handleCreateItem}
                                        onEditType={handleEditType}
                                        onDeleteType={handleDeleteType}
                                        type={type}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Summary */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {viewMode === 'material' ? categories.length : classes.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {viewMode === 'material' ? 'Kategori' : 'Kelas'}
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {types.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Materi</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {items.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Submateri</div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CategoryModal
        isOpen={categoryModalOpen}
        onClose={() => {
          setCategoryModalOpen(false);
          setEditingCategory(null);
        }}
        category={editingCategory}
        onSuccess={loadMasterData}
      />

      <TypeModal
        isOpen={typeModalOpen}
        onClose={() => {
          setTypeModalOpen(false);
          setEditingType(null);
          setDefaultCategoryId(undefined);
        }}
        type={editingType}
        defaultCategoryId={defaultCategoryId}
        onSuccess={loadMasterData}
      />

      <ItemModal
        isOpen={itemModalOpen}
        onClose={() => {
          setItemModalOpen(false);
          setEditingItem(null);
          setDefaultTypeId(undefined);
        }}
        item={editingItem}
        defaultTypeId={defaultTypeId}
        onSuccess={loadMasterData}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, item: null, type: 'category' })}
        onConfirm={handleDeleteConfirm}
        title={
          deleteConfirm.type === 'category' 
            ? 'Hapus Kategori'
            : deleteConfirm.type === 'type'
            ? 'Hapus Jenis Materi'
            : 'Hapus Item Materi'
        }
        message={getDeleteMessage()}
        confirmText="Hapus"
        cancelText="Batal"
        isDestructive={true}
        isLoading={false}
      />
    </div>
  );
}

