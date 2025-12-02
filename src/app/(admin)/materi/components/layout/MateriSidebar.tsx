'use client';

import { useState } from 'react';
import { MaterialCategory, MaterialType, MaterialItem } from '../../types';
import { useMateriStore } from '../../stores/materiStore';

interface MateriSidebarProps {
    categories: MaterialCategory[];
    types: MaterialType[];
    items: MaterialItem[];
    isOpen: boolean;
    onToggle: () => void;
}

export default function MateriSidebar({
    categories,
    types,
    items,
    isOpen,
    onToggle
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
    };

    const handleTypeClick = (typeId: string) => {
        setFilter('selectedTypeId', typeId);
        setFilter('selectedCategoryId', null);
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
            <aside className={`fixed lg:relative inset-y-0 left-0 z-50 md:z-0 w-80 bg-white rounded-lg border border-gray-200 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} flex flex-col `}>
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Kategori Materi
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
                            By Material
                        </button>
                        <button
                            onClick={() => setFilter('viewMode', 'by_class')}
                            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${filters.viewMode === 'by_class' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                        >
                            By Class
                        </button>
                    </div>
                </div>

                {/* Category Tree */}
                <div className="flex-1 overflow-y-auto p-4">
                    {categories
                        .sort((a, b) => a.display_order - b.display_order)
                        .map(category => {
                            const categoryTypes = getTypesForCategory(category.id);
                            const itemCount = getItemCountForCategory(category.id);
                            const isExpanded = expandedCategories.has(category.id);
                            const isSelected = filters.selectedCategoryId === category.id;

                            return (
                                <div key={category.id} className="mb-2">
                                    {/* Category */}
                                    <div
                                        className={`flex items-center gap-2  px-3 py-2 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                                    >
                                        {/* Expand/Collapse Icon */}
                                        <button
                                            onClick={() => toggleCategory(category.id)}
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
                                                            className={`flex items-center gap-2 px-3 py-2 ml-5 rounded-lg cursor-pointer transition-colors ${isTypeSelected ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'}`}
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
                </div>
            </aside>
        </>
    );
}
