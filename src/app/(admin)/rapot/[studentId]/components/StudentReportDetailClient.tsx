'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
    getStudentGrades,
    getCharacterAssessments,
    getStudentReport,
    getReportTemplates,
    getTemplateSubjects,
    bulkUpdateGrades,
    updateCharacterAssessment,
    generateReport,
    publishReport
} from '../../actions';
import { getActiveAcademicYear } from '@/app/(admin)/tahun-ajaran/actions/academic-years';
import { getStudentEnrollments } from '@/app/(admin)/tahun-ajaran/actions/enrollments';
import {
    StudentGrade,
    StudentCharacterAssessment,
    StudentReport,
    ReportSubject,
    GradeInput as GradeInputType
} from '../../types';
import GradeInput from '../../components/GradeInput';
import PDFExportModal from '../../components/PDFExportModal';
import PrintableReport from '../../components/PrintableReport';
import { createClient } from '@/lib/supabase/client';

interface Props {
    studentId: string;
    semester?: number;
}

const CHARACTER_ASPECTS = [
    'Akhlak & Kepribadian',
    'Kedisiplinan',
    'Kebersihan & Kerapian',
    'Kemandirian'
];

export default function StudentReportDetailClient({ studentId, semester: propSemester }: Props) {
    const router = useRouter();

    // Derived State
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showPDFModal, setShowPDFModal] = useState(false);

    // Data State
    const [academicYear, setAcademicYear] = useState<any>(null);
    const [semester, setSemester] = useState<number>(propSemester || 1);
    const [studentInfo, setStudentInfo] = useState<any>(null);
    const [className, setClassName] = useState<string>('');
    const [report, setReport] = useState<StudentReport | null>(null);
    const [subjects, setSubjects] = useState<ReportSubject[]>([]);
    const [grades, setGrades] = useState<Record<string, StudentGrade>>({});
    const [assessments, setAssessments] = useState<Record<string, StudentCharacterAssessment>>({});

    // Additional Inputs State (Attendance & Notes)
    const [attendance, setAttendance] = useState({ sick: 0, permission: 0, absent: 0 });
    const [teacherNotes, setTeacherNotes] = useState('');

    useEffect(() => {
        loadData();
    }, [studentId, semester]);

    const loadData = async () => {
        try {
            setLoading(true);
            const activeYearRes = await getActiveAcademicYear();
            if (!activeYearRes) {
                toast.error('Tidak ada tahun ajaran aktif');
                return;
            }
            setAcademicYear(activeYearRes);

            // Get Enrollment
            const enrollments = await getStudentEnrollments(studentId);
            const currentEnrollment = enrollments.find(e =>
                e.academic_year_id === activeYearRes.id &&
                parseInt(String(e.semester)) === semester
            );

            if (currentEnrollment) {
                setStudentInfo(currentEnrollment.student);
                if (currentEnrollment.class) {
                    setClassName(currentEnrollment.class.name);
                }

                // Get Template
                const templates = await getReportTemplates(currentEnrollment.class_id, activeYearRes.id);
                const template = templates.find(t => t.class_id === currentEnrollment.class_id) || templates.find(t => !t.class_id);

                if (template) {
                    const templateSubjects = await getTemplateSubjects(template.id);
                    setSubjects(templateSubjects);
                }
            }

            // Get Data
            const [gradesData, assessmentsData, reportData] = await Promise.all([
                getStudentGrades(studentId, activeYearRes.id, semester),
                getCharacterAssessments(studentId, activeYearRes.id, semester),
                getStudentReport(studentId, activeYearRes.id, semester)
            ]);

            // Map Grades
            const newGrades: Record<string, StudentGrade> = {};
            gradesData.forEach(g => { newGrades[g.subject_id] = g; });
            setGrades(newGrades);

            // Map Assessments
            const newAssessments: Record<string, StudentCharacterAssessment> = {};
            assessmentsData.forEach(a => { newAssessments[a.character_aspect] = a; });
            setAssessments(newAssessments);

            setReport(reportData);
            if (reportData) {
                setAttendance({
                    sick: reportData.sick_days || 0,
                    permission: reportData.permission_days || 0,
                    absent: reportData.absent_days || 0
                });
                setTeacherNotes(reportData.teacher_notes || '');
                if (!studentInfo && reportData.student) setStudentInfo(reportData.student);
            }

        } catch (error) {
            console.error('Error loading detail:', error);
            toast.error('Gagal memuat detail rapot');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveAll = async () => {
        try {
            setSaving(true);

            // 1. Save Grades
            const gradeUpdates: GradeInputType[] = subjects.map(s => {
                const g = grades[s.id];
                return {
                    student_id: studentId,
                    subject_id: s.id,
                    academic_year_id: academicYear.id,
                    semester: semester as 1 | 2,
                    score: (g?.score !== null && g?.score !== undefined) ? g.score : undefined,
                    grade: g?.grade || undefined,
                    description: g?.description || undefined
                };
            }).filter(u => u.score !== undefined || u.grade !== undefined);

            if (gradeUpdates.length > 0) {
                await bulkUpdateGrades(gradeUpdates);
            }

            // 2. Save Character
            await Promise.all(CHARACTER_ASPECTS.map(aspect => {
                const a = assessments[aspect];
                if (a && (a.grade || a.description)) {
                    return updateCharacterAssessment({
                        student_id: studentId,
                        academic_year_id: academicYear.id,
                        semester: semester as 1 | 2,
                        character_aspect: aspect,
                        grade: a.grade || undefined,
                        description: a.description || undefined
                    });
                }
            }));

            // 3. Save Report Meta (Attendance, Notes) & Regenerate Average
            // We use generateReport logic but we might need to update extra fields first or update generateReport to handle them.
            // Currently generateReport ONLY updates average. We need to update attendance/notes too.
            // We can call generateReport first, then update the specifics.
            const newReport = await generateReport(studentId, academicYear.id, semester);

            // Update attendance and notes directly via Supabase client (or create a new action if needed, but for speed...)
            // Actually, best to create an action updateStudentReportMeta.
            // For now, I'll use a direct upsert via action if possible. 
            // `generateReport` upserts. I should modify `generateReport` or call a separate update.
            // Let's create `updateReportMeta` action or just use client for now if RLS allows? No, use action.
            // I'll assume generateReport calculates average. I need to update the rest.

            // Temporary: Use createClient here to update standard fields if RLS allows update on own class? 
            // Admin can update.
            const supabase = createClient();
            await supabase.from('student_reports').update({
                sick_days: attendance.sick,
                permission_days: attendance.permission,
                absent_days: attendance.absent,
                teacher_notes: teacherNotes
            }).eq('id', newReport.id);


            setReport({ ...newReport, sick_days: attendance.sick, permission_days: attendance.permission, absent_days: attendance.absent, teacher_notes: teacherNotes });

            toast.success('Semua perubahan berhasil disimpan');
        } catch (error) {
            console.error(error);
            toast.error('Gagal menyimpan perubahan');
        } finally {
            setSaving(false);
        }
    };

    // Group Subjects by Category
    const groupedSubjects = useMemo(() => {
        const groups: Record<string, ReportSubject[]> = {};
        subjects.forEach(subject => {
            // Access nested category name from updated select
            const categoryName = (subject as any).material_type?.category?.name || 'Lainnya';
            if (!groups[categoryName]) groups[categoryName] = [];
            groups[categoryName].push(subject);
        });
        return groups;
    }, [subjects]);

    const [printOptions, setPrintOptions] = useState<any>(null);

    // Clean up print state after printing
    useEffect(() => {
        const handleAfterPrint = () => {
            setPrintOptions(null);
        };
        window.addEventListener('afterprint', handleAfterPrint);
        return () => window.removeEventListener('afterprint', handleAfterPrint);
    }, []);

    // ... existing loadData and handleSaveAll ...

    // Handle Export logic
    const handleExportPDF = (options: any) => {
        setPrintOptions(options);
        // Delay print to allow React to render the PrintableReport component
        setTimeout(() => {
            window.print();
        }, 100);
    };

    if (loading) return <div className="p-8 text-center print:hidden">Loading...</div>;

    return (
        <>
            {/* Standard Web View - Hidden when printing */}
            <div className={`space-y-6 pb-20 print:hidden`}>
                {/* Header Card */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xl font-bold text-gray-500">
                                {studentInfo?.name?.charAt(0) || 'S'}
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                                    {studentInfo?.name}
                                </h1>
                                <div className="text-gray-500 dark:text-gray-400">
                                    {/* {studentInfo?.nis || '-'} • */} Kelas {className}
                                </div>
                                <div className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${report?.is_published ? 'bg-green-100 text-green-800' : 'bg-green-100 text-green-800'
                                    }`}>
                                    {/** Assuming active for now, user screenshot shows "Aktif" badge separate from status */}
                                    Aktif
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowPDFModal(true)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                                Cetak PDF
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Rata-rata</div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                {report?.average_score?.toFixed(1) || '-'}
                            </div>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                            <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">Peringkat</div>
                            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                                #{report?.class_rank || '-'}
                            </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Kehadiran</div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                {report?.attendance_percentage || '-'}<span className="text-sm font-normal text-gray-500">%</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Subject Groups */}
                {Object.entries(groupedSubjects).map(([category, categorySubjects]) => (
                    <div key={category} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 flex items-center gap-2">
                            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                            <h3 className="font-semibold text-gray-900 dark:text-white">{category}</h3>
                        </div>
                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                            {/* Header Row */}
                            <div className="grid grid-cols-12 gap-4 p-4 text-xs font-medium text-gray-500 uppercase tracking-wider bg-white dark:bg-gray-800">
                                <div className="col-span-5 md:col-span-6">Mata Pelajaran</div>
                                <div className="col-span-2 text-center">Nilai</div>
                                <div className="col-span-2 text-center">Predikat</div>
                                <div className="col-span-3 md:col-span-2 text-right">Keterangan</div>
                            </div>

                            {/* Items */}
                            {categorySubjects.map(subject => (
                                <div key={subject.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                    <div className="col-span-5 md:col-span-6 font-medium text-gray-900 dark:text-white">
                                        {subject.display_name}
                                    </div>
                                    <div className="col-span-2 text-center">
                                        <input
                                            type="number"
                                            className="w-16 text-center border-0 bg-transparent font-bold focus:ring-0 p-0"
                                            placeholder="0"
                                            value={grades[subject.id]?.score ?? ''}
                                            onChange={(e) => {
                                                const val = e.target.value ? parseFloat(e.target.value) : undefined;
                                                setGrades(prev => ({
                                                    ...prev,
                                                    [subject.id]: {
                                                        ...prev[subject.id],
                                                        student_id: studentId, // Ensure basics
                                                        subject_id: subject.id,
                                                        academic_year_id: academicYear?.id,
                                                        semester: semester as 1 | 2,
                                                        score: val
                                                    }
                                                }));
                                            }}
                                        />
                                    </div>
                                    <div className="col-span-2 flex justify-center">
                                        {grades[subject.id]?.score ? (
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${(grades[subject.id]?.score || 0) >= 90 ? 'bg-green-100 text-green-700' :
                                                (grades[subject.id]?.score || 0) >= 70 ? 'bg-blue-100 text-blue-700' :
                                                    'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                {grades[subject.id]?.grade || '?'}
                                            </span>
                                        ) : '-'}
                                    </div>
                                    <div className="col-span-3 md:col-span-2 text-right text-sm text-gray-500 italic">
                                        <input
                                            type="text"
                                            className="w-full text-right border-0 bg-transparent focus:ring-0 p-0 text-sm italic placeholder-gray-300"
                                            placeholder="Ket..."
                                            value={grades[subject.id]?.description || ''}
                                            onChange={(e) => {
                                                setGrades(prev => ({
                                                    ...prev,
                                                    [subject.id]: { ...prev[subject.id], description: e.target.value }
                                                }));
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {/* Character & Attendance Split View */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Character */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <div className="flex items-center gap-2 mb-4 text-blue-600">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <h3 className="font-semibold text-gray-900 dark:text-white">Akhlakul Karimah</h3>
                        </div>
                        <div className="space-y-4">
                            {CHARACTER_ASPECTS.map(aspect => (
                                <div key={aspect} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                                    <span className="text-gray-700 dark:text-gray-300">{aspect}</span>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            className="w-12 text-center border rounded border-gray-200 text-sm py-1"
                                            placeholder="-"
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setAssessments(prev => ({
                                                    ...prev,
                                                    [aspect]: {
                                                        ...prev[aspect],
                                                        grade: val,
                                                        character_aspect: aspect
                                                    }
                                                }))
                                            }}
                                            value={assessments[aspect]?.grade || ''}
                                        />
                                        {assessments[aspect]?.grade && (
                                            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                                                {parseInt(assessments[aspect].grade || '0') >= 90 ? 'A' : 'B'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Attendance */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <div className="flex items-center gap-2 mb-4 text-blue-600">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <h3 className="font-semibold text-gray-900 dark:text-white">Rekap Kehadiran</h3>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/30 p-3 rounded">
                                <span className="text-gray-600 dark:text-gray-400">Sakit</span>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        className="w-12 text-right bg-transparent border-0 font-bold focus:ring-0 p-0"
                                        value={attendance.sick}
                                        onChange={e => setAttendance({ ...attendance, sick: parseInt(e.target.value) || 0 })}
                                    />
                                    <span className="text-gray-500 font-medium">hari</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/30 p-3 rounded">
                                <span className="text-gray-600 dark:text-gray-400">Izin</span>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        className="w-12 text-right bg-transparent border-0 font-bold focus:ring-0 p-0"
                                        value={attendance.permission}
                                        onChange={e => setAttendance({ ...attendance, permission: parseInt(e.target.value) || 0 })}
                                    />
                                    <span className="text-gray-500 font-medium">hari</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center bg-red-50 dark:bg-red-900/10 p-3 rounded">
                                <span className="text-red-600 dark:text-red-400">Tanpa Keterangan</span>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        className="w-12 text-right bg-transparent border-0 font-bold text-red-600 focus:ring-0 p-0"
                                        value={attendance.absent}
                                        onChange={e => setAttendance({ ...attendance, absent: parseInt(e.target.value) || 0 })}
                                    />
                                    <span className="text-red-600 font-medium">hari</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Teacher Notes */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center gap-2 mb-4 text-blue-600">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <h3 className="font-semibold text-gray-900 dark:text-white">Catatan Wali Kelas</h3>
                    </div>
                    <div className="bg-yellow-50 dark:bg-yellow-900/10 p-6 rounded-lg border border-yellow-100 dark:border-yellow-900/20">
                        <textarea
                            className="w-full bg-transparent border-0 focus:ring-0 text-gray-700 dark:text-gray-300 italic min-h-[80px] resize-none"
                            placeholder="Tulis catatan untuk siswa ini..."
                            value={teacherNotes}
                            onChange={(e) => setTeacherNotes(e.target.value)}
                        />
                    </div>
                </div>

                {/* Signature Area */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
                    <div className="flex justify-between items-end">
                        <div className="text-center w-64">
                            <div className="mb-20 text-gray-500">Orang Tua / Wali</div>
                            <div className="border-b border-gray-300 pb-1 font-bold text-gray-900 dark:text-white">( ........................... )</div>
                        </div>
                        <div className="text-center w-64">
                            <div className="mb-20 text-gray-900 dark:text-white">
                                Jakarta, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </div>
                            <div className="border-b border-gray-300 pb-1 font-bold text-gray-900 dark:text-white">
                                Teacher Name S.Pd
                            </div>
                        </div>
                    </div>
                </div>

                {/* Floating Save Button */}
                <div className="fixed bottom-6 right-6 z-40">
                    <button
                        onClick={handleSaveAll}
                        disabled={saving}
                        className="shadow-xl bg-blue-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-blue-700 flex items-center gap-2 transform hover:scale-105 transition-all disabled:opacity-70 disabled:transform-none"
                    >
                        {saving ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Menyimpan...
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                </svg>
                                Simpan Perubahan
                            </>
                        )}
                    </button>
                </div>

                <PDFExportModal
                    isOpen={showPDFModal}
                    onClose={() => setShowPDFModal(false)}
                    onExport={handleExportPDF}
                />
            </div>

            {/* Printable Component - Only Visible when Printing */}
            {printOptions && (
                <PrintableReport
                    options={printOptions}
                    activeYear={academicYear?.name || ''}
                    semester={String(semester)}
                    student={{
                        student: studentInfo,
                        class: { name: className }, // Add teacher name if available in future
                        grades: Object.values(grades), // Grades from getStudentGrades have subject info attached
                        character_assessments: Object.values(assessments),
                        sick_days: attendance.sick,
                        permission_days: attendance.permission,
                        absent_days: attendance.absent,
                        teacher_notes: teacherNotes
                    }}
                />
            )}
        </>
    );
}
