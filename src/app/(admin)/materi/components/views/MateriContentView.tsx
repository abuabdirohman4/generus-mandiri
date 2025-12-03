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
    searchQuery: string;
    onSearchChange: (query: string) => void;
}

export default function MateriContentView({
    categories,
    types,
    items,
    userProfile,
    onEditItem,
    onDeleteItem,
    searchQuery,
    onSearchChange
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

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(item =>
                item.name.toLowerCase().includes(query) ||
                item.description?.toLowerCase().includes(query)
            );
        }

        return result;
    }, [items, filters.viewMode, filters.selectedClassId, filters.selectedTypeId, userProfile, isTeacherUser, searchQuery]);

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
            {/* Search Bar */}
            <div className="hidden md:block sticky top-0 z-10 bg-white dark:bg-gray-800">
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
