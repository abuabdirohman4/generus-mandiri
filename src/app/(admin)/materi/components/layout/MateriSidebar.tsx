'use client';

import { useState, useEffect } from 'react';
import { MaterialCategory, MaterialType, MaterialItem, ClassMaster } from '../../types';
import { useMateriStore } from '../../stores/materiStore';
import Skeleton from '@/components/ui/skeleton/Skeleton';
import { isMobile } from '@/lib/utils';
import { SemesterSection } from './SemesterSection';
import { PencilIcon, TrashBinIcon, PlusIcon, FolderIcon } from '@/lib/icons';
import CategoryModal from '../modals/CategoryModal';
import TypeModal from '../modals/TypeModal';
import ConfirmModal from '@/components/ui/modal/ConfirmModal';
import { deleteMaterialCategory, deleteMaterialType } from '../../actions';
import { toast } from 'sonner';
import DropdownMenu from '@/components/ui/dropdown/DropdownMenu';

interface MateriSidebarProps {
    categories: MaterialCategory[];
    types: MaterialType[];
    items: MaterialItem[];
    classes: ClassMaster[];
    isOpen: boolean;
    onToggle: () => void;
    isLoading?: boolean;
    onDataChange?: () => Promise<void>;
}

export default function MateriSidebar({
    categories,
    types,
    items,
    classes,
    isOpen,
    onToggle,
    isLoading = false,
    onDataChange
}: MateriSidebarProps) {
    const { filters, setFilter } = useMateriStore();
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

    // State for CRUD modals
    const [categoryModalOpen, setCategoryModalOpen] = useState(false);
    const [typeModalOpen, setTypeModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<MaterialCategory | null>(null);
    const [editingType, setEditingType] = useState<MaterialType | null>(null);
    const [showCreateMenu, setShowCreateMenu] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<{
        isOpen: boolean;
        item: MaterialCategory | MaterialType | null;
        type: 'category' | 'type';
    }>({ isOpen: false, item: null, type: 'category' });

    const toggleCategory = (categoryId: string) => {
        const newExpanded = new Set(expandedCategories);
        if (newExpanded.has(categoryId)) {
            newExpanded.delete(categoryId);
        } else {
            newExpanded.add(categoryId);
        }
        setExpandedCategories(newExpanded);
    };

    const handleCategoryClick = (categoryId: string) => {
        setFilter('selectedCategoryId', categoryId);
        setFilter('selectedTypeId', null);
        if (isMobile()) {
            onToggle();
        }
    };

    const handleTypeClick = (typeId: string) => {
        setFilter('selectedTypeId', typeId);
        setFilter('selectedCategoryId', null);
        if (isMobile()) {
            onToggle();
        }
    };

    const getTypesForCategory = (categoryId: string) => {
        return types.filter(t => t.category_id === categoryId);
    };

    const getItemCountForCategory = (categoryId: string) => {
        const categoryTypes = types.filter(t => t.category_id === categoryId);
        const typeIds = categoryTypes.map(t => t.id);
        return items.filter(i => typeIds.includes(i.material_type_id)).length;
    };

    const getItemCountForType = (typeId: string) => {
        return items.filter(i => i.material_type_id === typeId).length;
    };

    // Helper functions for class mode
    const getItemCountForClass = (classId: string) => {
        return items.filter(i => i.classes?.some(c => c.id === classId)).length;
    };

    const getTypesForClass = (classId: string) => {
        const classItems = items.filter(i => i.classes?.some(c => c.id === classId));
        const typeIds = new Set(classItems.map(i => i.material_type_id));
        return types.filter(t => typeIds.has(t.id));
    };

    const getItemCountForTypeInClass = (classId: string, typeId: string) => {
        return items.filter(i =>
            i.material_type_id === typeId &&
            i.classes?.some(c => c.id === classId)
        ).length;
    };

    const handleClassTypeClick = (classId: string, typeId: string) => {
        setFilter('selectedClassId', classId);
        setFilter('selectedTypeId', typeId);
        setFilter('selectedCategoryId', null);
        if (isMobile()) {
            onToggle();
        }
    };

    const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());

    const toggleClassExpand = (classId: string) => {
        const newExpanded = new Set(expandedClasses);
        if (newExpanded.has(classId)) {
            newExpanded.delete(classId);
        } else {
            newExpanded.add(classId);
        }
        setExpandedClasses(newExpanded);
    };

    // Semester expansion state
    const [expandedSemesters, setExpandedSemesters] = useState<
        Record<string, Set<1 | 2 | 'uncategorized'>>
    >({});

    const toggleSemesterExpand = (classId: string, semester: 1 | 2 | 'uncategorized') => {
        setExpandedSemesters(prev => {
            const classExpanded = prev[classId] || new Set();
            const newSet = new Set(classExpanded);

            if (newSet.has(semester)) {
                newSet.delete(semester);
            } else {
                newSet.add(semester);
            }

            return { ...prev, [classId]: newSet };
        });
    };

    const isSemesterExpanded = (classId: string, semester: 1 | 2 | 'uncategorized') => {
        return expandedSemesters[classId]?.has(semester) || false;
    };

    // Helper functions for semester-based filtering
    const getItemsBySemesterForClass = (classId: string) => {
        const classItems = items.filter(i => i.classes?.some(c => c.id === classId));

        return {
            semester1: classItems.filter(i =>
                i.classes?.some(c => c.id === classId && c.semester === 1)
            ),
            semester2: classItems.filter(i =>
                i.classes?.some(c => c.id === classId && c.semester === 2)
            ),
            uncategorized: classItems.filter(i =>
                i.classes?.some(c => c.id === classId && !c.semester)
            )
        };
    };

    const getTypesForSemesterInClass = (classId: string, semester: 1 | 2 | null) => {
        const semesterItems = semester === null
            ? getItemsBySemesterForClass(classId).uncategorized
            : semester === 1
                ? getItemsBySemesterForClass(classId).semester1
                : getItemsBySemesterForClass(classId).semester2;

        const typeIds = new Set(semesterItems.map(i => i.material_type_id));
        return types.filter(t => typeIds.has(t.id));
    };

    const getItemCountForTypeInSemester = (
        classId: string,
        typeId: string,
        semester: 1 | 2 | null
    ) => {
        return items.filter(i =>
            i.material_type_id === typeId &&
            i.classes?.some(c =>
                c.id === classId &&
                (semester === null ? !c.semester : c.semester === semester)
            )
        ).length;
    };

    const handleSemesterTypeClick = (classId: string, typeId: string, semester: 1 | 2 | null) => {
        setFilter('selectedClassId', classId);
        setFilter('selectedTypeId', typeId);
        setFilter('selectedSemester', semester);
        setFilter('selectedCategoryId', null);
        if (isMobile()) {
            onToggle();
        }
    };

    // CRUD Handlers for Categories and Types
    const handleEditCategory = (e: React.MouseEvent, category: MaterialCategory) => {
        e.stopPropagation();
        setEditingCategory(category);
        setCategoryModalOpen(true);
    };

    const handleEditType = (e: React.MouseEvent, type: MaterialType) => {
        e.stopPropagation();
        setEditingType(type);
        setTypeModalOpen(true);
    };

    const handleDeleteCategory = (e: React.MouseEvent, category: MaterialCategory) => {
        e.stopPropagation();
        setDeleteConfirm({ isOpen: true, item: category, type: 'category' });
    };

    const handleDeleteType = (e: React.MouseEvent, type: MaterialType) => {
        e.stopPropagation();
        setDeleteConfirm({ isOpen: true, item: type, type: 'type' });
    };

    const handleConfirmDelete = async () => {
        try {
            if (deleteConfirm.type === 'category') {
                await deleteMaterialCategory(deleteConfirm.item!.id);
                toast.success('Kategori berhasil dihapus');
            } else {
                await deleteMaterialType(deleteConfirm.item!.id);
                toast.success('Tipe berhasil dihapus');
            }
            if (onDataChange) {
                await onDataChange();
            }
        } catch (error: any) {
            toast.error(error.message || 'Gagal menghapus');
        } finally {
            setDeleteConfirm({ isOpen: false, item: null, type: 'category' });
        }
    };

    const handleCreateCategory = () => {
        setEditingCategory(null);
        setCategoryModalOpen(true);
        setShowCreateMenu(false);
    };

    const handleCreateType = () => {
        setEditingType(null);
        setTypeModalOpen(true);
        setShowCreateMenu(false);
    };

    // Close create menu on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (showCreateMenu && !(e.target as Element).closest('.create-menu-container')) {
                setShowCreateMenu(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [showCreateMenu]);

    return (
        <>
            {/* Overlay for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 lg:hidden z-30"
                    onClick={onToggle}
                />
            )}

            {/* Sidebar */}
            <aside className={`fixed lg:relative inset-y-0 left-0 z-99 md:z-0 w-80 bg-white rounded-lg border border-gray-200 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} flex flex-col `}>
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {/* {filters.viewMode === 'by_material' ? 'Kategori Materi' : 'Daftar Kelas'} */}
                            Daftar Materi
                        </h2>
                        <div className="flex items-center gap-2">
                            {/* Create Menu Dropdown - Hidden as fallback (replaced by FAB) */}
                            <div className="relative create-menu-container hidden">
                                <button
                                    onClick={() => setShowCreateMenu(!showCreateMenu)}
                                    className="flex justify-center items-center p-2 text-gray-600 hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                    title="Tambah Kategori/Tipe"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                </button>

                                {showCreateMenu && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                                        <button
                                            onClick={handleCreateCategory}
                                            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 rounded-t-lg"
                                        >
                                            <FolderIcon className="w-4 h-4" />
                                            Tambah Kategori
                                        </button>
                                        <button
                                            onClick={handleCreateType}
                                            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 rounded-b-lg"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                            </svg>
                                            Tambah Tipe
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Close button for mobile */}
                            <button
                                onClick={onToggle}
                                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* View Mode Toggle */}
                    <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                        <button
                            onClick={() => setFilter('viewMode', 'by_material')}
                            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${filters.viewMode === 'by_material' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                        >
                            Kategori
                        </button>
                        <button
                            onClick={() => setFilter('viewMode', 'by_class')}
                            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${filters.viewMode === 'by_class' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                        >
                            Kelas
                        </button>
                    </div>
                </div>

                {/* Content - Conditional based on view mode */}
                <div className="flex-1 overflow-y-auto p-4">
                    {isLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="space-y-2">
                                    <div className="flex items-center gap-2 px-3 py-2">
                                        <Skeleton className="w-5 h-5 rounded" />
                                        <Skeleton className="h-5 w-3/4" />
                                        <Skeleton className="h-4 w-8 ml-auto" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : filters.viewMode === 'by_material' ? (
                        // Category Tree for Material View
                        <>
                            {categories
                                .sort((a, b) => a.display_order - b.display_order)
                                // .sort((a, b) => a.name.localeCompare(b.name))
                                .map(category => {
                                    const categoryTypes = getTypesForCategory(category.id);
                                    const itemCount = getItemCountForCategory(category.id);
                                    const isExpanded = expandedCategories.has(category.id);
                                    const isSelected = filters.selectedCategoryId === category.id;

                                    return (
                                        <div key={category.id} className="mb-2">
                                            {/* Category */}
                                            <div className="group flex items-center justify-between">
                                                <div
                                                    onClick={() => toggleCategory(category.id)}
                                                    className={`flex-1 flex items-center gap-2 px-1 py-2 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                                                >
                                                    {/* Expand/Collapse Icon */}
                                                    <button
                                                        className="shrink-0 w-5 h-5 flex items-center justify-center"
                                                    >
                                                        {categoryTypes.length > 0 && (
                                                            <svg
                                                                className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                                                fill="none"
                                                                stroke="currentColor"
                                                                viewBox="0 0 24 24"
                                                            >
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                            </svg>
                                                        )}
                                                    </button>

                                                    {/* Folder Icon */}
                                                    <div className="shrink-0 text-yellow-500">
                                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                                                        </svg>
                                                    </div>

                                                    {/* Category Name */}
                                                    <div
                                                        className="flex-1 text-sm font-medium"
                                                        onClick={() => handleCategoryClick(category.id)}
                                                    >
                                                        {category.name}
                                                    </div>

                                                    {/* Item Count */}
                                                    <div className="shrink-0 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                                                        {itemCount}
                                                    </div>
                                                </div>

                                                {/* Action buttons */}
                                                <DropdownMenu
                                                    className="py-1"
                                                    triggerClassName="p-1.5 text-gray-500 hover:text-indigo-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                                                    items={[
                                                        {
                                                            label: 'Edit',
                                                            onClick: (e) => handleEditCategory(e, category),
                                                            icon: <PencilIcon className="w-4 h-4" />
                                                        },
                                                        {
                                                            label: 'Hapus',
                                                            variant: 'danger',
                                                            onClick: (e) => handleDeleteCategory(e, category),
                                                            icon: <TrashBinIcon className="w-4 h-4" />
                                                        }
                                                    ]}
                                                />
                                            </div>

                                            {/* Types (nested) */}
                                            {isExpanded && categoryTypes.length > 0 && (
                                                <div className="ml-7 mt-1 space-y-1">
                                                    {categoryTypes
                                                        .sort((a, b) => a.display_order - b.display_order)
                                                        .map(type => {
                                                            const typeItemCount = getItemCountForType(type.id);
                                                            const isTypeSelected = filters.selectedTypeId === type.id;

                                                            return (
                                                                <div key={type.id} className="group flex items-center justify-between ml-3">
                                                                    <div
                                                                        onClick={() => handleTypeClick(type.id)}
                                                                        className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${isTypeSelected ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'}`}
                                                                    >
                                                                        {/* List Icon */}
                                                                        <div className="shrink-0">
                                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                                                            </svg>
                                                                        </div>

                                                                        {/* Type Name */}
                                                                        <div className="flex-1 text-sm">
                                                                            {type.name}
                                                                        </div>

                                                                        {/* Item Count */}
                                                                        <div className="shrink-0 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                                                                            {typeItemCount}
                                                                        </div>
                                                                    </div>

                                                                    {/* Action buttons - show on hover (desktop) or always (mobile) */}
                                                                    <div className="flex md:hidden md:group-hover:flex items-center gap-1 pr-2">
                                                                        <button
                                                                            onClick={(e) => handleEditType(e, type)}
                                                                            className="p-1.5 text-gray-500 hover:text-indigo-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                                                                            title="Edit Tipe"
                                                                        >
                                                                            <PencilIcon className="w-5 h-5" />
                                                                        </button>
                                                                        <button
                                                                            onClick={(e) => handleDeleteType(e, type)}
                                                                            className="p-1.5 text-gray-500 hover:text-red-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                                                                            title="Hapus Tipe"
                                                                        >
                                                                            <TrashBinIcon className="w-5 h-5" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                        </>
                    ) : (
                        // Class List for Class View - Nested Semesters
                        <>
                            {classes.map(classMaster => {
                                const itemsBySemester = getItemsBySemesterForClass(classMaster.id);
                                const totalCount = itemsBySemester.semester1.length +
                                    itemsBySemester.semester2.length +
                                    itemsBySemester.uncategorized.length;
                                const isExpanded = expandedClasses.has(classMaster.id);

                                return (
                                    <div key={classMaster.id} className="mb-2">
                                        {/* Class Header */}
                                        <div
                                            onClick={() => toggleClassExpand(classMaster.id)}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${isExpanded
                                                ? 'bg-gray-100 dark:bg-gray-700'
                                                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                                                }`}
                                        >
                                            {/* Expand/Collapse Icon */}
                                            <svg
                                                className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>

                                            {/* Class Icon */}
                                            <div className="shrink-0 text-blue-600 dark:text-blue-400">
                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                                                </svg>
                                            </div>

                                            {/* Class Name */}
                                            <div className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                                                {classMaster.name}
                                            </div>

                                            {/* Total Count */}
                                            <div className="shrink-0 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                                                {totalCount}
                                            </div>
                                        </div>

                                        {/* Nested Semesters */}
                                        {isExpanded && (
                                            <div className="ml-6 mt-1 space-y-1">
                                                {/* Semester 1 */}
                                                <SemesterSection
                                                    classId={classMaster.id}
                                                    semester={1}
                                                    items={itemsBySemester.semester1}
                                                    isExpanded={isSemesterExpanded(classMaster.id, 1)}
                                                    onToggle={() => toggleSemesterExpand(classMaster.id, 1)}
                                                    getTypesForSemester={getTypesForSemesterInClass}
                                                    getItemCountForType={getItemCountForTypeInSemester}
                                                    onTypeClick={handleSemesterTypeClick}
                                                    selectedTypeId={filters.selectedTypeId}
                                                    selectedSemester={filters.selectedSemester}
                                                />

                                                {/* Semester 2 */}
                                                <SemesterSection
                                                    classId={classMaster.id}
                                                    semester={2}
                                                    items={itemsBySemester.semester2}
                                                    isExpanded={isSemesterExpanded(classMaster.id, 2)}
                                                    onToggle={() => toggleSemesterExpand(classMaster.id, 2)}
                                                    getTypesForSemester={getTypesForSemesterInClass}
                                                    getItemCountForType={getItemCountForTypeInSemester}
                                                    onTypeClick={handleSemesterTypeClick}
                                                    selectedTypeId={filters.selectedTypeId}
                                                    selectedSemester={filters.selectedSemester}
                                                />

                                                {/* Uncategorized */}
                                                {itemsBySemester.uncategorized.length > 0 && (
                                                    <SemesterSection
                                                        classId={classMaster.id}
                                                        semester={null}
                                                        items={itemsBySemester.uncategorized}
                                                        isExpanded={isSemesterExpanded(classMaster.id, 'uncategorized')}
                                                        onToggle={() => toggleSemesterExpand(classMaster.id, 'uncategorized')}
                                                        getTypesForSemester={getTypesForSemesterInClass}
                                                        getItemCountForType={getItemCountForTypeInSemester}
                                                        onTypeClick={handleSemesterTypeClick}
                                                        selectedTypeId={filters.selectedTypeId}
                                                        selectedSemester={filters.selectedSemester}
                                                        isUncategorized
                                                    />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </>
                    )}
                </div>
            </aside>

            {/* Category Modal */}
            <CategoryModal
                isOpen={categoryModalOpen}
                onClose={() => {
                    setCategoryModalOpen(false);
                    setEditingCategory(null);
                }}
                category={editingCategory}
                onSuccess={async () => {
                    if (onDataChange) {
                        await onDataChange();
                    }
                    setCategoryModalOpen(false);
                    setEditingCategory(null);
                }}
            />

            {/* Type Modal */}
            <TypeModal
                isOpen={typeModalOpen}
                onClose={() => {
                    setTypeModalOpen(false);
                    setEditingType(null);
                }}
                type={editingType}
                defaultCategoryId={editingType?.category_id || filters.selectedCategoryId || undefined}
                onSuccess={async () => {
                    if (onDataChange) {
                        await onDataChange();
                    }
                    setTypeModalOpen(false);
                    setEditingType(null);
                }}
            />

            {/* Delete Confirm Modal */}
            <ConfirmModal
                isOpen={deleteConfirm.isOpen}
                onClose={() => setDeleteConfirm({ isOpen: false, item: null, type: 'category' })}
                onConfirm={handleConfirmDelete}
                title={`Hapus ${deleteConfirm.type === 'category' ? 'Kategori' : 'Tipe'}?`}
                message={`Apakah Anda yakin ingin menghapus ${deleteConfirm.type === 'category' ? 'kategori' : 'tipe'} "${deleteConfirm.item?.name}"?`}
                isDestructive={true}
            />
        </>
    );
}
