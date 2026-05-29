'use client';

import { useMemo, useState, useEffect } from 'react';

import { MaterialItem, MaterialType, MaterialCategory, getSemesterMonths, getMonthName, Semester, Month, ClassMaster } from '../../types';
import { useMateriStore } from '../../stores/materiStore';
import { getMonthlyTargetItemIds } from '../../actions/monthly-targets/actions';
import { isTeacher, isAdmin } from '@/lib/accessControl';
import MateriTable from '../tables/MateriTable';
import InputFilter from '@/components/form/input/InputFilter';
import ColumnToggle from '@/components/table/ColumnToggle';

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
    classMasters: ClassMaster[];
    monthsByItemId: Record<string, Array<{ class_master_id: string; semester: number; month: number }>>;
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
    onBulkEdit,
    classMasters,
    monthsByItemId
}: MateriContentViewProps) {
    const { filters, setFilter, columnVisibility, setColumnVisibility } = useMateriStore();

    const isAdminUser = userProfile ? isAdmin(userProfile) : false;
    const isTeacherUser = userProfile ? isTeacher(userProfile) : false;

    const [targetItemIds, setTargetItemIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (filters.selectedSemester && filters.selectedMonth) {
            getMonthlyTargetItemIds({
                semester: filters.selectedSemester,
                month: filters.selectedMonth,
                class_master_id: filters.selectedClassId ?? undefined
            }).then(ids => setTargetItemIds(new Set(ids)));
        } else {
            setTargetItemIds(new Set());
        }
    }, [filters.selectedSemester, filters.selectedMonth, filters.selectedClassId]);


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

        // Filter by selected class
        if (filters.selectedClassId) {
            result = result.filter(item =>
                item.classes?.some(c => c.id === filters.selectedClassId)
            );
        }

        // Filter by semester (via monthly targets) if no month selected
        if (filters.selectedSemester && !filters.selectedMonth) {
            result = result.filter(item => {
                const targets = monthsByItemId[item.id] || [];
                return targets.some(t =>
                    t.semester === filters.selectedSemester &&
                    (!filters.selectedClassId || t.class_master_id === filters.selectedClassId)
                );
            });
        }

        // Filter by semester + month targets (via monthly_targets table)
        if (filters.selectedSemester && filters.selectedMonth) {
            result = result.filter(item => targetItemIds.has(item.id));
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
    }, [items, types, filters, userProfile, isTeacherUser, searchQuery, targetItemIds, monthsByItemId]);

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
                        className="w-full px-4 py-3 pl-11 border bg-white border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
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
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border-b border-gray-200 dark:border-gray-700">
                    <InputFilter
                        id="category-filter-content"
                        label="Kategori"
                        value={filters.selectedCategoryId || ''}
                        onChange={(val) => {
                            setFilter('selectedCategoryId', val || null);
                            setFilter('selectedTypeId', null);
                        }}
                        allOptionLabel="Semua Kategori"
                        options={categories
                            .sort((a, b) => a.display_order - b.display_order)
                            .map(c => ({ value: c.id, label: c.name }))}
                        widthClassName="w-48"
                        variant="modal"
                        compact
                    />
                    <InputFilter
                        id="semester-filter"
                        label="Semester"
                        value={filters.selectedSemester?.toString() || ''}
                        onChange={(val) => {
                            const sem = val ? parseInt(val) : null;
                            setFilter('selectedSemester', sem);
                            if (!sem) setFilter('selectedMonth', null);
                        }}
                        allOptionLabel="Semua Semester"
                        options={[
                            { value: '1', label: 'Semester 1' },
                            { value: '2', label: 'Semester 2' }
                        ]}
                        widthClassName="w-40"
                        variant="modal"
                        compact
                    />
                    <InputFilter
                        id="month-filter"
                        label="Bulan"
                        value={filters.selectedMonth?.toString() || ''}
                        onChange={(val) => setFilter('selectedMonth', val ? parseInt(val) : null)}
                        disabled={!filters.selectedSemester}
                        allOptionLabel="Semua Bulan"
                        options={filters.selectedSemester ? getSemesterMonths(filters.selectedSemester as Semester).map(m => ({
                            value: m.toString(),
                            label: getMonthName(m as Month)
                        })) : []}
                        widthClassName="w-40"
                        variant="modal"
                        compact
                    />
                    <InputFilter
                        id="class-filter-content"
                        label="Kelas"
                        value={filters.selectedClassId || ''}
                        onChange={(val) => setFilter('selectedClassId', val || null)}
                        allOptionLabel="Semua Kelas"
                        options={classMasters.map(cls => ({
                            value: cls.id,
                            label: cls.name
                        }))}
                        widthClassName="w-48"
                        variant="modal"
                        compact
                    />
                </div>

            {/* Table View */}
            <div className="mt-5 md:mt-0">
                <MateriTable
                    items={filteredItems}
                    onEdit={onEditItem}
                    onDelete={onDeleteItem}
                    onView={onViewItem}
                    selectedIds={selectedIds}
                    onToggleSelection={onToggleSelection}
                    onToggleAll={(selected) => onToggleAll?.(selected, filteredItems.map((i: MaterialItem) => i.id))}
                    showTargetBadge={!!(filters.selectedSemester && filters.selectedMonth)}
                    selectedMonth={filters.selectedMonth}
                    monthsByItemId={monthsByItemId}
                    showClassColumn={columnVisibility.showClassColumn}
                    showSemesterColumn={columnVisibility.showSemesterColumn}
                    showMonthColumn={columnVisibility.showMonthColumn}
                    columnToggle={
                        <ColumnToggle
                            columns={[
                                { key: 'showClassColumn', label: 'Kelas' },
                                { key: 'showSemesterColumn', label: 'Semester' },
                                { key: 'showMonthColumn', label: 'Bulan' },
                            ]}
                            visibility={columnVisibility}
                            onChange={setColumnVisibility}
                        />
                    }
                />
            </div>
        </div>
    );
}
