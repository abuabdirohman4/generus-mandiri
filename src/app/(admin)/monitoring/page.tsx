'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { bulkUpdateProgress } from './actions/monitoring';
import { getSemesterMonths, getMonthName } from '@/app/(admin)/materi/types';
import type { Semester, Month } from '@/app/(admin)/materi/types';
import { useUserProfile } from '@/stores/userProfileStore';
import { 
    shouldShowDaerahFilter, 
    modalShouldShowDesaFilter, 
    modalShouldShowKelompokFilter 
} from '@/lib/accessControl';
import type { Daerah, Desa, Kelompok } from '@/types/organization';
import InputFilter from '@/components/form/input/InputFilter';
import { toast } from 'sonner';
import Button from '@/components/ui/button/Button';
import { ProgressInput } from './types';
import { getRateGrade, getRateStyle, PREDIKAT_LEGEND, getLegendBadgeClass } from '@/lib/percentages';
import StudentSidebar from './components/StudentSidebar';
import FloatingSaveButton from './components/FloatingSaveButton';
import { isMobile } from '@/lib/utils';
import { MonitoringContentSkeleton, MonitoringMaterialsSkeleton } from './components/MonitoringSkeleton';
import {
    useMonitoringInitial,
    useClassProgress,
    useClassProgressAll,
    useMonitoringMaterials,
    useMonthlyTargetProgress,
    useCrossClassHistory,
    useClassMonthlySummary,
} from './hooks/useMonitoring';
import { monitoringKeys } from '@/lib/swr';
import { mutate } from 'swr';

interface Student {
    id: string;
    name: string;
    class_name?: string; // For displaying class when "Pilih Semua" is selected
}

interface Material {
    id: string;
    name: string;
    material_type?: {
        name?: string;
        material_category?: {
            id: string;
            name: string;
        };
    };
}

interface Progress {
    student_id: string;
    material_item_id: string;
    done?: boolean;
    nilai?: number;
    notes?: string;
}

interface HafalanCategory {
    id: string;
    name: string;
}

export default function MonitoringPage() {
    const { profile: userProfile } = useUserProfile();

    const getCurrentSemester = (): 1 | 2 => new Date().getMonth() + 1 >= 7 ? 1 : 2;

    // ── Filter state (UI-controlled) ──────────────────────────────────────────
    const [selectedYearId, setSelectedYearId] = useState<string>('');
    const [selectedSemester, setSelectedSemester] = useState<1 | 2>(getCurrentSemester);
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
    const [selectedStudentId, setSelectedStudentId] = useState<string>('');
    const [selectedDaerahId, setSelectedDaerahId] = useState<string>('');
    const [selectedDesaId, setSelectedDesaId] = useState<string>('');
    const [selectedKelompokId, setSelectedKelompokId] = useState<string>('');
    const [selectedMonth, setSelectedMonth] = useState<number | null>(new Date().getMonth() + 1);

    // ── UI state ──────────────────────────────────────────────────────────────
    const [saving, setSaving] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isFilterCollapsed, setIsFilterCollapsed] = useState(false);

    // ── progressMap: working DRAFT for edits (seed from server, mutate locally) ─
    const [progressMap, setProgressMap] = useState<Map<string, Progress>>(new Map());
    // Track which class+year+semester the current draft belongs to (avoid stale seed)
    const progressDraftKeyRef = useRef<string>('');
    // Extra materials added via cross-class "Uji Ulang" button (local UI only)
    const [extraMaterials, setExtraMaterials] = useState<Material[]>([]);

    // ── SWR: initial reference data (org/classes/categories/years) ────────────
    const { data: initialData, isLoading: filterLoading } = useMonitoringInitial();

    // Derive from SWR initial data
    const academicYears = initialData?.academicYears ?? [];
    const daerahList: Daerah[] = initialData?.daerahList ?? [];
    const desaList: Desa[] = initialData?.desaList ?? [];
    const kelompokList: Kelompok[] = initialData?.kelompokList ?? [];
    const classes: any[] = initialData?.classes ?? [];
    const hafalanCategories: any[] = initialData?.hafalanCategories ?? [];

    // ── SWR: class progress (single class) ────────────────────────────────────
    const { data: classProgressData, isLoading: classProgressLoading } = useClassProgress(
        selectedClassId !== 'ALL' ? selectedClassId : '',
        selectedYearId,
        selectedSemester
    );

    // ── SWR: class progress ALL ───────────────────────────────────────────────
    const { data: classProgressAllData, isLoading: classProgressAllLoading } = useClassProgressAll(
        selectedClassId === 'ALL' ? classes : [],
        selectedYearId,
        selectedSemester
    );

    // ── SWR: materials ────────────────────────────────────────────────────────
    const { data: materialsData, isLoading: materialsLoading } = useMonitoringMaterials(
        selectedClassId !== 'ALL' ? selectedClassId : '',
        selectedSemester
    );

    // ── SWR: monthly target progress (per student) ────────────────────────────
    const { data: monthlyTargetData, isLoading: monthlyTargetLoading } = useMonthlyTargetProgress(
        selectedStudentId && selectedClassId && selectedMonth && selectedYearId
            ? { classId: selectedClassId, yearId: selectedYearId, semester: selectedSemester, month: selectedMonth, studentId: selectedStudentId }
            : null
    );

    // ── SWR: cross-class history ──────────────────────────────────────────────
    const { data: crossClassData, isLoading: crossClassLoading } = useCrossClassHistory(
        selectedStudentId,
        selectedYearId
    );

    // ── SWR: monthly summary (% per student) ─────────────────────────────────
    const { data: monthlySummaryData } = useClassMonthlySummary(
        selectedClassId && selectedMonth && selectedYearId
            ? { classId: selectedClassId, yearId: selectedYearId, semester: selectedSemester, month: selectedMonth }
            : null
    );

    // ── Derive readable values from SWR data ──────────────────────────────────
    const rawProgressData = selectedClassId === 'ALL' ? classProgressAllData : classProgressData;
    const students: Student[] = rawProgressData?.students ?? [];
    const baseMaterials: Material[] = selectedClassId === 'ALL'
        ? []
        : (materialsData ?? []);
    const materials: Material[] = [
        ...baseMaterials,
        ...extraMaterials.filter(e => !baseMaterials.find(b => b.id === e.id)),
    ];
    const loading = selectedClassId === 'ALL' ? classProgressAllLoading : classProgressLoading;
    // Loading khusus area materi/target: materi refetch atau target bulanan refetch (mis. ganti filter bulan)
    const materialsAreaLoading = materialsLoading || (!!selectedMonth && monthlyTargetLoading);
    const monthlyTargetProgress = monthlyTargetData?.summary ?? null;
    const monthlyTargetItemIds = new Set<string>(Array.isArray(monthlyTargetData?.targetItemIds) ? monthlyTargetData.targetItemIds : []);
    const crossClassHistory: any[] = crossClassData ?? [];
    const monthlyPercentages: Map<string, number> = Array.isArray(monthlySummaryData) ? new Map(monthlySummaryData) : new Map();

    // ── Seed selectedYearId from SWR initial data (once, on first load) ─────────
    useEffect(() => {
        if (initialData?.activeYearId && !selectedYearId) {
            setSelectedYearId(initialData.activeYearId);
        }
    }, [initialData?.activeYearId]);

    // ── Seed org filter from userProfile (once) ────────────────────────────────
    useEffect(() => {
        if (!initialData || !userProfile) return;
        if (userProfile.daerah_id && !selectedDaerahId) setSelectedDaerahId(userProfile.daerah_id);
        if (userProfile.desa_id && !selectedDesaId) setSelectedDesaId(userProfile.desa_id);
        if (userProfile.kelompok_id && !selectedKelompokId) setSelectedKelompokId(userProfile.kelompok_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialData]);

    // ── Auto-collapse filter on mobile when student is selected (UI only) ──────
    useEffect(() => {
        if (selectedStudentId && isMobile()) {
            setIsFilterCollapsed(true);
        }
    }, [selectedStudentId]);

    // ── Auto-select first student when student list changes ────────────────────
    useEffect(() => {
        if (students.length > 0) {
            setSelectedStudentId(students[0].id);
        } else {
            setSelectedStudentId('');
        }
    }, [students]);

    // ── Seed progressMap from server (ONLY when class/year/semester changes) ───
    // Ref tracks current draft key — prevents overwriting unsaved edits on same class
    useEffect(() => {
        if (!rawProgressData) return;
        const newKey = `${selectedClassId}:${selectedYearId}:${selectedSemester}`;
        if (progressDraftKeyRef.current === newKey) return;
        progressDraftKeyRef.current = newKey;
        setExtraMaterials([]); // reset local material additions on class/year change
        const map = new Map<string, Progress>();
        rawProgressData.progress.forEach((p: any) => {
            map.set(`${p.student_id}-${p.material_item_id}`, p);
        });
        setProgressMap(map);
    }, [rawProgressData]);

    const filteredDesaList = useMemo(() => {
        if (!selectedDaerahId) return desaList;
        return desaList.filter(d => d.daerah_id === selectedDaerahId);
    }, [desaList, selectedDaerahId]);

    // Kelompok yang bisa dipilih: untuk teacher, derive dari kelas yang di-fetch (sudah difilter per akses)
    // Untuk admin/hierarchical, gunakan kelompokList global dengan filter org
    const accessibleKelompokList = useMemo(() => {
        const isTeacher = userProfile?.role === 'teacher';
        if (isTeacher && classes.length > 0) {
            // Ambil unique kelompok dari classes yang accessible
            const kelompokMap = new Map<string, Kelompok>();
            classes.forEach((cls: any) => {
                if (cls.kelompok_id && cls.kelompok?.name && !kelompokMap.has(cls.kelompok_id)) {
                    kelompokMap.set(cls.kelompok_id, {
                        id: cls.kelompok_id,
                        name: cls.kelompok.name,
                        desa_id: cls.kelompok.desa_id || '',
                    } as Kelompok);
                }
            });
            return Array.from(kelompokMap.values());
        }
        return kelompokList;
    }, [classes, kelompokList, userProfile?.role]);

    const filteredKelompokList = useMemo(() => {
        const isTeacher = userProfile?.role === 'teacher';
        if (isTeacher) {
            if (selectedDesaId) {
                return accessibleKelompokList.filter(k => k.desa_id === selectedDesaId)
            }
            return accessibleKelompokList;
        }
        // Admin/hierarchical: filter berdasarkan org selection
        if (!selectedDesaId) {
            if (selectedDaerahId) {
                const desaIdsInDaerah = desaList
                    .filter(d => d.daerah_id === selectedDaerahId)
                    .map(d => d.id);
                return kelompokList.filter(k => desaIdsInDaerah.includes(k.desa_id));
            }
            return kelompokList;
        }
        return kelompokList.filter(k => k.desa_id === selectedDesaId);
    }, [accessibleKelompokList, kelompokList, desaList, selectedDaerahId, selectedDesaId, userProfile?.role]);

    // Kelas yang ditampilkan di dropdown difilter oleh kelompok terpilih
    const filteredClasses = useMemo(() => {
        if (!selectedKelompokId) return classes;
        return classes.filter((cls: any) => cls.kelompok_id === selectedKelompokId);
    }, [classes, selectedKelompokId]);

    const handleDaerahChange = (daerahId: string) => {
        setSelectedDaerahId(daerahId);
        setSelectedDesaId('');
        setSelectedKelompokId('');
        setSelectedClassId('');
        setSelectedStudentId('');
    };

    const handleDesaChange = (desaId: string) => {
        setSelectedDesaId(desaId);
        setSelectedKelompokId('');
        setSelectedClassId('');
        setSelectedStudentId('');
    };

    const handleKelompokChange = (kelompokId: string) => {
        setSelectedKelompokId(kelompokId);
        setSelectedClassId('');
        setSelectedStudentId('');
    };

    const handleProgressChange = (
        materialId: string,
        field: 'nilai' | 'notes',
        value: number | string
    ) => {
        if (!selectedStudentId) return;

        const key = `${selectedStudentId}-${materialId}`;
        const existing = progressMap.get(key) || {
            student_id: selectedStudentId,
            material_item_id: materialId
        };

        const updated = { ...existing, [field]: value };

        const newMap = new Map(progressMap);
        newMap.set(key, updated);
        setProgressMap(newMap);
    };

    const handleSave = async () => {
        try {
            setSaving(true);

            const updates: ProgressInput[] = Array.from(progressMap.values())
                .filter(p => p.student_id === selectedStudentId)
                .map(p => ({
                    student_id: p.student_id,
                    material_item_id: p.material_item_id,
                    academic_year_id: selectedYearId,
                    semester: selectedSemester,
                    done: p.done,
                    nilai: p.nilai,
                    notes: p.notes
                }));

            const result = await bulkUpdateProgress(updates);
            if (result.success) {
                toast.success('Progress berhasil disimpan');
                // Revalidate SWR caches after save
                progressDraftKeyRef.current = ''; // allow re-seed on next SWR update
                if (selectedClassId !== 'ALL') {
                    mutate(monitoringKeys.classProgress(selectedClassId, selectedYearId, selectedSemester));
                    mutate(monitoringKeys.monthlySummary(selectedClassId, selectedYearId, selectedSemester, selectedMonth!));
                }
                if (selectedStudentId && selectedMonth) {
                    mutate(monitoringKeys.monthlyTarget(selectedClassId, selectedYearId, selectedSemester, selectedMonth, selectedStudentId));
                }
            } else {
                toast.error(result.message || 'Gagal menyimpan progress');
            }
        } catch (error: any) {
            toast.error('Terjadi kesalahan saat menyimpan progress');
        } finally {
            setSaving(false);
        }
    };


    // Selected default to hafalan
    // const filteredMaterials = materials.filter(
    //     m => m.material_type?.material_category?.id === selectedCategoryId
    // );

    // Filter materials by selected category
    const filteredMaterials = materials.filter(m => {
        if (!selectedCategoryId) return true;
        return m.material_type?.material_category?.id === selectedCategoryId;
    });

    // Filter materials by month — jika bulan dipilih, hanya tampilkan materi yang ada di target bulan itu
    // Jika monthlyTargetItemIds kosong (tidak ada target), hasilnya memang kosong (bukan fallback ke semua)
    const displayedMaterials = useMemo(() => {
        if (!selectedMonth) return filteredMaterials;
        return filteredMaterials.filter(m => monthlyTargetItemIds.has(m.id));
    }, [filteredMaterials, selectedMonth, monthlyTargetItemIds]);

    // Calculate student metrics (completion rate & average nilai)
    const getStudentMetrics = useCallback((studentId: string) => {
        if (displayedMaterials.length === 0) return { completion: 0, avgNilai: 0 };

        const studentProgress = displayedMaterials.map(m => {
            const key = `${studentId}-${m.id}`;
            return progressMap.get(key);
        });

        // 1. Completion: materials that are "Tuntas" (Pass KKM 70 or marked as Hafal)
        const tuntasCount = studentProgress.filter(p => (p?.nilai !== undefined && p.nilai >= 70) || p?.done).length;
        const completion = Math.round((tuntasCount / displayedMaterials.length) * 100);

        // 2. Average Nilai: only from filled materials
        const scoredProgress = studentProgress.filter(p => p?.nilai !== undefined && p.nilai > 0);
        const totalNilai = scoredProgress.reduce((sum, p) => sum + (p!.nilai || 0), 0);
        const avgNilai = scoredProgress.length > 0 ? Math.round(totalNilai / scoredProgress.length) : 0;

        return { completion, avgNilai };
    }, [displayedMaterials, progressMap]);


    // Format class options:
    // - Jika kelompok SUDAH dipilih (filtered): cukup tampilkan nama kelas saja
    // - Jika kelompok BELUM dipilih (semua kelas): tampilkan "(NamaKelompok)" jika ada nama duplikat
    const classOptions = useMemo(() => {
        if (!filteredClasses.length) return [];

        let options: { value: string; label: string }[];

        if (selectedKelompokId) {
            // Kelompok sudah dipilih — tidak perlu label kelompok di nama kelas
            options = filteredClasses.map((cls: any) => ({
                value: cls.id,
                label: cls.name
            }));
        } else {
            // Belum pilih kelompok — cek duplikat nama di semua classes accessible
            const nameCounts = classes.reduce((acc, cls: any) => {
                const normalizedName = (cls.name || '').trim();
                acc[normalizedName] = (acc[normalizedName] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            options = filteredClasses.map((cls: any) => {
                const normalizedName = (cls.name || '').trim();
                const hasDuplicate = nameCounts[normalizedName] > 1;
                const kelompokName = cls.kelompok?.name;

                const label = (hasDuplicate && kelompokName)
                    ? `${cls.name} (${kelompokName})`
                    : cls.name;

                return { value: cls.id, label };
            });
        }

        // Add "Semua Kelas" option if there are multiple classes
        if (filteredClasses.length > 1) {
            options.unshift({ value: 'ALL', label: 'Semua Kelas' });
        }

        return options;
    }, [filteredClasses, classes, selectedKelompokId]);

    const currentStudent = selectedStudentId
        ? students.find(s => s.id === selectedStudentId)
        : students.length > 0
            ? students.sort((a, b) => a.name.localeCompare(b.name))[0]
            : undefined;
    const currentStudentIndex = students.findIndex(s => s.id === selectedStudentId);

    // Get selected class name for display
    const selectedClass = classes.find(c => c.id === selectedClassId);
    const selectedClassName = selectedClassId === 'ALL'
        ? 'Semua Kelas'
        : (classOptions.find(opt => opt.value === selectedClassId)?.label || selectedClass?.name || '');

    // Get current student completion
    // Get current student completion
    const { completion: currentStudentCompletion, avgNilai: currentStudentAvgNilai } = currentStudent ? getStudentMetrics(currentStudent.id) : { completion: 0, avgNilai: 0 };

    const classMetrics = useMemo(() => {
        if (!students.length) return null

        let totalProgress = 0
        let totalNilai = 0
        let countWithNilai = 0

        students.forEach(s => {
            const { completion, avgNilai } = getStudentMetrics(s.id)
            totalProgress += completion
            if (avgNilai > 0) {
                totalNilai += avgNilai
                countWithNilai++
            }
        })

        const avgProgress = Math.round(totalProgress / students.length)
        const avgNilai = countWithNilai > 0 ? Math.round(totalNilai / countWithNilai) : 0

        return { avgProgress, avgNilai, totalCount: students.length }
    }, [students, getStudentMetrics])

    return (
        <div className="flex h-[calc(100vh-8rem)] relative">
            {/* Student Sidebar */}
            {selectedClassId && (
                <StudentSidebar
                    students={students}
                    selectedStudentId={selectedStudentId}
                    onStudentSelect={setSelectedStudentId}
                    progressData={progressMap}
                    materials={displayedMaterials}
                    isOpen={sidebarOpen}
                    onToggle={() => setSidebarOpen(!sidebarOpen)}
                    isLoading={loading}
                    selectedClassName={selectedClassName}
                    monthlyPercentages={monthlyPercentages}
                    classMetrics={classMetrics}
                />
            )}

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header with Hamburger */}
                <div className={`bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 md:px-6 py-4 ${isMobile() && !selectedClassId ? 'hidden' : ''}`}>
                    <div className="flex items-center gap-3">
                        {/* Hamburger Menu (mobile only, visible when class selected) */}
                        {selectedClassId && (
                            <button
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                        )}

                        {/* Title */}
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <svg className="hidden md:block w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                {isMobile() && currentStudent?.name && (
                                    <div className='md:hidden'>
                                        <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                                            {currentStudent?.name}
                                        </h1>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {selectedClassName}
                                        </p>
                                    </div>
                                )}
                                <h1 className="hidden md:block text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                                    Monitoring
                                </h1>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 hidden md:block">
                                Tracking progress siswa per tahun ajaran dan semester
                            </p>
                        </div>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto">
                    <div className="max-w-full md:px-6 pt-6 pb-24 md:pb-6">
                        {/* Filters - Collapsible */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
                            {/* Header with Collapse Button */}
                            <div
                                className="flex items-center justify-between p-4 cursor-pointer md:cursor-default"
                                onClick={() => isMobile() && setIsFilterCollapsed(!isFilterCollapsed)}
                            >
                                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    Filter
                                </h3>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsFilterCollapsed(!isFilterCollapsed);
                                    }}
                                    className="md:hidden p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                >
                                    <svg
                                        className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${isFilterCollapsed ? '' : 'rotate-180'}`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                            </div>

                            {/* Collapsible Content */}
                            <div className={`overflow-hidden transition-all duration-300 ${isFilterCollapsed ? 'max-h-0 md:max-h-none' : 'max-h-96'}`}>
                                <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700 pt-4">
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                                        {/* Tahun Ajaran */}
                                        {filterLoading ? (
                                            <div className="animate-pulse">
                                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-2"></div>
                                                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                            </div>
                                        ) : (
                                            <InputFilter
                                                id="academic-year-filter"
                                                label="Tahun Ajaran"
                                                value={selectedYearId}
                                                onChange={setSelectedYearId}
                                                options={academicYears}
                                                placeholder="Pilih Tahun"
                                                variant="modal"
                                                compact
                                            />
                                        )}

                                        {/* Semester */}
                                        {filterLoading ? (
                                            <div className="animate-pulse">
                                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-2"></div>
                                                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                            </div>
                                        ) : (
                                            <InputFilter
                                                id="semester-filter"
                                                label="Semester"
                                                value={String(selectedSemester)}
                                                onChange={(val) => {
                                                    setSelectedSemester(Number(val) as 1 | 2);
                                                    setSelectedMonth(null);
                                                }}
                                                options={[
                                                    { value: '1', label: 'Semester 1' },
                                                    { value: '2', label: 'Semester 2' },
                                                ]}
                                                variant="modal"
                                                compact
                                            />
                                        )}

                                        {/* Daerah Filter */}
                                        {userProfile && shouldShowDaerahFilter(userProfile) && (
                                            <div>
                                                {filterLoading ? (
                                                    <div className="animate-pulse">
                                                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-2"></div>
                                                        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                                    </div>
                                                ) : (
                                                    <InputFilter
                                                        id="daerah-filter"
                                                        label="Daerah"
                                                        value={selectedDaerahId}
                                                        onChange={handleDaerahChange}
                                                        options={daerahList.map(d => ({ value: d.id, label: d.name }))}
                                                        allOptionLabel="Pilih Daerah"
                                                        variant="modal"
                                                        compact
                                                    />
                                                )}
                                            </div>
                                        )}

                                        {/* Desa Filter */}
                                        {userProfile && modalShouldShowDesaFilter(userProfile) && (
                                            <div>
                                                {filterLoading ? (
                                                    <div className="animate-pulse">
                                                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-2"></div>
                                                        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                                    </div>
                                                ) : filteredDesaList.length > 0 && (
                                                    <InputFilter
                                                        id="desa-filter"
                                                        label="Desa"
                                                        value={selectedDesaId}
                                                        onChange={handleDesaChange}
                                                        options={filteredDesaList.map(d => ({ value: d.id, label: d.name }))}
                                                        allOptionLabel="Pilih Desa"
                                                        variant="modal"
                                                        compact
                                                        disabled={userProfile && shouldShowDaerahFilter(userProfile) && !selectedDaerahId}
                                                    />
                                                )}
                                            </div>
                                        )}

                                        {/* Kelompok Filter — tampil untuk admin/guru daerah/desa DAN guru multi-kelompok */}
                                        {userProfile && (modalShouldShowKelompokFilter(userProfile) || filteredKelompokList.length > 1) && (
                                            <div>
                                                {filterLoading ? (
                                                    <div className="animate-pulse">
                                                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-2"></div>
                                                        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                                    </div>
                                                ) : filteredKelompokList.length > 0 && (
                                                    <InputFilter
                                                        id="kelompok-filter"
                                                        label="Kelompok"
                                                        value={selectedKelompokId}
                                                        onChange={handleKelompokChange}
                                                        options={filteredKelompokList.map(k => ({ value: k.id, label: k.name }))}
                                                        allOptionLabel="Pilih Kelompok"
                                                        variant="modal"
                                                        compact
                                                        disabled={userProfile && modalShouldShowDesaFilter(userProfile) && !selectedDesaId}
                                                    />
                                                )}
                                            </div>
                                        )}

                                        {/* Kelas with Skeleton */}
                                        <div>
                                            {filterLoading ? (
                                                <div className="animate-pulse">
                                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-2"></div>
                                                    <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                                </div>
                                            ) : (
                                                <InputFilter
                                                    id="class-filter"
                                                    label="Kelas"
                                                    value={selectedClassId}
                                                    onChange={setSelectedClassId}
                                                    options={classOptions}
                                                    placeholder="Pilih Kelas"
                                                    variant="modal"
                                                    compact
                                                    disabled={!selectedKelompokId}
                                                />
                                            )}
                                        </div>

                                        {/* Kategori with Skeleton */}
                                        <div>
                                            {filterLoading ? (
                                                <div className="animate-pulse">
                                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-2"></div>
                                                    <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                                </div>
                                            ) : (
                                                <InputFilter
                                                    id="category-filter"
                                                    label="Kategori"
                                                    value={selectedCategoryId}
                                                    onChange={setSelectedCategoryId}
                                                    options={hafalanCategories.map(c => ({ value: c.id, label: c.name }))}
                                                    allOptionLabel="Semua Kategori"
                                                    variant="modal"
                                                    compact
                                                />
                                            )}
                                        </div>

                                        {/* Bulan Filter — hanya tampil jika ada kelas dipilih */}
                                        {selectedClassId && (
                                            <InputFilter
                                                id="month-filter"
                                                label="Bulan"
                                                value={selectedMonth?.toString() ?? ''}
                                                onChange={(val) => setSelectedMonth(val ? Number(val) : null)}
                                                options={getSemesterMonths(selectedSemester as Semester).map(m => ({
                                                    value: m.toString(),
                                                    label: getMonthName(m as Month)
                                                }))}
                                                allOptionLabel="Semua Bulan"
                                                variant="modal"
                                                compact
                                                disabled={!selectedClassId}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        {!selectedClassId ? (
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
                                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Pilih Kelas</h3>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    Silakan pilih kelas untuk melihat data
                                </p>
                            </div>
                        ) : loading ? (
                            <MonitoringContentSkeleton />
                        ) : !currentStudent ? (
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
                                <p className="text-sm text-gray-500 dark:text-gray-400">Tidak ada siswa di kelas ini</p>
                            </div>
                        ) : (
                            <>
                                {/* Enhanced Student Info Card */}
                                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-0 md:p-5 mb-6">
                                    {/* Mobile Layout */}
                                    <div className="md:hidden">
                                        {/* Top: Avatar + Name */}
                                        <div className="flex items-center gap-4">
                                            {/* <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                                                {currentStudent.name.charAt(0).toUpperCase()}
                                            </div> */}
                                            <div className="flex-1">
                                                <h3 className="hidden md:block text-lg font-semibold text-gray-900 dark:text-white">
                                                    {currentStudent.name}
                                                </h3>
                                                {/* NIS - Commented until DB ready */}
                                                {/* <p className="text-xs text-gray-600 dark:text-gray-400">
                                                    NIS: {currentStudent.nis || '-'} • {selectedClassName}
                                                </p> */}
                                                <p className="hidden md:block text-sm text-gray-600 dark:text-gray-400">
                                                    {selectedClassName}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Bottom: Total Capaian Section */}
                                        <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-4 flex items-center justify-evenly md:justify-between">
                                            <div>
                                                <div className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">
                                                    Rata-rata Nilai
                                                </div>
                                                <div className={`text-4xl text-center font-bold ${getRateStyle(currentStudentAvgNilai, 'text-pure')}`}>
                                                    {currentStudentAvgNilai}
                                                </div>
                                            </div>
                                            <div className="relative inline-flex items-center justify-center">
                                                {/* Background Circle */}
                                                <svg className="w-20 h-20 transform -rotate-90">
                                                    <circle
                                                        cx="40"
                                                        cy="40"
                                                        r="32"
                                                        stroke="currentColor"
                                                        strokeWidth="6"
                                                        fill="transparent"
                                                        className="text-gray-200 dark:text-gray-600"
                                                    />
                                                    {/* Progress Circle */}
                                                    <circle
                                                        cx="40"
                                                        cy="40"
                                                        r="32"
                                                        stroke="currentColor"
                                                        strokeWidth="6"
                                                        fill="transparent"
                                                        strokeDasharray={`${(currentStudentAvgNilai / 100) * 200.96} 200.96`}
                                                        className={`transition-all duration-500 ${getRateStyle(currentStudentAvgNilai, 'text-pure')}`}
                                                        strokeLinecap="round"
                                                    />
                                                </svg>
                                                {/* Grade Text (inside circle) */}
                                                {(() => {
                                                    const gradeInfo = getRateGrade(currentStudentAvgNilai);
                                                    return (
                                                        <span className={`absolute text-2xl font-bold ${gradeInfo.grade !== '-' ? gradeInfo.text : 'text-gray-400'}`}>
                                                            {gradeInfo.grade}
                                                        </span>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Desktop Layout */}
                                    {/* <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6"></div> */}
                                    <div className="hidden md:flex items-center justify-between gap-4">
                                        {/* Left: Avatar + Info */}
                                        <div className="flex items-center gap-4">
                                            {/* <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                                                {currentStudent.name.charAt(0).toUpperCase()}
                                            </div> */}
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                                    {currentStudent.name}
                                                </h3>
                                                {/* NIS - Commented until DB ready */}
                                                {/* <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    NIS: {currentStudent.nis || '-'} • {selectedClassName}
                                                </p> */}
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    {selectedClassName}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Right: Total Capaian + Circular Progress */}
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <div className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                                                    Rata-rata Nilai
                                                </div>
                                                <div className={`text-3xl text-center font-bold ${getRateStyle(currentStudentAvgNilai, 'text-pure')}`}>
                                                    {currentStudentAvgNilai}
                                                </div>
                                            </div>
                                            <div className="relative inline-flex items-center justify-center">
                                                {/* Background Circle */}
                                                <svg className="w-16 h-16 transform -rotate-90">
                                                    <circle
                                                        cx="32"
                                                        cy="32"
                                                        r="26"
                                                        stroke="currentColor"
                                                        strokeWidth="5"
                                                        fill="transparent"
                                                        className="text-gray-200 dark:text-gray-600"
                                                    />
                                                    {/* Progress Circle */}
                                                    <circle
                                                        cx="32"
                                                        cy="32"
                                                        r="26"
                                                        stroke="currentColor"
                                                        strokeWidth="5"
                                                        fill="transparent"
                                                        strokeDasharray={`${(currentStudentAvgNilai / 100) * 163.36} 163.36`}
                                                        className={`transition-all duration-500 ${getRateStyle(currentStudentAvgNilai, 'text-pure')}`}
                                                        strokeLinecap="round"
                                                    />
                                                </svg>
                                                {/* Grade Text (inside circle) */}
                                                {(() => {
                                                    const gradeInfo = getRateGrade(currentStudentAvgNilai);
                                                    return (
                                                        <span className={`absolute text-xl font-bold ${gradeInfo.grade !== '-' ? gradeInfo.text : 'text-gray-400'}`}>
                                                            {gradeInfo.grade}
                                                        </span>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Monthly Target Progress Card */}
                                    {/* {selectedMonth && monthlyTargetProgress && monthlyTargetProgress.total_targets > 0 && (
                                        <div className="mt-4 p-4 md:mx-4 md:mb-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                                            <div className="flex justify-between items-end mb-2">
                                                <p className="text-sm font-medium text-indigo-700 dark:text-indigo-400">
                                                    Target {getMonthName(selectedMonth as Month)}
                                                </p>
                                                <span className="text-sm font-bold text-indigo-700 dark:text-indigo-400">
                                                    {monthlyTargetProgress.completed}/{monthlyTargetProgress.total_targets} Selesai
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 bg-indigo-200 dark:bg-indigo-800 rounded-full h-2.5">
                                                    <div
                                                        className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
                                                        style={{ width: `${monthlyTargetProgress.percentage}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 w-8 text-right">
                                                    {monthlyTargetProgress.percentage}%
                                                </span>
                                            </div>
                                        </div>
                                    )} */}
                                </div>


                                {/* Progress Display - Split by Category */}
                                {materialsAreaLoading ? (
                                    <MonitoringMaterialsSkeleton />
                                ) : displayedMaterials.length === 0 ? (
                                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {selectedMonth ? 'Tidak ada target materi untuk bulan ini' : 'Tidak ada materi untuk kategori ini'}
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Group materials by hafalan type (Doa/Surat) */}
                                        {(() => {
                                            const grouped = displayedMaterials.reduce((acc, material) => {
                                                const typeName = material.material_type?.name || 'Lainnya';
                                                if (!acc[typeName]) acc[typeName] = [];
                                                acc[typeName].push(material);
                                                return acc;
                                            }, {} as Record<string, typeof displayedMaterials>);


                                            return Object.entries(grouped).map(([typeName, materials]) => (
                                                <div key={typeName} className="mb-6 last:mb-0">
                                                    {/* Category Header */}
                                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 px-4 md:px-0">
                                                        {typeName}
                                                    </h3>

                                                    {/* Responsive Table (Mobile & Desktop) */}
                                                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                                                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                                            <thead className="bg-gray-50 dark:bg-gray-700">
                                                                <tr>
                                                                    <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                                        Materi
                                                                    </th>
                                                                    <th className="px-3 md:px-4 py-2 md:py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-20 md:w-32">
                                                                        Nilai
                                                                    </th>
                                                                    <th className="px-3 md:px-4 py-2 md:py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-16 md:w-32">
                                                                        Predikat
                                                                    </th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                                                {materials.map((material) => {
                                                                    const key = `${selectedStudentId}-${material.id}`;
                                                                    const progress = progressMap.get(key);
                                                                    const gradeInfo = getRateGrade(progress?.nilai);
                                                                    console.log('gradeInfo', gradeInfo)

                                                                    return (
                                                                        <tr key={material.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                                                                            <td className="px-3 md:px-4 py-2 md:py-3 text-sm text-gray-900 dark:text-white">
                                                                                {material.name}
                                                                                {/* {selectedMonth && monthlyTargetItemIds.has(material.id) && (
                                                                                    <span className="ml-2 px-1.5 py-0.5 text-[10px] uppercase tracking-wider bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 rounded font-bold">
                                                                                        Target
                                                                                    </span>
                                                                                )} */}
                                                                            </td>
                                                                            <td className="px-3 md:px-4 py-2 md:py-3 text-center">
                                                                                <input
                                                                                    type="number"
                                                                                    min="0"
                                                                                    max="100"
                                                                                    value={progress?.nilai || ''}
                                                                                    onChange={(e) => {
                                                                                        const val = parseInt(e.target.value) || 0;
                                                                                        const clamped = Math.max(0, Math.min(100, val));
                                                                                        handleProgressChange(material.id, 'nilai', clamped);
                                                                                    }}
                                                                                    placeholder="0"
                                                                                    className="w-16 md:w-24 px-2 md:px-3 py-1 md:py-2 text-sm text-center border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                                                                />
                                                                            </td>
                                                                            <td className="px-3 md:px-4 py-2 md:py-3 text-center">
                                                                                <span className={`inline-flex items-center px-2 md:px-3 py-1 rounded md:rounded-full text-xs md:text-sm font-bold md:font-medium ${gradeInfo.bg} ${gradeInfo.color}`}>
                                                                                    {gradeInfo.grade}
                                                                                </span>
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            ));
                                        })()}
                                    </>
                                )}

                                {/* Cross-Class History Section — DISABLED: fitur belum siap, monitoring baru rilis TA ini */}
                                {/* {crossClassHistory.length > 0 && (
                                    ...
                                )} */}


                                {/* Grading Legend */}
                                <div className="dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-4">
                                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Keterangan Predikat dan Deskripsi
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                        {PREDIKAT_LEGEND.map((item) => (
                                            <div key={`${item.grade}-${item.range}`} className="flex items-center gap-3">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getLegendBadgeClass(item.variant)}`}>
                                                    {item.grade}
                                                </span>
                                                <span className="text-gray-700 dark:text-gray-300">{item.range} = {item.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Save Button - Desktop only */}
                                <div className="mt-6 hidden md:flex justify-end gap-3">
                                    <Button
                                        onClick={handleSave}
                                        variant="primary"
                                        loading={saving}
                                        loadingText="Menyimpan..."
                                    >
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                        </svg>
                                        Simpan Progress
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Floating Save Button - Mobile only */}
            {currentStudent && (
                <FloatingSaveButton
                    onSave={handleSave}
                    saving={saving}
                    disabled={!selectedStudentId}
                />
            )}
        </div>
    );
}
