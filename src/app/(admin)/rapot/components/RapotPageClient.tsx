'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUserProfile } from '@/stores/userProfileStore';
import { getClasses } from '@/app/actions/shared';
import { getActiveAcademicYear } from '@/app/(admin)/tahun-ajaran/actions/academic-years';
import { getClassReportsSummary } from '../actions';
import DataFilter from '@/components/shared/DataFilter';
import RapotStudentSidebar from './RapotStudentSidebar';
import StudentReportDetailClient from '../[studentId]/components/StudentReportDetailClient';
import { toast } from 'sonner';

export default function RapotPageClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { profile: userProfile } = useUserProfile();

    // State
    const [academicYear, setAcademicYear] = useState<{ id: string, name: string } | null>(null);
    const [classes, setClasses] = useState<any[]>([]);

    // Filter State
    const [filters, setFilters] = useState({
        daerah: [] as string[],
        desa: [] as string[],
        kelompok: [] as string[],
        kelas: [] as string[],
        semester: (searchParams.get('semester') ? parseInt(searchParams.get('semester')!) : 1),
    });

    // Content State
    const [students, setStudents] = useState<any[]>([]);
    const [reports, setReports] = useState<any[]>([]);
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [loading, setLoading] = useState(false);

    // Initial Load
    useEffect(() => {
        const loadInit = async () => {
            try {
                const [year, classesData] = await Promise.all([
                    getActiveAcademicYear(),
                    getClasses()
                ]);
                setAcademicYear(year);
                setClasses(classesData);
            } catch (error) {
                console.error('Error loading initial data:', error);
                toast.error('Gagal memuat data awal');
            }
        };
        loadInit();
    }, []);

    // Derived Data for Filters
    const displayClasses = useMemo(() => {
        let filtered = classes;
        if (userProfile?.role === 'admin' && userProfile?.kelompok_id) {
            filtered = classes.filter(c => c.kelompok_id === userProfile.kelompok_id);
        }

        return filtered.map(c => ({
            ...c,
            name: c.kelompok ? `${c.name} (${c.kelompok.name})` : c.name
        }));
    }, [classes, userProfile]);

    const kelompokList = useMemo(() => {
        return Array.from(new Map(
            displayClasses.filter(c => c.kelompok).map(c => [c.kelompok.id, c.kelompok])
        ).values());
    }, [displayClasses]);

    // Load Students when Class changes
    useEffect(() => {
        const loadClassData = async () => {
            if (!academicYear || filters.kelas.length === 0) {
                setStudents([]);
                setReports([]);
                return;
            }

            // Handle potential multiple/comma-separated IDs from DataFilter
            // We force single class selection for this view
            const rawClassId = filters.kelas[0];
            const classId = rawClassId.split(',')[0]; // Take first ID if multiple

            setLoading(true);

            try {
                const summary = await getClassReportsSummary(classId, academicYear.id, filters.semester);
                setStudents(summary.map(s => s.student));
                setReports(summary.map(s => ({
                    student_id: s.student.id,
                    isGenerated: s.isGenerated,
                    isPublished: s.isPublished,
                    averageScore: s.averageScore
                })));

                // Auto select first student if none selected
                if (!selectedStudentId && summary.length > 0) {
                    setSelectedStudentId(summary[0].student.id);
                }
            } catch (error) {
                console.error('Error loading class data:', error);
                toast.error('Gagal memuat data siswa');
            } finally {
                setLoading(false);
            }
        };

        loadClassData();
    }, [filters.kelas, filters.semester, academicYear, selectedStudentId]);

    const handleStudentSelect = (studentId: string) => {
        setSelectedStudentId(studentId);
        // On mobile, sidebar closes automatically via the Sidebar component logic if needed
        // but here we control the state if we want to force close
        if (window.innerWidth < 768) {
            setSidebarOpen(false);
        }
    };

    return (
        <div className="flex h-[calc(100vh-8rem)] relative">
            {/* Sidebar */}
            {filters.kelas.length > 0 && (
                <RapotStudentSidebar
                    students={students}
                    reports={reports}
                    selectedStudentId={selectedStudentId || ''}
                    onStudentSelect={handleStudentSelect}
                    isOpen={sidebarOpen}
                    onToggle={() => setSidebarOpen(!sidebarOpen)}
                    loading={loading}
                    headerTitle="Siswa"
                    headerSubtitle={`${students.length} Siswa`}
                />
            )}

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header with Hamburger */}
                <div className={`bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 md:px-6 py-4 ${window.innerWidth < 768 && filters.kelas.length === 0 ? 'hidden' : ''}`}>
                    <div className="flex items-center gap-3">
                        {/* Hamburger */}
                        {filters.kelas.length > 0 && (
                            <button
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                        )}
                        <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                            E-Rapor
                        </h1>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto">
                    <div className="max-w-full md:px-6 pt-6 pb-24 md:pb-6">
                        {/* Filters */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6 p-4">
                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Filter</h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                {/* Academic Year Selector (Using explicit Select for now as the component is used elsewhere) */}
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tahun Ajaran</label>
                                    <select
                                        className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                        value={academicYear?.id || ''}
                                        onChange={(e) => {
                                            // Handle year change logic if we have full list. 
                                            // For now just displaying active year or if user wants to change, we need to fetch all years.
                                            // Assuming current implementation fetches only ACTIVE year. 
                                            // If user wants selector, we might need to fetch ALL years. 
                                            // I will implement a basic display for now or fetch list if needed.
                                        }}
                                        disabled
                                    >
                                        <option value={academicYear?.id || ''}>{academicYear?.name || 'Loading...'}</option>
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Semester</label>
                                    <select
                                        className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                        value={filters.semester}
                                        onChange={(e) => setFilters(prev => ({ ...prev, semester: parseInt(e.target.value) }))}
                                    >
                                        <option value={1}>Semester 1</option>
                                        <option value={2}>Semester 2</option>
                                    </select>
                                </div>

                                {/* DataFilter for Classes & Org */}
                                <div className="md:col-span-2">
                                    <DataFilter
                                        filters={filters}
                                        onFilterChange={(newFilters) => setFilters(prev => ({ ...prev, ...newFilters }))}
                                        userProfile={userProfile}
                                        daerahList={[]}
                                        desaList={[]}
                                        kelompokList={kelompokList}
                                        classList={displayClasses}
                                        showKelas={true}
                                        showMeetingType={false}
                                        className="!grid-cols-1 !gap-4" // Override grid to fit in column
                                        compact={true} // IF DataFilter supports compact mode
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Detail View */}
                        {selectedStudentId && academicYear && filters.kelas.length > 0 ? (
                            <div className="max-w-4xl mx-auto">
                                <StudentReportDetailClient
                                    studentId={selectedStudentId}
                                    semester={filters.semester}
                                    key={`${selectedStudentId}-${filters.semester}`}
                                />
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
                                <p className="text-lg text-gray-500 dark:text-gray-400">Pilih kelas dan siswa untuk melihat rapot</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
