'use client';

import { useMemo, useState } from 'react';
import { MaterialItem, MaterialType, MaterialCategory } from '../../types';
import { useMateriStore } from '../../stores/materiStore';
import { isTeacher, isAdmin } from '@/lib/accessControl';
import MateriTable from '../tables/MateriTable';
// import MateriCardMobile from '../tables/MateriCardMobile';

interface MateriContentViewProps {
    categories: MaterialCategory[];
    types: MaterialType[];
    items: MaterialItem[];
    userProfile: any;
    onEditItem?: (item: MaterialItem) => void;
    onDeleteItem?: (item: MaterialItem) => void;
    onCreateItem?: () => void;
    onViewItem?: (item: MaterialItem) => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    selectedIds?: Set<string>;
    onToggleSelection?: (id: string) => void;
    onToggleAll?: (selected: boolean, itemIds: string[]) => void;
    onBulkEdit?: () => void;
}

export default function MateriContentView({
    categories,
    types,
    items,
    userProfile,
    onEditItem,
    onDeleteItem,
    onCreateItem,
    onViewItem,
    searchQuery,
    onSearchChange,
    selectedIds,
    onToggleSelection,
    onToggleAll,
    onBulkEdit
}: MateriContentViewProps) {
    const { filters } = useMateriStore();

    const isAdminUser = userProfile ? isAdmin(userProfile) : false;
    const isTeacherUser = userProfile ? isTeacher(userProfile) : false;

    // Filter items for "by_class" mode - show items based on class + type selection
    const filteredItemsForClassMode = useMemo(() => {
        if (filters.viewMode !== 'by_class') return [];

        let result = items;

        // Teacher: Only show items from their classes
        if (isTeacherUser && userProfile.classes) {
            const teacherClassIds = userProfile.classes.map((c: any) => c.id);
            result = result.filter(item =>
                item.classes?.some(c => teacherClassIds.includes(c.id))
            );
        }

        // Filter by selected class
        if (filters.selectedClassId) {
            result = result.filter(item =>
                item.classes?.some(c => c.id === filters.selectedClassId)
            );
        }

        // Filter by selected type (from sidebar)
        if (filters.selectedTypeId) {
            result = result.filter(i => i.material_type_id === filters.selectedTypeId);
        }

        // Filter by selected semester (from sidebar)
        // Note: selectedSemester can be 1, 2, or null (for uncategorized)
        // But here we need to handle the logic carefully because null in store might mean "no semester selected" or "uncategorized"
        // In our case, if selectedTypeId is set, selectedSemester should also be respected if it was set by the sidebar click
        if (filters.selectedClassId && filters.selectedTypeId) {
            // If we are filtering by class AND type, we should also check semester
            // The sidebar sets selectedSemester when clicking a type under a semester section

            if (filters.selectedSemester !== undefined) {
                result = result.filter(item => {
                    const classMapping = item.classes?.find(c => c.id === filters.selectedClassId);
                    if (!classMapping) return false;

                    if (filters.selectedSemester === null) {
                        // Uncategorized: semester is null or undefined
                        return !classMapping.semester;
                    } else {
                        // Specific semester
                        return classMapping.semester === filters.selectedSemester;
                    }
                });
            }
        }

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(item =>
                item.name.toLowerCase().includes(query) ||
                item.description?.toLowerCase().includes(query)
            );
        }

        return result;
    }, [items, filters.viewMode, filters.selectedClassId, filters.selectedTypeId, filters.selectedSemester, userProfile, isTeacherUser, searchQuery]);

    // Get current type/category info for header
    const selectedType = useMemo(() => {
        if (filters.selectedTypeId) {
            return types.find(t => t.id === filters.selectedTypeId);
        }
        return null;
    }, [filters.selectedTypeId, types]);

    const selectedCategory = useMemo(() => {
        if (filters.selectedCategoryId) {
            return categories.find(c => c.id === filters.selectedCategoryId);
        }
        if (selectedType) {
            return categories.find(c => c.id === selectedType.category_id);
        }
        return null;
    }, [filters.selectedCategoryId, selectedType, categories]);

    // Filter items based on sidebar selection and user role
    const filteredItems = useMemo(() => {
        let result = items;

        // Teacher: Only show items from their classes
        if (isTeacherUser && userProfile.classes) {
            const teacherClassIds = userProfile.classes.map((c: any) => c.id);
            result = result.filter(item =>
                item.classes?.some(c => teacherClassIds.includes(c.id))
            );
        }

        // Filter by selected category
        if (filters.selectedCategoryId) {
            const categoryTypes = types
                .filter(t => t.category_id === filters.selectedCategoryId)
                .map(t => t.id);
            result = result.filter(i => categoryTypes.includes(i.material_type_id));
        }

        // Filter by selected type
        if (filters.selectedTypeId) {
            result = result.filter(i => i.material_type_id === filters.selectedTypeId);
        }

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(item =>
                item.name.toLowerCase().includes(query) ||
                item.description?.toLowerCase().includes(query)
            );
        }

        return result;
    }, [items, types, filters, userProfile, isTeacherUser, searchQuery]);

    // Get header title
    const headerTitle = selectedType?.name || selectedCategory?.name || 'Semua Materi';
    const headerDescription = selectedType?.description || selectedCategory?.description || 'Kelola item materi pembelajaran';

    return (
        <div className="space-y-6">
            {/* Header with Search and Create Button */}
            <div className="flex items-center gap-3">
                <div className="flex-1 relative hidden lg:block">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Cari materi disini..."
                        className="w-full px-4 py-3 pl-11 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    />
                    <svg
                        className="absolute left-3 top-3.5 h-5 w-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
                {selectedIds && selectedIds.size > 0 && onBulkEdit && (
                    <button
                        onClick={onBulkEdit}
                        className="flex items-center gap-2 px-4 py-2.5 mt-3 lg:mt-0 ml-auto lg:ml-0 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium text-sm"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>Edit Massal ({selectedIds.size})</span>
                    </button>
                )}
                {onCreateItem && (
                    <>
                        {/* <button
                            onClick={onCreateItem}
                            className="hidden lg:flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm ml-auto md:ml-0"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span className="md:inline">Tambah Materi</span>
                        </button> */}

                        {/* <button
                            onClick={onCreateItem}
                            className=""
                            title="Buat Pertemuan Baru"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                        </button> */}
                    </>
                )}
            </div>

            {/* Conditional Rendering Based on View Mode */}
            {filters.viewMode === 'by_material' ? (
                <>
                    {/* View by Material Mode */}
                    {/* Desktop: Table */}
                    {/* <div className="hidden md:block"> */}

                    {/* Table View (All Screens) */}
                    <div className="mt-5 md:mt-0">
                        <MateriTable
                            items={filteredItems}
                            onEdit={onEditItem}
                            onDelete={onDeleteItem}
                            onView={onViewItem}
                            selectedIds={selectedIds}
                            onToggleSelection={onToggleSelection}
                            onToggleAll={(selected) => onToggleAll?.(selected, filteredItems.map(i => i.id))}
                        />
                    </div>

                    {/* Mobile: Cards */}
                    {/* <div className="md:hidden space-y-3 mt-4 md:mt-0">
                        {filteredItems.map(item => (
                            <MateriCardMobile
                                key={item.id}
                                item={item}
                                types={types}
                                isAdmin={isAdminUser}
                                onEdit={onEditItem}
                                onDelete={onDeleteItem}
                            />
                        ))}
                    </div> */}

                    {/* Empty State for Material View */}
                    {/* {filteredItems.length === 0 && (
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-12 border shadow-sm">
                            <div className="text-center">
                                <svg
                                    className="mx-auto h-12 w-12 text-gray-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                    />
                                </svg>
                                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                                    Tidak ada materi
                                </h3>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    {searchQuery ? 'Tidak ada hasil untuk pencarian ini' : 'Tidak ada materi yang ditemukan untuk filter ini'}
                                </p>
                            </div>
                        </div>
                    )} */}
                </>
            ) : (
                <>
                    {/* View by Class Mode - Show items in table/card format */}
                    {/* Desktop: Table */}
                    {/* <div className="hidden md:block"> */}

                    {/* Table View (All Screens) */}
                    <div className="mt-5 md:mt-0">
                        <MateriTable
                            items={filteredItemsForClassMode}
                            onEdit={onEditItem}
                            onDelete={onDeleteItem}
                            onView={onViewItem}
                            selectedIds={selectedIds}
                            onToggleSelection={onToggleSelection}
                            onToggleAll={(selected) => onToggleAll?.(selected, filteredItemsForClassMode.map(i => i.id))}
                        />
                    </div>

                    {/* Mobile: Cards */}
                    {/* <div className="md:hidden space-y-3 mt-4 md:mt-0">
                        {filteredItemsForClassMode.map(item => (
                            <MateriCardMobile
                                key={item.id}
                                item={item}
                                types={types}
                                isAdmin={isAdminUser}
                                onEdit={onEditItem}
                                onDelete={onDeleteItem}
                            />
                        ))}
                    </div> */}

                    {/* Empty State for Class View */}
                    {/* {filteredItemsForClassMode.length === 0 && (
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-12 border shadow-sm">
                            <div className="text-center">
                                <svg
                                    className="mx-auto h-12 w-12 text-gray-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                    />
                                </svg>
                                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                                    Tidak ada materi
                                </h3>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    {searchQuery ? 'Tidak ada hasil untuk pencarian ini' : filters.selectedClassId && filters.selectedTypeId ? 'Pilih kategori materi dari sidebar' : 'Pilih kelas dan kategori dari sidebar'}
                                </p>
                            </div>
                        </div>
                    )} */}
                </>
            )}
        </div>
    );
}
