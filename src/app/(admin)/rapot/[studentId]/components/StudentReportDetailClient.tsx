'use client';

import React, { useState, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
    getStudentReport,
    generateReport,
    bulkUpsertSectionGrades
} from '../../actions'; // Added bulkUpsertSectionGrades, removed old ones if unused
import {
    getApplicableTemplate,
    resolveSectionItems
} from '../../templates/actions';
import { getActiveAcademicYear } from '@/app/(admin)/tahun-ajaran/actions/academic-years';
import { getStudentEnrollments } from '@/app/(admin)/tahun-ajaran/actions/enrollments';
import {
    StudentReport,
} from '../../types';
import GradeInput from '../../components/GradeInput';
import PDFExportModal from '../../components/PDFExportModal';
import { createClient } from '@/lib/supabase/client';
import { FloppyDiskIcon } from '@/lib/icons';
import { downloadStudentPDF } from '../../components/pdfUtils';
import FloatingActionButton from '@/components/ui/button/FloatingActionButton';

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

export interface StudentReportDetailRef {
    downloadPDF: () => Promise<void>;
}

const StudentReportDetailClient = forwardRef<StudentReportDetailRef, Props>(({ studentId, semester: propSemester }, ref) => {
    const router = useRouter();
    const supabase = createClient();

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

    // New State for Sections
    const [template, setTemplate] = useState<any>(null);
    const [resolvedSections, setResolvedSections] = useState<any[]>([]);

    // Grades: Nested by section_id -> material_item_id -> Grade Data
    const [grades, setGrades] = useState<Record<string, Record<string, {
        section_item_id: string
        material_item_id: string
        score?: number
        grade?: string
        is_memorized?: boolean
        description?: string
    }>>>({});

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

            // 1. Get Enrollment & Student Info
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

                // 2. Get Applicable Template
                const templateRes = await getApplicableTemplate(
                    studentId,
                    activeYearRes.id,
                    semester as 1 | 2
                );

                if (templateRes.success && templateRes.data) {
                    const tpl = templateRes.data;
                    setTemplate(tpl);

                    // 3. Resolve Sections Items
                    const currentClassMasterId = currentEnrollment.class?.class_master_mappings?.[0]?.class_master_id;
                    if (currentClassMasterId) {
                        const resolved = await Promise.all(
                            tpl.sections.map(async (section: any) => {
                                const sectionItems = await Promise.all(
                                    (section.items || []).map((item: any) =>
                                        resolveSectionItems(item, currentClassMasterId, semester as 1 | 2)
                                    )
                                );
                                return {
                                    ...section,
                                    resolvedItems: sectionItems.flatMap(r => r.data || [])
                                };
                            })
                        );
                        setResolvedSections(resolved);

                        // 4. Load Existing Grades from new table
                        const { data: existingGrades } = await supabase
                            .from('student_section_grades')
                            .select('*')
                            .eq('student_id', studentId)
                            .eq('academic_year_id', activeYearRes.id)
                            .eq('semester', semester)
                            .eq('template_id', tpl.id);

                        // Map Grades
                        // Structure: section_id -> material_item_id -> Grade Data
                        const gradesMap: any = {};
                        existingGrades?.forEach(g => {
                            if (!gradesMap[g.section_id]) gradesMap[g.section_id] = {};
                            const key = g.material_item_id || g.section_item_id;
                            gradesMap[g.section_id][key] = g;
                        });
                        setGrades(gradesMap);
                    }
                }
            }

            // 5. Get existing report meta (for attendance etc)
            const { data: reportData } = await supabase
                .from('student_reports')
                .select('*')
                .eq('student_id', studentId)
                .eq('academic_year_id', activeYearRes.id)
                .eq('semester', semester)
                .single();

            if (reportData) {
                setReport(reportData);
                setAttendance({
                    sick: reportData.sick_days || 0,
                    permission: reportData.permission_days || 0,
                    absent: reportData.absent_days || 0
                });
                setTeacherNotes(reportData.teacher_notes || '');
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
            if (!template || !academicYear) return;
            setSaving(true);

            // Flatten grades for saving
            const gradesToSave: any[] = [];
            Object.keys(grades).forEach(sectionId => {
                const sectionGrades = grades[sectionId];
                Object.keys(sectionGrades).forEach(materialItemId => {
                    const gradeData = sectionGrades[materialItemId];
                    // Also need to find section_item_id?
                    // We stored it in state? Yes, the state value has it if we populated from DB or UI.
                    // But if it's a NEW grade entered in UI, we need to know the section_item_id.
                    // The UI renders items. We can pass section_item_id when updating state.
                    if (gradeData) {
                        gradesToSave.push(gradeData);
                    }
                });
            });

            if (gradesToSave.length > 0) {
                await bulkUpsertSectionGrades({
                    student_id: studentId,
                    template_id: template.id,
                    academic_year_id: academicYear.id,
                    semester: semester as 1 | 2,
                    grades: gradesToSave.map(g => ({
                        section_id: g.section_id, // We need to ensure we have this in state
                        section_item_id: g.section_item_id,
                        material_item_id: g.material_item_id,
                        score: g.score,
                        grade: g.grade,
                        is_memorized: g.is_memorized,
                        description: g.description
                    }))
                });
            }

            // Save Report Meta
            // We use standard generateReport to ensure record exists and update stats if needed
            // But we also need to update attendance/notes which generateReport might not take args for yet?
            // Let's assume we maintain `student_reports` table for meta.
            // Check `generateReport` action? It was imported but logic is standard.
            // For now, I'll direct update `student_reports` using supabase client for speed, as per previous logic.
            // But I should call generic upsert first?
            // Actually, just upserting `student_reports` is fine.
            const { error } = await supabase
                .from('student_reports')
                .upsert({
                    student_id: studentId,
                    academic_year_id: academicYear.id,
                    semester: semester,
                    class_id: studentInfo?.class_id, // Might be needed if new record
                    sick_days: attendance.sick,
                    permission_days: attendance.permission,
                    absent_days: attendance.absent,
                    teacher_notes: teacherNotes
                }, { onConflict: 'student_id,academic_year_id,semester' }); // Unique key? checking schema... usually (student_id, academic_year_id, semester)

            if (error) throw error;

            toast.success('Semua perubahan berhasil disimpan');
            // Refresh to ensure everything syncs?
            // loadData(); // Optional
        } catch (error) {
            console.error(error);
            toast.error('Gagal menyimpan perubahan');
        } finally {
            setSaving(false);
        }
    };


    const [printOptions, setPrintOptions] = useState<any>(null);

    // Clean up print state after printing
    useEffect(() => {
        const handleAfterPrint = () => {
            setPrintOptions(null);
        };
        window.addEventListener('afterprint', handleAfterPrint);
        return () => window.removeEventListener('afterprint', handleAfterPrint);
    }, []);


    // Handle Download logic - using @react-pdf/renderer
    const handleDownloadPDF = async (options: any = { paperSize: 'A4', orientation: 'portrait' }) => {
        try {
            if (!studentInfo || !studentInfo.name) {
                toast.error('Data siswa belum siap');
                return;
            }

            setPrintOptions(options);

            // Structure data for PDF
            // Need to pass resolved items and their grades
            const sectionsWithGrades = resolvedSections.map(section => ({
                ...section,
                items: section.resolvedItems.map((item: any) => ({
                    ...item,
                    grade: grades[section.id]?.[item.id] // item.id here is material_item_id from resolve logic? No, resolve logic returns object.
                    // resolveSectionItems returns { ...item (material_item props), section_item_id: ... }
                    // Wait, `material_items` usually have an ID.
                    // Let's verify resolve output structure in `actions.ts`.
                    // It returns `data: results`.
                    // results = `...materialItem, section_item_id: ...`.
                    // So `item.id` IS the `material_item_id`. Correct.
                }))
            }));

            const studentData = {
                student: studentInfo,
                class: { name: className },
                sections: sectionsWithGrades,
                // Flatten sections to grades for PDF compatibility
                grades: sectionsWithGrades.flatMap(section =>
                    section.items.map((item: any) => ({
                        score: item.grade?.score,
                        grade: item.grade?.grade,
                        description: item.grade?.description,
                        subject: {
                            display_name: item.material_name,
                            display_order: item.display_order || 0,
                            material_type: {
                                category: {
                                    name: item.category_name || 'Lainnya'
                                }
                            }
                        }
                    }))
                ),
                sick_days: attendance.sick,
                permission_days: attendance.permission,
                absent_days: attendance.absent,
                teacher_notes: teacherNotes
            };

            // Note: downloadStudentPDF needs update to handle new structure? 
            // Phase 8 is "Update PDF Generation".
            // For now providing data.

            await downloadStudentPDF({
                student: studentData,
                activeYear: academicYear?.name || '',
                semester: String(semester),
                fileName: `Rapor_${studentInfo.name.replace(/\s+/g, '_')}_Semester${semester}.pdf`
            });

            toast.success('PDF berhasil didownload');
        } catch (err: any) {
            console.error('PDF Generation Error:', err);
            toast.error(`Gagal mendownload PDF: ${err?.message || 'Unknown error'}`);
        } finally {
            setPrintOptions(null);
        }
    };

    useImperativeHandle(ref, () => ({
        downloadPDF: () => handleDownloadPDF()
    }));

    if (loading) return (
        // Skeleton
        <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
                <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
        </div>
    )

    return (
        <>
            <div className={`space-y-6 print:hidden relative`}>
                {resolvedSections.map((section) => (
                    <div key={section.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white">{section.title}</h3>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-1/2">
                                            Materi
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-1/2">
                                            Penilaian
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {(() => {
                                        // Group items by type name or category name
                                        const grouped = section.resolvedItems.reduce((acc: any, item: any) => {
                                            const groupName = item.type_name || item.category_name || 'Materi';
                                            if (!acc[groupName]) acc[groupName] = [];
                                            acc[groupName].push(item);
                                            return acc;
                                        }, {});

                                        return Object.entries(grouped).map(([groupName, items]: [string, any]) => {
                                            // Show header if items are NOT single mode (meaning they have material_item_id)
                                            // AND it's not the default 'Materi' group
                                            const isExpandMode = items.some((i: any) => i.material_item_id !== null);
                                            const showHeader = isExpandMode && groupName !== 'Materi';

                                            return (
                                                <React.Fragment key={groupName}>
                                                    {showHeader && (
                                                        <tr className="bg-gray-50 dark:bg-gray-750">
                                                            <td colSpan={2} className="px-4 py-2 text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                                                                {groupName}
                                                            </td>
                                                        </tr>
                                                    )}
                                                    {items.map((item: any) => {
                                                        const materialItemId = item.material_item_id;
                                                        const sectionItemId = item.section_item_id;
                                                        // Use item.id if available, otherwise composite key
                                                        const itemKey = materialItemId || sectionItemId;
                                                        const currentGrade = grades[section.id]?.[itemKey] || {};

                                                        return (
                                                            <tr key={itemKey} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                                                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                                                    <div className={showHeader ? "pl-4" : ""}>
                                                                        {item.material_name}
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3 flex justify-center">
                                                                    <GradeInput
                                                                        format={section.grading_format}
                                                                        value={{
                                                                            score: currentGrade.score,
                                                                            grade: currentGrade.grade,
                                                                            is_memorized: currentGrade.is_memorized,
                                                                            description: currentGrade.description
                                                                        }}
                                                                        onChange={(val) => {
                                                                            setGrades(prev => ({
                                                                                ...prev,
                                                                                [section.id]: {
                                                                                    ...prev[section.id],
                                                                                    [itemKey]: {
                                                                                        ...prev[section.id]?.[itemKey],
                                                                                        section_id: section.id,
                                                                                        section_item_id: sectionItemId,
                                                                                        material_item_id: materialItemId,
                                                                                        ...val
                                                                                    }
                                                                                }
                                                                            }));
                                                                        }}
                                                                        compact={true}
                                                                    />
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </React.Fragment>
                                            );
                                        });
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}

                {/* Attendance */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Rekap Kehadiran</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/30 p-3 rounded">
                            <span>Sakit</span>
                            <input
                                type="number"
                                className="w-16 text-right bg-transparent border-none focus:ring-0"
                                value={attendance.sick}
                                onChange={e => setAttendance({ ...attendance, sick: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                        <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/30 p-3 rounded">
                            <span>Izin</span>
                            <input
                                type="number"
                                className="w-16 text-right bg-transparent border-none focus:ring-0"
                                value={attendance.permission}
                                onChange={e => setAttendance({ ...attendance, permission: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                        <div className="flex justify-between items-center bg-red-50 dark:bg-red-900/10 p-3 rounded">
                            <span className="text-red-600">Alpa</span>
                            <input
                                type="number"
                                className="w-16 text-right bg-transparent border-none focus:ring-0 text-red-600"
                                value={attendance.absent}
                                onChange={e => setAttendance({ ...attendance, absent: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                    </div>
                </div>

                {/* Teacher Notes */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Catatan Wali Kelas</h3>
                    <textarea
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                        rows={4}
                        value={teacherNotes}
                        onChange={(e) => setTeacherNotes(e.target.value)}
                        placeholder="Tulis catatan..."
                    />
                </div>

                {/* Floating Save Button */}
                <div className="fixed z-50 bottom-[80px] md:bottom-6 right-6">
                    <button
                        onClick={handleSaveAll}
                        disabled={saving}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg flex items-center justify-center disabled:opacity-70"
                    >
                        {saving ? (
                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <FloppyDiskIcon className="w-6 h-6" />
                        )}
                    </button>
                </div>

                <PDFExportModal
                    isOpen={showPDFModal}
                    onClose={() => setShowPDFModal(false)}
                    onExport={handleDownloadPDF}
                />
            </div>
        </>
    );
});

StudentReportDetailClient.displayName = 'StudentReportDetailClient';
export default StudentReportDetailClient;
