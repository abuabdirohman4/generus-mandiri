'use client';

import { useState } from 'react';
import { MaterialCategory, MaterialType, MaterialItem, ClassMaster } from '../../types';
import { useMateriStore } from '../../stores/materiStore';
import Skeleton from '@/components/ui/skeleton/Skeleton';
import { isMobile } from '@/lib/utils';

interface MateriSidebarProps {
    categories: MaterialCategory[];
    types: MaterialType[];
    items: MaterialItem[];
    classes: ClassMaster[];
    isOpen: boolean;
    onToggle: () => void;
    isLoading?: boolean;
}

export default function MateriSidebar({
    categories,
    types,
    items,
    classes,
    isOpen,
    onToggle,
    isLoading = false
}: MateriSidebarProps) {
    const { filters, setFilter } = useMateriStore();
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

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

    return (
        <>
            {/* Overlay for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 bg-opacity-50 lg:hidden z-30"
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
                        <button
                            onClick={onToggle}
                            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
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
                                            <div
                                                onClick={() => toggleCategory(category.id)}
                                                className={`flex items-center gap-2  px-3 py-2 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                                            >
                                                {/* Expand/Collapse Icon */}
                                                <button
                                                    className="flex-shrink-0 w-5 h-5 flex items-center justify-center"
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
                                                <div className="flex-shrink-0 text-yellow-500">
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
                                                <div className="flex-shrink-0 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                                                    {itemCount}
                                                </div>
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
                                                                <div
                                                                    key={type.id}
                                                                    onClick={() => handleTypeClick(type.id)}
                                                                    className={`flex items-center gap-2 px-3 py-2 ml-3 rounded-lg cursor-pointer transition-colors ${isTypeSelected ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'}`}
                                                                >
                                                                    {/* List Icon */}
                                                                    <div className="flex-shrink-0">
                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                                                        </svg>
                                                                    </div>

                                                                    {/* Type Name */}
                                                                    <div className="flex-1 text-sm">
                                                                        {type.name}
                                                                    </div>

                                                                    {/* Item Count */}
                                                                    <div className="flex-shrink-0 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                                                                        {typeItemCount}
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
                        // Class List for Class View - Expandable with Types nested
                        <>
                            {classes.map(classMaster => {
                                const itemCount = getItemCountForClass(classMaster.id);
                                const classTypes = getTypesForClass(classMaster.id);
                                const isExpanded = expandedClasses.has(classMaster.id);

                                return (
                                    <div key={classMaster.id} className="mb-2">
                                        {/* Class Header */}
                                        <div 
                                            onClick={() => toggleClassExpand(classMaster.id)}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${isExpanded ? 'bg-gray-100 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                                        >
                                            {/* Expand/Collapse Icon */}
                                            <button className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                                                {classTypes.length > 0 && (
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

                                            {/* Class Icon */}
                                            <div className="flex-shrink-0 text-blue-600 dark:text-blue-400">
                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                                                </svg>
                                            </div>
                                            {/* <div className="flex-shrink-0 text-yellow-500">
                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                                                </svg>
                                            </div> */}

                                            {/* Class Name */}
                                            <div className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                                                {classMaster.name}
                                            </div>

                                            {/* Item Count */}
                                            <div className="flex-shrink-0 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                                                {itemCount}
                                            </div>
                                        </div>

                                        {/* Types (nested) */}
                                        {isExpanded && classTypes.length > 0 && (
                                            <div className="ml-7 mt-1 space-y-1">
                                                {classTypes
                                                    // .sort((a, b) => a.display_order - b.display_order)
                                                    .sort((a, b) => a.name.localeCompare(b.name))
                                                    .map(type => {
                                                        const typeItemCount = getItemCountForTypeInClass(classMaster.id, type.id);
                                                        const isTypeSelected = filters.selectedClassId === classMaster.id && filters.selectedTypeId === type.id;

                                                        return (
                                                            <div
                                                                key={type.id}
                                                                onClick={() => handleClassTypeClick(classMaster.id, type.id)}
                                                                className={`flex items-center gap-2 px-3 py-2 ml-3 rounded-lg cursor-pointer transition-colors ${isTypeSelected ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'}`}
                                                            >
                                                                {/* List Icon */}
                                                                <div className="flex-shrink-0">
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                                                    </svg>
                                                                </div>

                                                                {/* Type Name */}
                                                                <div className="flex-1 text-sm">
                                                                    {type.name}
                                                                </div>

                                                                {/* Item Count */}
                                                                <div className="flex-shrink-0 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                                                                    {typeItemCount}
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
                    )}
                </div>
            </aside>
        </>
    );
}
