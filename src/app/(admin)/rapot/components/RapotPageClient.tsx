'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUserProfile } from '@/stores/userProfileStore';
import { getClasses } from '@/app/actions/shared';
import { getAcademicYears, getActiveAcademicYear } from '@/app/(admin)/tahun-ajaran/actions/academic-years';
import { getClassReportsBulk, getClassReportsSummary } from '../actions';
import PDFExportModal from './PDFExportModal';
import { toast } from 'sonner';
import { downloadBulkPDFs } from './pdfUtils';
import RapotStudentSidebar from './RapotStudentSidebar';
import DataFilter from '@/components/shared/DataFilter';
import AcademicYearSelector from '@/app/(admin)/tahun-ajaran/components/AcademicYearSelector';
import StudentReportDetailClient from '../[studentId]/components/StudentReportDetailClient';

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

    // Bulk Export State
    const [isDownloading, setIsDownloading] = useState(false);
    const [showBulkPDFModal, setShowBulkPDFModal] = useState(false);

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

    const handleBulkDownload = async (options: any) => {
        if (!academicYear || filters.kelas.length === 0) {
            toast.error('Pilih kelas terlebih dahulu');
            return;
        }

        const classId = filters.kelas[0].split(',')[0];
        const className = classes.find(c => c.id === classId)?.name || 'Kelas';
        setIsDownloading(true);
        toast.info('Menyiapkan dan mendownload PDF rapot kelas...');

        try {
            // 1. Fetch Data
            const data = await getClassReportsBulk(classId, academicYear.id, filters.semester);

            if (data.length === 0) {
                toast.error('Tidak ada data siswa untuk kelas ini');
                setIsDownloading(false);
                return;
            }

            // 2. Download PDFs using react-pdf
            await downloadBulkPDFs(
                data,
                academicYear.name || '',
                String(filters.semester),
                className,
                (current, total) => {
                    // Optional: Update progress
                    console.log(`Downloading ${current}/${total}`);
                }
            );

            toast.success(`${data.length} rapot berhasil didownload`);
        } catch (error: any) {
            console.error('Error bulk download:', error);
            toast.error(`Gagal download PDF kelas: ${error?.message || 'Unknown error'}`);
        } finally {
            setIsDownloading(false);
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
                    <div className="flex items-center justify-between">
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
                                Rapot
                            </h1>
                        </div>

                        {filters.kelas.length > 0 && (
                            <button
                                onClick={() => setShowBulkPDFModal(true)}
                                disabled={isDownloading || students.length === 0}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isDownloading ? (
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                )}
                                Download Rapot Kelas ({students.length})
                            </button>
                        )}
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto">
                    <div className="max-w-full md:px-6 pt-6 pb-24 md:pb-6">
                        {/* Filters */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6 p-4">
                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Filter</h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                {/* Academic Year & Semester Selector */}
                                <div className="md:col-span-2">
                                    <AcademicYearSelector
                                        selectedYearId={academicYear?.id || ''}
                                        selectedSemester={filters.semester as 1 | 2}
                                        onYearChange={(yearId) => {
                                            // Fetch the year details when changed
                                            getAcademicYears().then(years => {
                                                const selected = years.find(y => y.id === yearId);
                                                if (selected) {
                                                    setAcademicYear({ id: selected.id, name: selected.name });
                                                }
                                            });
                                        }}
                                        onSemesterChange={(semester) => setFilters(prev => ({ ...prev, semester }))}
                                    />
                                </div>

                                {/* DataFilter for Classes & Org */}
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
                                    className="grid-cols-1! gap-4!" // Override grid to fit in column
                                    compact={true} // IF DataFilter supports compact mode
                                    variant="modal"
                                />
                            </div>
                        </div>

                        {/* Detail View */}
                        {selectedStudentId && academicYear && filters.kelas.length > 0 ? (
                            <StudentReportDetailClient
                                studentId={selectedStudentId}
                                semester={filters.semester}
                                key={`${selectedStudentId}-${filters.semester}`}
                            />
                        ) : (
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
                                <p className="text-lg text-gray-500 dark:text-gray-400">Pilih kelas dan siswa untuk melihat rapot</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Downloading Overlay */}
            {isDownloading && (
                <div className="fixed inset-0 z-50 bg-gray-900/95 flex flex-col items-center justify-center">
                    <div className="text-white mb-6 font-bold text-xl animate-pulse">
                        Menyiapkan dan Mendownload PDF Rapot...
                    </div>
                    <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin" />
                </div>
            )}

            <PDFExportModal
                isOpen={showBulkPDFModal}
                onClose={() => setShowBulkPDFModal(false)}
                onExport={handleBulkDownload}
                title="Download Rapot Satu Kelas"
                isBulk={true}
            />
        </div>
    );
}
