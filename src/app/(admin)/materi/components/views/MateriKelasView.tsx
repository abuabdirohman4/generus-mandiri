'use client';

import { useMemo } from 'react';
import { MaterialItem, MaterialType, MaterialCategory, ClassMaster, getSemesterMonths, getMonthName, Semester, Month } from '../../types';
import { useMateriStore } from '../../stores/materiStore';
import InputFilter from '@/components/form/input/InputFilter';
import MateriTable from '../tables/MateriTable';
import ColumnToggle from '@/components/table/ColumnToggle';

interface MateriKelasViewProps {
    categories: MaterialCategory[];
    types: MaterialType[];
    items: MaterialItem[];
    classes: ClassMaster[];
    monthsByItemId: Record<string, Array<{ class_master_id: string; semester: number; month: number }>>;
    onViewItem?: (item: MaterialItem) => void;
    searchQuery: string;
}

export default function MateriKelasView({
    categories,
    types,
    items,
    classes,
    monthsByItemId,
    onViewItem,
    searchQuery,
}: MateriKelasViewProps) {
    const { filters, setFilter, columnVisibility, setColumnVisibility } = useMateriStore();

    const selectedClass = classes.find(c => c.id === filters.selectedClassId);

    // Items for this class, filtered by semester/month/category/search
    const filteredItems = useMemo(() => {
        if (!filters.selectedClassId) return [];

        let result = items.filter(item =>
            item.classes?.some(c => c.id === filters.selectedClassId)
        );

        if (filters.selectedCategoryId) {
            const categoryTypeIds = types
                .filter(t => t.category_id === filters.selectedCategoryId)
                .map(t => t.id);
            result = result.filter(i => categoryTypeIds.includes(i.material_type_id));
        }

        if (filters.selectedSemester && !filters.selectedMonth) {
            result = result.filter(item => {
                const targets = monthsByItemId[item.id] || [];
                return targets.some(t =>
                    t.semester === filters.selectedSemester &&
                    t.class_master_id === filters.selectedClassId
                );
            });
        }

        if (filters.selectedSemester && filters.selectedMonth) {
            result = result.filter(item => {
                const targets = monthsByItemId[item.id] || [];
                return targets.some(t =>
                    t.semester === filters.selectedSemester &&
                    t.month === filters.selectedMonth &&
                    t.class_master_id === filters.selectedClassId
                );
            });
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(item =>
                item.name.toLowerCase().includes(query) ||
                item.description?.toLowerCase().includes(query)
            );
        }

        return result;
    }, [items, types, filters, monthsByItemId, searchQuery]);

    // Group by material type
    const groupedByType = useMemo(() => {
        const groups: { type: MaterialType; items: MaterialItem[] }[] = [];
        const grouped = filteredItems.reduce((acc, item) => {
            const typeId = item.material_type_id;
            if (!acc[typeId]) acc[typeId] = [];
            acc[typeId].push(item);
            return acc;
        }, {} as Record<string, MaterialItem[]>);

        types
            .filter(t => grouped[t.id])
            .sort((a, b) => a.display_order - b.display_order)
            .forEach(type => {
                groups.push({ type, items: grouped[type.id] });
            });

        return groups;
    }, [filteredItems, types]);

    if (!filters.selectedClassId) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 dark:text-gray-500 space-y-3">
                <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <p className="text-sm font-medium">Pilih kelas dari sidebar</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 border-b border-gray-200 dark:border-gray-700 pb-4">
                <InputFilter
                    id="kelas-category-filter"
                    label="Kategori"
                    value={filters.selectedCategoryId || ''}
                    onChange={(val) => setFilter('selectedCategoryId', val || null)}
                    allOptionLabel="Semua Kategori"
                    options={categories
                        .sort((a, b) => a.display_order - b.display_order)
                        .map(c => ({ value: c.id, label: c.name }))}
                    widthClassName="w-48"
                    variant="modal"
                    compact
                />
                <InputFilter
                    id="kelas-semester-filter"
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
                        { value: '2', label: 'Semester 2' },
                    ]}
                    widthClassName="w-40"
                    variant="modal"
                    compact
                />
                <InputFilter
                    id="kelas-month-filter"
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
            </div>

            {/* Grouped tables per type */}
            {groupedByType.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-gray-400 dark:text-gray-500">
                    <p className="text-sm">Tidak ada sub materi untuk kelas ini</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {groupedByType.map(({ type, items: typeItems }) => (
                        <div key={type.id}>
                            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                                {type.name}
                            </h3>
                            <MateriTable
                                items={typeItems}
                                onView={onViewItem}
                                showTargetBadge={!!(filters.selectedSemester && filters.selectedMonth)}
                                selectedMonth={filters.selectedMonth}
                                monthsByItemId={monthsByItemId}
                                showClassColumn={false}
                                showSemesterColumn={columnVisibility.showSemesterColumn}
                                showMonthColumn={columnVisibility.showMonthColumn}
                                columnToggle={
                                    <ColumnToggle
                                        columns={[
                                            { key: 'showSemesterColumn', label: 'Semester' },
                                            { key: 'showMonthColumn', label: 'Bulan' },
                                        ]}
                                        visibility={columnVisibility}
                                        onChange={setColumnVisibility}
                                    />
                                }
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
