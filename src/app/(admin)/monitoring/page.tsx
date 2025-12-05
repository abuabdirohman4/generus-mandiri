'use client';

import { useState, useEffect, useMemo } from 'react';
import { getClassProgress, getMaterialsByClassAndSemester, bulkUpdateProgress, getHafalanCategories } from './actions/monitoring';
import { getClasses } from './actions/classes';
import { useUserProfile } from '@/stores/userProfileStore';
import { getAllKelompok } from '@/app/(admin)/organisasi/actions/kelompok';
import AcademicYearSelector from '@/app/(admin)/tahun-ajaran/components/AcademicYearSelector';
import { getActiveAcademicYear } from '@/app/(admin)/tahun-ajaran/actions/academic-years';
import InputFilter from '@/components/form/input/InputFilter';
import { toast } from 'sonner';
import Button from '@/components/ui/button/Button';
import { ProgressInput } from './types';
import { getGrade } from '@/lib/percentages';

interface Student {
    id: string;
    name: string;
}

interface Material {
    id: string;
    name: string;
    material_type?: {
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
    const [kelompok, setKelompok] = useState<any[]>([]);

    const [classes, setClasses] = useState<any[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [progressMap, setProgressMap] = useState<Map<string, Progress>>(new Map());
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Load initial data
    useEffect(() => {
        loadInitialData();
    }, []);

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

    const loadInitialData = async () => {
        try {
            const activeYear = await getActiveAcademicYear();
            if (activeYear) {
                setSelectedYearId(activeYear.id);
            }

            // Load kelompok data for label formatting
            const kelompokData = await getAllKelompok();
            setKelompok(kelompokData);

            // Get all Caberawit/PAUD classes
            const classesData = await getClasses();

            // Filter classes based on user role
            let filteredClasses = classesData;
            if (userProfile?.role === 'teacher' && userProfile?.classes) {
                // For teachers, only show classes they are assigned to
                const teacherClassIds = userProfile.classes.map(c => c.id);
                filteredClasses = classesData.filter(cls => teacherClassIds.includes(cls.id));
            }

            setClasses(filteredClasses);

            // Load hafalan categories from database
            const categories = await getHafalanCategories();
            setHafalanCategories(categories);

            // Auto-select first category
            if (categories.length > 0 && !selectedCategoryId) {
                setSelectedCategoryId(categories[0].id);
            }
        } catch (error: any) {
            toast.error(error.message || 'Gagal memuat data awal');
        }
    };

    const loadClassData = async () => {
        try {
            setLoading(true);

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

        } catch (error: any) {
            toast.error(error.message || 'Gagal memuat data kelas');
        } finally {
            setLoading(false);
        }
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

    // Navigate to previous/next student
    const navigateStudent = (direction: 'prev' | 'next') => {
        const currentIndex = students.findIndex(s => s.id === selectedStudentId);
        if (currentIndex === -1) return;

        if (direction === 'prev' && currentIndex > 0) {
            setSelectedStudentId(students[currentIndex - 1].id);
        } else if (direction === 'next' && currentIndex < students.length - 1) {
            setSelectedStudentId(students[currentIndex + 1].id);
        }
    };

    // Filter materials by selected category
    const filteredMaterials = materials.filter(
        m => m.material_type?.material_category?.id === selectedCategoryId
    );

    // Format class options with kelompok name for duplicates (from CreateMeetingModal pattern)
    const classOptions = useMemo(() => {
        if (!classes.length) return [];

        // For teacher with multiple classes, check for duplicate names
        if (userProfile?.role === 'teacher' && classes.length > 1 && kelompok.length > 0) {
            // Create mapping kelompok_id -> kelompok name
            const kelompokMap = new Map(
                kelompok.map((k: any) => [k.id, k.name])
            );

            // Check for duplicate class names
            const nameCounts = classes.reduce((acc, cls: any) => {
                acc[cls.name] = (acc[cls.name] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            // Format labels
            return classes.map((cls: any) => {
                const hasDuplicate = nameCounts[cls.name] > 1;
                const kelompokName = cls.kelompok_id ? kelompokMap.get(cls.kelompok_id) : null;
                const label = hasDuplicate && kelompokName
                    ? `${cls.name} (${kelompokName})`
                    : cls.name;

                return {
                    value: cls.id,
                    label
                };
            });
        }

        // For non-teacher or single class, just use simple mapping
        return classes.map((c: any) => ({
            value: c.id,
            label: c.name
        }));
    }, [classes, kelompok, userProfile?.role]);

    const currentStudent = students.find(s => s.id === selectedStudentId);
    const currentStudentIndex = students.findIndex(s => s.id === selectedStudentId);

    return (
        <div className="bg-gray-50 dark:bg-gray-900">
            <div className="max-w-full px-0">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Monitoring
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Tracking progress siswa per tahun ajaran dan semester
                    </p>
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Academic Year & Semester */}
                        <div className="md:col-span-2">
                            <AcademicYearSelector
                                selectedYearId={selectedYearId}
                                selectedSemester={selectedSemester}
                                onYearChange={setSelectedYearId}
                                onSemesterChange={setSelectedSemester}
                                showSemester={true}
                            />
                        </div>

                        {/* Kategori */}
                        <div>
                            <InputFilter
                                id="category-filter"
                                label="Kategori"
                                value={selectedCategoryId}
                                onChange={setSelectedCategoryId}
                                options={hafalanCategories.map(c => ({ value: c.id, label: c.name }))}
                                variant="modal"
                                compact
                            />
                        </div>

                        {/* Kelas */}
                        <div>
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
                        </div>
                    </div>

                    {/* Student Navigation */}
                    {students.length > 0 && (
                        <div className="mt-4 flex items-center gap-3">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Siswa:
                            </label>

                            <button
                                onClick={() => navigateStudent('prev')}
                                disabled={currentStudentIndex === 0}
                                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Siswa Sebelumnya"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>

                            <div className="flex-1 max-w-xs">
                                <InputFilter
                                    id="student-filter"
                                    label=""
                                    value={selectedStudentId}
                                    onChange={setSelectedStudentId}
                                    options={students.map(s => ({
                                        value: s.id,
                                        label: s.name
                                    }))}
                                    variant="modal"
                                    compact
                                />
                            </div>

                            <button
                                onClick={() => navigateStudent('next')}
                                disabled={currentStudentIndex === students.length - 1}
                                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Siswa Selanjutnya"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>

                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                {currentStudentIndex + 1} / {students.length}
                            </div>
                        </div>
                    )}
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
                        {/* Student Info Card */}
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
                                    {currentStudent.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white">
                                        {currentStudent.name}
                                    </h3>
                                </div>
                            </div>
                        </div>

                        {/* Progress Table */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-16">
                                            No
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Materi
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-24">
                                            Nilai
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-32">
                                            Predikat
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Keterangan
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {filteredMaterials.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                                                Tidak ada materi untuk kategori ini
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredMaterials.map((material, index) => {
                                            const key = `${selectedStudentId}-${material.id}`;
                                            const progress = progressMap.get(key);
                                            const gradeInfo = getGrade(progress?.nilai);

                                            return (
                                                <tr key={material.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                                        {index + 1}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                                                        {material.name}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            value={progress?.nilai || ''}
                                                            onChange={(e) => handleProgressChange(material.id, 'nilai', parseInt(e.target.value) || 0)}
                                                            placeholder="0-100"
                                                            className="w-20 px-2 py-1 text-sm text-center border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${gradeInfo.color}`}>
                                                            {gradeInfo.grade}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="text"
                                                            value={progress?.notes || ''}
                                                            onChange={(e) => handleProgressChange(material.id, 'notes', e.target.value)}
                                                            placeholder="Keterangan..."
                                                            className="w-full px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

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

                        {/* Save Button */}
                        <div className="mt-6 flex justify-end gap-3">
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
    );
}
