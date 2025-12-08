'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUserProfile } from '@/stores/userProfileStore';
import { getAcademicYears, getActiveAcademicYear } from '@/app/(admin)/tahun-ajaran/actions/academic-years';
import { getClassReportsBulk, getClassReportsSummary } from '../actions';
import PDFExportModal from './PDFExportModal';
import { toast } from 'sonner';
import { downloadBulkPDFs } from './pdfUtils';
import RapotStudentSidebar from './RapotStudentSidebar';
import DataFilter from '@/components/shared/DataFilter';
import AcademicYearSelector from '@/app/(admin)/tahun-ajaran/components/AcademicYearSelector';
import InputFilter from '@/components/form/input/InputFilter';
import StudentReportDetailClient from '../[studentId]/components/StudentReportDetailClient';
import { useDaerah } from '@/hooks/useDaerah';
import { useDesa } from '@/hooks/useDesa';
import { useKelompok } from '@/hooks/useKelompok';
import { useClasses } from '@/hooks/useClasses';
import { isMobile } from '@/lib/utils';

export default function RapotPageClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { profile: userProfile } = useUserProfile();

    // Fetch organizational data using hooks (with SWR caching)
    const { daerah } = useDaerah();
    const { desa } = useDesa();
    const { kelompok } = useKelompok();
    const { classes } = useClasses();

    // State
    const [academicYear, setAcademicYear] = useState<{ id: string, name: string } | null>(null);

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
    const [filterLoading, setFilterLoading] = useState(true);
    const [isFilterCollapsed, setIsFilterCollapsed] = useState(false);

    // Bulk Export State
    const [isDownloading, setIsDownloading] = useState(false);
    const [showBulkPDFModal, setShowBulkPDFModal] = useState(false);

    // Initial Load - only for academic year now
    useEffect(() => {
        const loadInit = async () => {
            try {
                setFilterLoading(true);
                const year = await getActiveAcademicYear();
                setAcademicYear(year);
            } catch (error) {
                console.error('Error loading initial data:', error);
                toast.error('Gagal memuat data awal');
            } finally {
                setFilterLoading(false);
            }
        };
        loadInit();
    }, []);

    // Auto-collapse filter on mobile when student is selected
    useEffect(() => {
        if (selectedStudentId && isMobile()) {
            setIsFilterCollapsed(true);
        }
    }, [selectedStudentId]);

    // Derived Data for Filters
    const displayClasses = useMemo(() => {
        let filtered = (classes || []) as any[];
        if (userProfile?.role === 'admin' && userProfile?.kelompok_id) {
            filtered = filtered.filter(c => c.kelompok_id === userProfile.kelompok_id);
        }

        // Just return filtered classes without modifying names
        return filtered;
    }, [classes, userProfile]);

    // Class options with kelompok suffix for duplicates (like monitoring page)
    const classOptions = useMemo(() => {
        if (!displayClasses.length) return [];

        // Create kelompok name mapping
        const kelompokMap = new Map(
            (kelompok || []).map((k: any) => [k.id, k.name])
        );

        // Check for duplicate class names
        const nameCounts = displayClasses.reduce((acc, cls: any) => {
            acc[cls.name] = (acc[cls.name] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        // Format labels with kelompok suffix only for duplicates
        const options = displayClasses.map((cls: any) => {
            const hasDuplicate = nameCounts[cls.name] > 1;
            const kelompokName = cls.kelompok_id ? kelompokMap.get(cls.kelompok_id) : null;
            const label = hasDuplicate && kelompokName
                ? `${cls.name} (${kelompokName})`
                : cls.name;

            return {
                value: cls.id,  // Single ID, not comma-separated!
                label
            };
        });

        // Add "Semua Kelas" option if there are multiple classes
        if (displayClasses.length > 1) {
            options.unshift({
                value: 'ALL',
                label: 'Semua Kelas'
            });
        }

        return options;
    }, [displayClasses, kelompok]);


    // Load Students when Class changes
    useEffect(() => {
        const loadClassData = async () => {
            if (!academicYear || filters.kelas.length === 0) {
                setStudents([]);
                setReports([]);
                return;
            }

            const classId = filters.kelas[0];

            setLoading(true);

            try {
                let allSummaries: any[] = [];

                if (classId === 'ALL') {
                    // Fetch for all display classes
                    for (const cls of displayClasses) {
                        try {
                            const summary = await getClassReportsSummary(cls.id, academicYear.id, filters.semester);
                            if (summary) {
                                // Add class name to student for display
                                const summaryWithClass = summary.map(item => ({
                                    ...item,
                                    student: {
                                        ...item.student,
                                        class_name: cls.name
                                    }
                                }));
                                allSummaries = [...allSummaries, ...summaryWithClass];
                            }
                        } catch (err) {
                            console.error(`Error loading report for class ${cls.name}:`, err);
                        }
                    }
                } else {
                    // Fetch for single class
                    allSummaries = await getClassReportsSummary(classId, academicYear.id, filters.semester);
                }

                // Sort summaries by student name alphabetically
                allSummaries.sort((a, b) => a.student.name.localeCompare(b.student.name));

                setStudents(allSummaries.map(s => s.student));
                setReports(allSummaries.map(s => ({
                    student_id: s.student.id,
                    isGenerated: s.isGenerated,
                    isPublished: s.isPublished,
                    generatedAt: s.generatedAt,
                    averageScore: s.averageScore
                })));

                // Auto select first student if none selected
                if (!selectedStudentId && allSummaries.length > 0) {
                    setSelectedStudentId(allSummaries[0].student.id);
                }
            } catch (error) {
                console.error('Error loading students:', error);
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

        const classId = filters.kelas[0];
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
                <div className={`bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 md:px-6 py-4 ${isMobile() && !selectedStudentId ? 'hidden' : ''}`}>
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

                        {/* Title */}
                        <div className="flex-1">
                            <div className={`${isMobile() && selectedStudentId ? '' : 'flex items-center gap-2'}`}>
                                <svg className="hidden md:block w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                                    {isMobile() && selectedStudentId
                                        ? (students.find(s => s.id === selectedStudentId)?.name || 'Detail Rapot')
                                        : 'Rapot'}
                                </h1>
                                {isMobile() && selectedStudentId && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {students.find(s => s.id === selectedStudentId)?.class_name ||
                                            (filters.kelas[0] === 'ALL' ? 'Semua Kelas' : displayClasses.find(c => c.id === filters.kelas[0])?.name)}
                                    </p>
                                )}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 hidden md:block">
                                Kelola dan cetak rapot penilaian siswa
                            </p>
                        </div>

                        {/* Bulk Export Button (Desktop only here, maybe sidebar for mobile?) */}
                        {/* {filters.kelas.length > 0 && !isMobile() && (
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
                                Rapot Kelas ({students.length})
                            </button>
                        )} */}
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto">
                    <div className="max-w-full md:px-6 pt-6 pb-24 md:pb-6">
                        {/* Filters */}
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
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        {/* Academic Year & Semester Selector */}
                                        <div className="md:col-span-2">
                                            <AcademicYearSelector
                                                selectedYearId={academicYear?.id || ''}
                                                selectedSemester={filters.semester as 1 | 2}
                                                onYearChange={(yearId) => {
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
                                            daerahList={daerah || []}
                                            desaList={desa || []}
                                            kelompokList={kelompok || []}
                                            classList={displayClasses}
                                            showKelas={false}
                                            showMeetingType={false}
                                            className="grid-cols-1! gap-4!"
                                            compact={true}
                                            variant="modal"
                                        />

                                        {/* Class Dropdown */}
                                        <div className="col-span-1">
                                            {filterLoading ? (
                                                <div className="animate-pulse">
                                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-2"></div>
                                                    <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                                </div>
                                            ) : (
                                                <InputFilter
                                                    id="class-filter"
                                                    label="Kelas"
                                                    value={filters.kelas[0] || ''}
                                                    onChange={(val) => setFilters(prev => ({ ...prev, kelas: [val] }))}
                                                    options={classOptions}
                                                    placeholder="Pilih Kelas"
                                                    variant="modal"
                                                    compact
                                                />
                                            )}
                                        </div>

                                        {/* {filters.kelas.length > 0 && (
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
                                                Rapot Kelas ({students.length})
                                            </button>
                                        )} */}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Detail View */}
                        {!filters.kelas[0] ? (
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
                            <div className="space-y-4">
                                {/* Student Info Skeleton */}
                                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                                        <div className="space-y-2">
                                            <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                                        {[...Array(4)].map((_, i) => (
                                            <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                        ))}
                                    </div>
                                </div>
                                {/* Report Content Skeleton */}
                                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse space-y-4">
                                    <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                    <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                </div>
                            </div>
                        ) : selectedStudentId ? (
                            <StudentReportDetailClient
                                studentId={selectedStudentId}
                                semester={filters.semester}
                                key={`${selectedStudentId}-${filters.semester}`}
                            />
                        ) : (
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
                                <p className="text-lg text-gray-500 dark:text-gray-400">Data siswa tidak ditemukan atau pilih siswa lain</p>
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
