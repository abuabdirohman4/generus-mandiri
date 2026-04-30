'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
    getClassProgress, 
    getMaterialsByClassAndSemester, 
    bulkUpdateProgress, 
    getHafalanCategories, 
    getMonthlyTargetProgress,
    getCrossClassHistory,
    getClassMonthlyTargetSummary,
    getTeacherRestrictions,
    getAllowedCategories
} from './actions/monitoring';
import { getSemesterMonths, getMonthName } from '@/app/(admin)/materi/types';
import type { Semester, Month } from '@/app/(admin)/materi/types';
import { getAllClasses } from '@/app/(admin)/users/siswa/actions/classes/actions';
import { useUserProfile } from '@/stores/userProfileStore';
import { getActiveAcademicYear } from '@/app/(admin)/tahun-ajaran/actions/academic-years';
import { getAllDaerah } from '@/app/(admin)/organisasi/actions/daerah';
import { getAllDesa } from '@/app/(admin)/organisasi/actions/desa';
import { getAllKelompok } from '@/app/(admin)/organisasi/actions/kelompok';
import AcademicYearSelector from '@/app/(admin)/tahun-ajaran/components/AcademicYearSelector';
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
import { getGrade } from '@/lib/percentages';
import StudentSidebar from './components/StudentSidebar';
import FloatingSaveButton from './components/FloatingSaveButton';
import { isMobile } from '@/lib/utils';

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
    hafal?: boolean;
    nilai?: number;
    notes?: string;
}

interface HafalanCategory {
    id: string;
    name: string;
}

export default function MonitoringPage() {
    const { profile: userProfile } = useUserProfile();

    const [selectedYearId, setSelectedYearId] = useState<string>('');
    const [selectedSemester, setSelectedSemester] = useState<1 | 2>(1);
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
    const [selectedStudentId, setSelectedStudentId] = useState<string>('');

    const [hafalanCategories, setHafalanCategories] = useState<HafalanCategory[]>([]);
    
    // Org states
    const [daerahList, setDaerahList] = useState<Daerah[]>([]);
    const [desaList, setDesaList] = useState<Desa[]>([]);
    const [kelompokList, setKelompokList] = useState<Kelompok[]>([]);
    const [selectedDaerahId, setSelectedDaerahId] = useState<string>('');
    const [selectedDesaId, setSelectedDesaId] = useState<string>('');
    const [selectedKelompokId, setSelectedKelompokId] = useState<string>('');

    const [classes, setClasses] = useState<any[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [progressMap, setProgressMap] = useState<Map<string, Progress>>(new Map());
    const [loading, setLoading] = useState(false);
    const [filterLoading, setFilterLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isFilterCollapsed, setIsFilterCollapsed] = useState(false);

    // New states for Monthly Curriculum Targets
    const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
    const [monthlyTargetProgress, setMonthlyTargetProgress] = useState<{
        total_targets: number;
        completed: number;
        percentage: number;
    } | null>(null);
    const [monthlyTargetItemIds, setMonthlyTargetItemIds] = useState<Set<string>>(new Set());
    const [crossClassHistory, setCrossClassHistory] = useState<any[]>([]);
    const [crossClassLoading, setCrossClassLoading] = useState(false);
    const [monthlyPercentages, setMonthlyPercentages] = useState<Map<string, number>>(new Map());

    // Load initial data
    useEffect(() => {
        loadInitialData();
    }, []);

    // Auto-collapse filter on mobile when student is selected
    useEffect(() => {
        if (selectedStudentId && isMobile()) {
            setIsFilterCollapsed(true);
        }
    }, [selectedStudentId]);

    // Load class data when filters change
    useEffect(() => {
        if (selectedYearId && selectedClassId) {
            loadClassData();
        }
    }, [selectedYearId, selectedSemester, selectedClassId]);

    // Auto-select first student when students list changes
    useEffect(() => {
        if (students.length > 0) {
            // Always select first student when students change
            setSelectedStudentId(students[0].id);
        } else {
            setSelectedStudentId('');
        }
    }, [students]);

    // Load monthly target progress for selected student and month
    useEffect(() => {
        if (!selectedStudentId || !selectedClassId || !selectedMonth || !selectedYearId) {
            setMonthlyTargetProgress(null);
            setMonthlyTargetItemIds(new Set());
            return;
        }

        getMonthlyTargetProgress({
            classId: selectedClassId,
            academicYearId: selectedYearId,
            semester: selectedSemester,
            month: selectedMonth,
            studentId: selectedStudentId
        }).then(result => {
            setMonthlyTargetProgress({
                total_targets: result.targets.length,
                completed: result.progress.filter(p => {
                    const score = p.nilai !== null && p.nilai !== undefined ? p.nilai : (p.hafal ? 100 : 0);
                    return score >= 70; // passing score default
                }).length,
                percentage: result.percentage
            });
            setMonthlyTargetItemIds(new Set(result.targets.map((t: any) => t.material_item_id)));
        }).catch(console.error);
    }, [selectedStudentId, selectedClassId, selectedMonth, selectedYearId, selectedSemester, progressMap]); // Re-run when progressMap changes to update live

    // Load cross-class history for selected student
    useEffect(() => {
        if (selectedStudentId && selectedYearId) {
            setCrossClassLoading(true);
            getCrossClassHistory(selectedStudentId, selectedYearId)
                .then(setCrossClassHistory)
                .catch(console.error)
                .finally(() => setCrossClassLoading(false));
        } else {
            setCrossClassHistory([]);
        }
    }, [selectedStudentId, selectedYearId]);

    // Load class monthly target summary for all students in the class
    useEffect(() => {
        if (!selectedClassId || !selectedMonth || !selectedYearId) {
            setMonthlyPercentages(new Map());
            return;
        }

        getClassMonthlyTargetSummary({
            classId: selectedClassId,
            academicYearId: selectedYearId,
            semester: selectedSemester,
            month: selectedMonth
        }).then(summary => {
            setMonthlyPercentages(new Map(summary.map(s => [s.student_id, s.percentage])));
        }).catch(console.error);
    }, [selectedClassId, selectedMonth, selectedYearId, selectedSemester, progressMap]);

    const loadInitialData = async () => {
        try {
            setFilterLoading(true);

            const activeYear = await getActiveAcademicYear();
            if (activeYear) {
                setSelectedYearId(activeYear.id);
            }

            // Load org data, categories, and classes in parallel
            // getAllClasses() sudah handle filter berdasarkan role (teacher_classes, hierarchical, admin)
            const [daerahData, desaData, allKelompokData, categoriesData, classesData, cmRestrictions] = await Promise.all([
                getAllDaerah(),
                getAllDesa(),
                getAllKelompok(),
                getHafalanCategories(),
                getAllClasses(),
                getTeacherRestrictions()
            ]);

            setDaerahList(daerahData);
            setDesaList(desaData);
            setKelompokList(allKelompokData);
            setClasses(classesData as any[]);

            // Filter categories by class master restriction
            let finalCategories = categoriesData;
            if (cmRestrictions && cmRestrictions.length > 0) {
                const allowedCategoryIds = await getAllowedCategories(cmRestrictions);
                finalCategories = categoriesData.filter(cat => allowedCategoryIds.includes(cat.id));
            }
            setHafalanCategories(finalCategories);

            // Auto-select org filters from user profile
            if (userProfile) {
                if (userProfile.daerah_id && !selectedDaerahId) setSelectedDaerahId(userProfile.daerah_id);
                if (userProfile.desa_id && !selectedDesaId) setSelectedDesaId(userProfile.desa_id);
                if (userProfile.kelompok_id && !selectedKelompokId) setSelectedKelompokId(userProfile.kelompok_id);
            }

            // Auto-select first category
            if (finalCategories.length > 0 && !selectedCategoryId) {
                setSelectedCategoryId(finalCategories[0].id);
            }
        } catch (error: any) {
            toast.error(error.message || 'Gagal memuat data awal');
            console.error('Failed to load initial data:', error);
        } finally {
            setFilterLoading(false);
        }
    };

    const loadClassData = async () => {
        if (!selectedYearId) {
            console.error('selectedYearId kosong saat loadClassData dipanggil');
            return;
        }

        try {
            setLoading(true);

            // Handle "Pilih Semua" case - load all students from all classes
            if (selectedClassId === 'ALL') {
                const allStudentsMap = new Map<string, Student>();
                const allProgressMap = new Map<string, Progress>();
                let allMaterials: Material[] = [];

                // Load data for each class
                for (const classData of classes) {
                    try {
                        const classProgress = await getClassProgress(
                            classData.id,
                            selectedYearId,
                            selectedSemester
                        );

                        if (classProgress) {
                            // Add students with class info
                            classProgress.students?.forEach((student: Student) => {
                                if (!allStudentsMap.has(student.id)) {
                                    allStudentsMap.set(student.id, {
                                        ...student,
                                        class_name: classData.name // Add class name for display
                                    });
                                }
                            });

                            // Merge progress
                            classProgress.progress?.forEach((p: any) => {
                                const key = `${p.student_id}-${p.material_item_id}`;
                                allProgressMap.set(key, p);
                            });
                        }

                        // Load materials for this class
                        const classMaterials = await getMaterialsByClassAndSemester(
                            classData.id,
                            selectedSemester
                        );

                        // Merge materials (avoid duplicates)
                        if (classMaterials) {
                            classMaterials.forEach((m: Material) => {
                                if (!allMaterials.find(existing => existing.id === m.id)) {
                                    allMaterials.push(m);
                                }
                            });
                        }
                    } catch (error) {
                        console.error(`Error loading data for class ${classData.name}:`, error);
                    }
                }

                setStudents(Array.from(allStudentsMap.values()));
                setProgressMap(allProgressMap);
                setMaterials(allMaterials);
            } else {
                // Single class selection - original logic
                // Load students and progress
                const classData = await getClassProgress(
                    selectedClassId,
                    selectedYearId,
                    selectedSemester
                );

                if (classData) {
                    setStudents(classData.students || []);

                    const map = new Map<string, Progress>();
                    classData.progress?.forEach((p: any) => {
                        const key = `${p.student_id}-${p.material_item_id}`;
                        map.set(key, p);
                    });
                    setProgressMap(map);
                }

                // Load materials
                const materialsData = await getMaterialsByClassAndSemester(
                    selectedClassId,
                    selectedSemester
                );
                setMaterials(materialsData || []);
            }


        } catch (error: any) {
            toast.error(error.message || 'Gagal memuat data kelas');
        } finally {
            setLoading(false);
        }
    };

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
            // Guru: gunakan accessibleKelompokList (sudah scope ke kelas accessible)
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
        setStudents([]);
        setMaterials([]);
    };

    const handleDesaChange = (desaId: string) => {
        setSelectedDesaId(desaId);
        setSelectedKelompokId('');
        setSelectedClassId('');
        setSelectedStudentId('');
        setStudents([]);
        setMaterials([]);
    };

    const handleKelompokChange = (kelompokId: string) => {
        setSelectedKelompokId(kelompokId);
        setSelectedClassId('');
        setSelectedStudentId('');
        setStudents([]);
        setMaterials([]);
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
                    hafal: p.hafal,
                    nilai: p.nilai,
                    notes: p.notes
                }));

            await bulkUpdateProgress(updates);
            toast.success('Progress berhasil disimpan');
        } catch (error: any) {
            toast.error(error.message || 'Gagal menyimpan progress');
        } finally {
            setSaving(false);
        }
    };

    // Calculate student completion percentage (average nilai)
    const getStudentCompletion = (studentId: string): number => {
        if (displayedMaterials.length === 0) return 0;

        const studentProgress = displayedMaterials
            .map(m => {
                const key = `${studentId}-${m.id}`;
                return progressMap.get(key);
            })
            .filter(p => p?.nilai !== undefined && p.nilai > 0); // Only count scored materials

        if (studentProgress.length === 0) return 0;

        const totalNilai = studentProgress.reduce((sum, p) => sum + (p!.nilai || 0), 0);
        return Math.round(totalNilai / studentProgress.length);
    };

    // Filter materials by selected category
    const filteredMaterials = materials.filter(
        m => m.material_type?.material_category?.id === selectedCategoryId
    );

    // Filter materials by month — jika bulan dipilih, hanya tampilkan materi yang ada di target bulan itu
    // Jika monthlyTargetItemIds kosong (tidak ada target), hasilnya memang kosong (bukan fallback ke semua)
    const displayedMaterials = useMemo(() => {
        if (!selectedMonth) return filteredMaterials;
        return filteredMaterials.filter(m => monthlyTargetItemIds.has(m.id));
    }, [filteredMaterials, selectedMonth, monthlyTargetItemIds]);

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
    const currentStudentCompletion = currentStudent ? getStudentCompletion(currentStudent.id) : 0;

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
                                    <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                                        {/* Academic Year & Semester */}
                                        <div className="md:col-span-2">
                                            <AcademicYearSelector
                                                selectedYearId={selectedYearId}
                                                selectedSemester={selectedSemester}
                                                onYearChange={setSelectedYearId}
                                                onSemesterChange={(semester) => {
                                                    setSelectedSemester(semester);
                                                    setSelectedMonth(null); // Reset month when semester changes
                                                }}
                                                showSemester={true}
                                            />
                                        </div>

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
                                                        allOptionLabel="Semua Daerah"
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
                                                        allOptionLabel="Semua Desa"
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
                                                        allOptionLabel="Semua Kelompok"
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
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
                                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Memuat data...</p>
                            </div>
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
                                                    Total Nilai
                                                </div>
                                                <div className={`text-4xl text-center font-bold ${currentStudentCompletion >= 90 ? 'text-green-500' :
                                                    currentStudentCompletion >= 80 ? 'text-blue-500' :
                                                        currentStudentCompletion >= 70 ? 'text-yellow-500' :
                                                            'text-red-500'}`}>
                                                    {currentStudentCompletion}
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
                                                        strokeDasharray={`${(currentStudentCompletion / 100) * 200.96} 200.96`}
                                                        className={`
                                                            transition-all duration-500
                                                            ${currentStudentCompletion >= 90 ? 'text-green-500' :
                                                                currentStudentCompletion >= 80 ? 'text-blue-500' :
                                                                    currentStudentCompletion >= 70 ? 'text-yellow-500' :
                                                                        'text-red-500'}
                                                        `}
                                                        strokeLinecap="round"
                                                    />
                                                </svg>
                                                {/* Grade Text (inside circle) */}
                                                <span className={`absolute text-2xl font-bold ${currentStudentCompletion >= 90 ? 'text-green-600 dark:text-green-400' :
                                                    currentStudentCompletion >= 80 ? 'text-blue-600 dark:text-blue-400' :
                                                        currentStudentCompletion >= 70 ? 'text-yellow-600 dark:text-yellow-400' :
                                                            'text-red-600 dark:text-red-400'
                                                    }`}>
                                                    {getGrade(currentStudentCompletion).grade}
                                                </span>
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
                                                    Total Nilai
                                                </div>
                                                <div className={`text-3xl text-center font-bold ${currentStudentCompletion >= 90 ? 'text-green-500' :
                                                    currentStudentCompletion >= 80 ? 'text-blue-500' :
                                                        currentStudentCompletion >= 70 ? 'text-yellow-500' :
                                                            'text-red-500'}`}>
                                                    {currentStudentCompletion}
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
                                                        strokeDasharray={`${(currentStudentCompletion / 100) * 163.36} 163.36`}
                                                        className={`
                                                            transition-all duration-500
                                                            ${currentStudentCompletion >= 90 ? 'text-green-500' :
                                                                currentStudentCompletion >= 80 ? 'text-blue-500' :
                                                                    currentStudentCompletion >= 70 ? 'text-yellow-500' :
                                                                        'text-red-500'}
                                                        `}
                                                        strokeLinecap="round"
                                                    />
                                                </svg>
                                                {/* Grade Text (inside circle) */}
                                                <span className={`absolute text-xl font-bold ${currentStudentCompletion >= 90 ? 'text-green-600 dark:text-green-400' :
                                                    currentStudentCompletion >= 80 ? 'text-blue-600 dark:text-blue-400' :
                                                        currentStudentCompletion >= 70 ? 'text-yellow-600 dark:text-yellow-400' :
                                                            'text-red-600 dark:text-red-400'
                                                    }`}>
                                                    {getGrade(currentStudentCompletion).grade}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Monthly Target Progress Card */}
                                    {selectedMonth && monthlyTargetProgress && monthlyTargetProgress.total_targets > 0 && (
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
                                    )}
                                </div>


                                {/* Progress Display - Split by Category */}
                                {displayedMaterials.length === 0 ? (
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
                                                                        Grade
                                                                    </th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                                                {materials.map((material) => {
                                                                    const key = `${selectedStudentId}-${material.id}`;
                                                                    const progress = progressMap.get(key);
                                                                    const gradeInfo = getGrade(progress?.nilai);

                                                                    return (
                                                                        <tr key={material.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                                                                            <td className="px-3 md:px-4 py-2 md:py-3 text-sm text-gray-900 dark:text-white">
                                                                                {material.name}
                                                                                {selectedMonth && monthlyTargetItemIds.has(material.id) && (
                                                                                    <span className="ml-2 px-1.5 py-0.5 text-[10px] uppercase tracking-wider bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 rounded font-bold">
                                                                                        Target
                                                                                    </span>
                                                                                )}
                                                                            </td>
                                                                            <td className="px-3 md:px-4 py-2 md:py-3 text-center">
                                                                                <input
                                                                                    type="number"
                                                                                    min="0"
                                                                                    max="100"
                                                                                    value={progress?.nilai || ''}
                                                                                    onChange={(e) => handleProgressChange(material.id, 'nilai', parseInt(e.target.value) || 0)}
                                                                                    placeholder="0"
                                                                                    className="w-16 md:w-24 px-2 md:px-3 py-1 md:py-2 text-sm text-center border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                                                                />
                                                                            </td>
                                                                            <td className="px-3 md:px-4 py-2 md:py-3 text-center">
                                                                                <span className={`inline-flex items-center px-2 md:px-3 py-1 rounded md:rounded-full text-xs md:text-sm font-bold md:font-medium ${gradeInfo.color}`}>
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

                                {/* Cross-Class History Section */}
                                {crossClassHistory.length > 0 && (
                                    <div className="mt-6 border border-amber-200 dark:border-amber-800 rounded-lg overflow-hidden">
                                        <div className="bg-amber-50 dark:bg-amber-900/20 px-4 py-3 border-b border-amber-200 dark:border-amber-800">
                                            <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-500 flex items-center gap-2">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                Materi Belum Tuntas (Tahun Ajaran Sebelumnya)
                                            </h4>
                                        </div>
                                        <div className="bg-white dark:bg-gray-800 p-0">
                                            {crossClassLoading ? (
                                                <div className="p-4 text-center text-sm text-gray-500">Memuat riwayat...</div>
                                            ) : (
                                                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                                    {crossClassHistory.map((item, idx) => (
                                                        <div key={idx} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-gray-750">
                                                            <div>
                                                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                                    {item.material_name}
                                                                </p>
                                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                                    TA {item.academic_year_name} • Smt {item.semester} • {item.class_name}
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <div className="text-center">
                                                                    <div className="text-[10px] text-gray-500 uppercase">Nilai Akhir</div>
                                                                    <div className={`text-sm font-bold ${getGrade(item.nilai).color}`}>
                                                                        {item.nilai} ({getGrade(item.nilai).grade})
                                                                    </div>
                                                                </div>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        const existing = materials.find(m => m.id === item.material_item_id);
                                                                        if (!existing) {
                                                                            setMaterials(prev => [...prev, {
                                                                                id: item.material_item_id,
                                                                                name: item.material_name,
                                                                                material_type: { name: 'Riwayat' }
                                                                            }]);
                                                                        }
                                                                        toast.info('Materi ditambahkan ke form penilaian saat ini');
                                                                    }}
                                                                >
                                                                    Uji Ulang
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}


                                {/* Grading Legend */}
                                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-4">
                                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Keterangan Predikat dan Deskripsi
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                        <div className="flex items-center gap-3">
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-green-600 bg-green-50 dark:bg-green-900/20">
                                                A
                                            </span>
                                            <span className="text-gray-700 dark:text-gray-300">90-100 = Terlampaui</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/20">
                                                B
                                            </span>
                                            <span className="text-gray-700 dark:text-gray-300">80-89 = Memenuhi</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20">
                                                C
                                            </span>
                                            <span className="text-gray-700 dark:text-gray-300">70-79 = Cukup Memenuhi</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-red-600 bg-red-50 dark:bg-red-900/20">
                                                D
                                            </span>
                                            <span className="text-gray-700 dark:text-gray-300">&lt;70 = Tidak Memenuhi</span>
                                        </div>
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
