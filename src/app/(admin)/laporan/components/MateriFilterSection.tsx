'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import InputFilter from '@/components/form/input/InputFilter'
import { useLaporanStore } from '@/stores/laporanStore'
import {
    shouldShowDaerahFilter,
    modalShouldShowDesaFilter,
    modalShouldShowKelompokFilter,
    isTeacher
} from '@/lib/accessControl'
import type { UserProfile } from '@/types/user'
import type { DaerahBase, DesaBase, KelompokBase } from '@/types/organization'
import type { Class } from '@/types/class'
import LaporanTimeFilter from './LaporanTimeFilter'

interface MateriFilters {
    classId: string
    daerahId: string
    desaId: string
    kelompokId: string
    academicYearId: string
    semester: 1 | 2
    categoryId: string
    month: number | undefined
}

interface YearOption { value: string; label: string }
interface CategoryOption { value: string; label: string }

interface MateriFilterSectionProps {
    categories: CategoryOption[]
    
    // Org data
    userProfile: UserProfile | null | undefined
    daerahList: DaerahBase[]
    desaList: DesaBase[]
    kelompokList: KelompokBase[]
    classList: Class[]
    // Shared time filter
    sharedMonth: number
    sharedYear: number
    onMonthChange: (month: number) => void
    onYearChange: (year: number) => void
    semester?: 1 | 2
    academicYear?: string
}
export default function MateriFilterSection({
    categories,
    userProfile,
    daerahList,
    desaList,
    kelompokList,
    classList,
    sharedMonth,
    sharedYear,
    onMonthChange,
    onYearChange,
    semester,
    academicYear
}: MateriFilterSectionProps) {
    const { materiFilters: filters, setMateriFilters: onFilterChange } = useLaporanStore()

    // Detect regular teachers whose classes span multiple kelompok
    const teacherHasMultipleKelompok = useMemo(() => {
        if (!userProfile || !isTeacher(userProfile) || !userProfile.classes || userProfile.classes.length <= 1) return false;
        const kelompokIds = new Set<string>();
        userProfile.classes.forEach(cls => {
            if (cls.kelompok_id) kelompokIds.add(cls.kelompok_id);
        });
        return kelompokIds.size > 1;
    }, [userProfile]);

    // Logic for filtering dropdown options
    const filteredDesaList = useMemo(() => {
        if (!filters.daerahId) return desaList;
        return desaList.filter(d => d.daerah_id === filters.daerahId);
    }, [desaList, filters.daerahId]);

    const filteredKelompokList = useMemo(() => {
        let baseList = kelompokList;
        
        // If teacher has specific classes, restrict kelompok list to those classes' kelompok
        if (userProfile && isTeacher(userProfile) && userProfile.classes && userProfile.classes.length > 0) {
            const teacherKelompokIds = new Set(userProfile.classes.map(cls => cls.kelompok_id).filter(Boolean));
            baseList = kelompokList.filter(k => teacherKelompokIds.has(k.id));
        }

        if (filters.desaId) {
            baseList = baseList.filter(k => k.desa_id === filters.desaId);
        }
        
        if (filters.daerahId && !filters.desaId) {
            const desaIds = desaList.filter(d => d.daerah_id === filters.daerahId).map(d => d.id);
            return baseList.filter(k => desaIds.includes(k.desa_id || ''));
        }
        return baseList;
    }, [kelompokList, filters.desaId, filters.daerahId, desaList, userProfile]);

    const filteredClasses = useMemo(() => {
        let filtered = classList;
        if (filters.kelompokId) {
            filtered = filtered.filter(c => c.kelompok_id === filters.kelompokId);
        } else if (filters.desaId) {
            const kelompokIds = kelompokList.filter(k => k.desa_id === filters.desaId).map(k => k.id);
            filtered = filtered.filter(c => kelompokIds.includes(c.kelompok_id || ''));
        } else if (filters.daerahId) {
            const desaIds = desaList.filter(d => d.daerah_id === filters.daerahId).map(d => d.id);
            const kelompokIds = kelompokList.filter(k => desaIds.includes(k.desa_id || '')).map(k => k.id);
            filtered = filtered.filter(c => kelompokIds.includes(c.kelompok_id || ''));
        }

        // Format labels: show kelompok name in parentheses if no specific kelompok is selected
        if (!filters.kelompokId) {
            // Check for duplicate class names to decide whether to show kelompok name
            const nameCounts = filtered.reduce((acc, cls) => {
                const name = (cls.name || '').trim();
                acc[name] = (acc[name] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            return filtered.map(c => {
                const hasDuplicate = nameCounts[(c.name || '').trim()] > 1;
                const kelompokName = kelompokList.find(k => k.id === c.kelompok_id)?.name;
                
                const label = (hasDuplicate && kelompokName)
                    ? `${c.name} (${kelompokName})`
                    : c.name;
                
                return { value: c.id, label };
            });
        }

        return filtered.map(c => ({ value: c.id, label: c.name }));
    }, [classList, filters.kelompokId, filters.desaId, filters.daerahId, desaList, kelompokList]);

    const visibleCount = useMemo(() => {
        let count = 5; // Tahun Ajaran, Semester, Kelas, Kategori, Bulan
        if (userProfile && shouldShowDaerahFilter(userProfile)) count++;
        if (userProfile && modalShouldShowDesaFilter(userProfile)) count++;
        if (userProfile && (modalShouldShowKelompokFilter(userProfile) || teacherHasMultipleKelompok)) count++;
        return count;
    }, [userProfile, teacherHasMultipleKelompok]);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 mb-6 shadow-sm">
            <div className={cn(
                "grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4"
            )}>
                {/* Daerah */}
                {userProfile && shouldShowDaerahFilter(userProfile) && (
                    <InputFilter
                        id="daerah-filter"
                        label="Daerah"
                        value={filters.daerahId}
                        onChange={(val) => {
                            onFilterChange({
                                daerahId: val,
                                desaId: '',
                                kelompokId: '',
                                classId: '',
                            });
                        }}
                        options={daerahList.map(d => ({ value: d.id, label: d.name }))}
                        allOptionLabel="Semua Daerah"
                        compact
                    />
                )}

                {/* Desa */}
                {userProfile && modalShouldShowDesaFilter(userProfile) && (
                    <InputFilter
                        id="desa-filter"
                        label="Desa"
                        value={filters.desaId}
                        onChange={(val) => {
                            onFilterChange({
                                desaId: val,
                                kelompokId: '',
                                classId: '',
                            });
                        }}
                        options={filteredDesaList.map(d => ({ value: d.id, label: d.name }))}
                        allOptionLabel="Semua Desa"
                        compact
                        disabled={userProfile && shouldShowDaerahFilter(userProfile) && !filters.daerahId}
                    />
                )}

                {/* Kelompok */}
                {userProfile && (modalShouldShowKelompokFilter(userProfile) || teacherHasMultipleKelompok) && (
                    <InputFilter
                        id="kelompok-filter"
                        label="Kelompok"
                        value={filters.kelompokId}
                        onChange={(val) => {
                            onFilterChange({
                                kelompokId: val,
                                classId: '',
                            });
                        }}
                        options={filteredKelompokList.map(k => ({ value: k.id, label: k.name }))}
                        allOptionLabel="Pilih Kelompok"
                        compact
                        disabled={userProfile && modalShouldShowDesaFilter(userProfile) && !filters.desaId}
                    />
                )}

                {/* Kelas */}
                <InputFilter
                    id="class-filter"
                    label="Kelas"
                    value={filters.classId}
                    onChange={(val) => onFilterChange({ classId: val })}
                    options={filteredClasses}
                    allOptionLabel="Pilih Kelas"
                    compact
                    // disabled={!filters.kelompokId}
                />

                {/* Kategori */}
                <InputFilter
                    id="category-filter"
                    label="Kategori"
                    value={filters.categoryId}
                    onChange={(val) => onFilterChange({ categoryId: val })}
                    options={categories}
                    allOptionLabel="Semua Kategori"
                    compact
                />
            </div>
            {/* Bulan & Tahun — sebagai grid cell */}
            <div className="grid grid-cols-2 gap-4 mt-2">
                <LaporanTimeFilter
                    month={sharedMonth}
                    year={sharedYear}
                    onMonthChange={onMonthChange}
                    onYearChange={onYearChange}
                    semester={semester}
                    academicYear={academicYear}
                />
            </div>
        </div>
    )
}
