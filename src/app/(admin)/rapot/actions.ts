'use server'

import { getClassEnrollments } from '@/app/(admin)/tahun-ajaran/actions/enrollments';
import { createAdminClient } from '@/lib/supabase/server';
import {
    ReportSubject,
    ReportTemplate,
    ReportTemplateSubject,
    StudentGrade,
    StudentCharacterAssessment,
    StudentReport,
    GradeInput,
    CharacterAssessmentInput,
    ReportTemplateInput
} from './types';

// ==========================================
// GRADNG HELPERS
// ==========================================

export async function calculateGradeFromScore(score: number): Promise<string> {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B+';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'E';
}

// ==========================================
// STUDENT GRADES
// ==========================================

export async function getStudentGrades(studentId: string, academicYearId: string, semester: number): Promise<StudentGrade[]> {
    const supabase = await createAdminClient();

    const { data, error } = await supabase
        .from('student_grades')
        .select(`
            *,
            subject:report_subjects(
                id,
                display_name,
                display_order,
                material_type:material_types(
                    name,
                    category:material_categories(
                        id,
                        name
                    )
                )
            )
        `)
        .eq('student_id', studentId)
        .eq('academic_year_id', academicYearId)
        .eq('semester', semester)
        .order('display_order', { foreignTable: 'subject' });

    if (error) {
        console.error('Error fetching student grades:', error);
        throw new Error('Gagal mengambil nilai siswa');
    }

    return data || [];
}

export async function updateGrade(data: GradeInput): Promise<void> {
    const supabase = await createAdminClient();

    // Auto calculate grade letter if not provided
    let gradeLetter = data.grade;
    if (!gradeLetter && data.score !== undefined) {
        gradeLetter = await calculateGradeFromScore(data.score);
    }

    const { error } = await supabase
        .from('student_grades')
        .upsert({
            student_id: data.student_id,
            subject_id: data.subject_id,
            academic_year_id: data.academic_year_id,
            semester: data.semester,
            score: data.score,
            grade: gradeLetter,
            description: data.description,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'student_id, subject_id, academic_year_id, semester'
        });

    if (error) {
        console.error('Error updating grade:', error);
        throw new Error('Gagal menyimpan nilai');
    }
}

export async function bulkUpdateGrades(updates: GradeInput[]): Promise<void> {
    const supabase = await createAdminClient();

    // Calculate grades for all updates
    const processedUpdates = await Promise.all(updates.map(async (u) => {
        let gradeLetter = u.grade;
        if (!gradeLetter && u.score !== undefined) {
            gradeLetter = await calculateGradeFromScore(u.score);
        }
        return {
            student_id: u.student_id,
            subject_id: u.subject_id,
            academic_year_id: u.academic_year_id,
            semester: u.semester,
            score: u.score,
            grade: gradeLetter,
            description: u.description,
            updated_at: new Date().toISOString()
        };
    }));

    const { error } = await supabase
        .from('student_grades')
        .upsert(processedUpdates, {
            onConflict: 'student_id, subject_id, academic_year_id, semester'
        });

    if (error) {
        console.error('Error bulk updating grades:', error);
        throw new Error('Gagal menyimpan update nilai masal');
    }
}

// ==========================================
// CHARACTER ASSESSMENTS
// ==========================================

export async function getCharacterAssessments(studentId: string, academicYearId: string, semester: number): Promise<StudentCharacterAssessment[]> {
    const supabase = await createAdminClient();

    const { data, error } = await supabase
        .from('student_character_assessments')
        .select('*')
        .eq('student_id', studentId)
        .eq('academic_year_id', academicYearId)
        .eq('semester', semester);

    if (error) {
        console.error('Error fetching character assessments:', error);
        throw new Error('Gagal mengambil penilaian karakter');
    }

    return data || [];
}

export async function updateCharacterAssessment(data: CharacterAssessmentInput): Promise<void> {
    const supabase = await createAdminClient();

    const { error } = await supabase
        .from('student_character_assessments')
        .upsert({
            student_id: data.student_id,
            academic_year_id: data.academic_year_id,
            semester: data.semester,
            character_aspect: data.character_aspect,
            grade: data.grade,
            description: data.description,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'student_id, academic_year_id, semester, character_aspect'
        });

    if (error) {
        console.error('Error updating character assessment:', error);
        throw new Error('Gagal menyimpan penilaian karakter');
    }
}


// ==========================================
// REPORT TEMPLATES
// ==========================================

export async function getReportTemplates(classId?: string, academicYearId?: string, includeAll: boolean = false): Promise<ReportTemplate[]> {
    const supabase = await createAdminClient();

    let query = supabase
        .from('report_templates')
        .select(`
            *,
            subjects:report_template_subjects(
                *,
                subject:report_subjects(*)
            ),
            class:classes(id, name),
            academic_year:academic_years(id, name)
        `)
        .eq('is_active', true);

    if (!includeAll) {
        // Normal filtering mode (for consumption)
        if (classId) {
            query = query.or(`class_id.eq.${classId},class_id.is.null`);
        } else {
            query = query.is('class_id', null); // Default global only if no class specified
        }

        if (academicYearId) {
            query = query.or(`academic_year_id.eq.${academicYearId},academic_year_id.is.null`);
        }
    }
    // If includeAll is true, we skip the filters and return everything (Admin Mode)

    const { data, error } = await query;
    console.log('getReportTemplates result:', { dataLength: data?.length, error, classId, academicYearId });

    if (error) {
        console.error('Error fetching report templates:', error);
        throw new Error('Gagal mengambil template rapot');
    }

    return data || [];
}

export async function createReportTemplate(data: ReportTemplateInput): Promise<ReportTemplate> {
    const supabase = await createAdminClient();

    // 1. Create Template
    const { data: template, error } = await supabase
        .from('report_templates')
        .insert({
            name: data.name,
            class_id: data.class_id || null,
            academic_year_id: data.academic_year_id || null,
            is_active: data.is_active ?? true
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating report template:', error);
        throw new Error('Gagal membuat template rapot');
    }

    // 2. Add Subjects if provided
    if (data.subject_ids && data.subject_ids.length > 0) {
        const templateSubjects = data.subject_ids.map((subjectId, index) => ({
            template_id: template.id,
            subject_id: subjectId,
            display_order: index + 1,
            is_required: true
        }));

        const { error: subjectError } = await supabase
            .from('report_template_subjects')
            .insert(templateSubjects);

        if (subjectError) {
            console.error('Error adding subjects to template:', subjectError);
            // Non-fatal, return template
        }
    }

    return template;
}

export async function updateReportTemplate(id: string, data: ReportTemplateInput): Promise<void> {
    const supabase = await createAdminClient();

    const { error } = await supabase
        .from('report_templates')
        .update({
            name: data.name,
            class_id: data.class_id || null,
            academic_year_id: data.academic_year_id || null,
            is_active: data.is_active,
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    if (error) {
        throw new Error('Gagal update template rapot');
    }

    // If subject_ids provided, replace existing subjects
    if (data.subject_ids) {
        await updateTemplateSubjects(id, data.subject_ids);
    }
}

export async function updateTemplateSubjects(templateId: string, subjectIds: string[]): Promise<void> {
    const supabase = await createAdminClient();

    // 1. Delete existing
    await supabase
        .from('report_template_subjects')
        .delete()
        .eq('template_id', templateId);

    // 2. Insert new
    if (subjectIds.length > 0) {
        const templateSubjects = subjectIds.map((subjectId, index) => ({
            template_id: templateId,
            subject_id: subjectId,
            display_order: index + 1
        }));

        const { error } = await supabase
            .from('report_template_subjects')
            .insert(templateSubjects);

        if (error) {
            throw new Error('Gagal update mata pelajaran template');
        }
    }
}

export async function getTemplateSubjects(templateId: string): Promise<ReportSubject[]> {

    const supabase = await createAdminClient();

    const { data, error } = await supabase
        .from('report_template_subjects')
        .select(`
            subject:report_subjects(*)
        `)
        .eq('template_id', templateId)
        .order('display_order');

    if (error) {
        console.error('Error fetching template subjects:', error);
        throw new Error('Gagal mengambil mata pelajaran template');
    }

    // Flatten structure
    return data?.map((item: any) => item.subject) || [];
}

// ==========================================
// REPORTS GENERATION
// ==========================================

export async function getStudentReport(studentId: string, academicYearId: string, semester: number): Promise<StudentReport | null> {
    const supabase = await createAdminClient();

    const { data, error } = await supabase
        .from('student_reports')
        .select(`
            *,
            student:students(*),
            class:classes(id, name),
            academic_year:academic_years(id, name)
        `)
        .eq('student_id', studentId)
        .eq('academic_year_id', academicYearId)
        .eq('semester', semester)
        .single();

    if (error && error.code !== 'PGRST116') { // Ignore not found error
        console.error('Error fetching student report:', error);
        throw new Error('Gagal mengambil data rapot');
    }

    return data || null;
}

export async function generateReport(studentId: string, academicYearId: string, semester: number): Promise<StudentReport> {
    const supabase = await createAdminClient();

    // 1. Calculate Average Score from Grades
    const { data: grades } = await supabase
        .from('student_grades')
        .select('score')
        .eq('student_id', studentId)
        .eq('academic_year_id', academicYearId)
        .eq('semester', semester);

    let averageScore = 0;
    if (grades && grades.length > 0) {
        const total = grades.reduce((sum: number, g: { score: number | null }) => sum + (g.score || 0), 0);
        averageScore = total / grades.length;
    }

    // 2. Determine Class ID (from enrollment)
    const { data: enrollment } = await supabase
        .from('student_enrollments')
        .select('class_id')
        .eq('student_id', studentId)
        .eq('academic_year_id', academicYearId)
        .eq('semester', semester)
        .single();

    if (!enrollment) {
        throw new Error('Siswa tidak terdaftar pada tahun ajaran/semester ini');
    }

    // 3. Upsert Report
    const { data: report, error } = await supabase
        .from('student_reports')
        .upsert({
            student_id: studentId,
            academic_year_id: academicYearId,
            semester: semester,
            class_id: enrollment.class_id,
            average_score: parseFloat(averageScore.toFixed(2)),
            generated_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'student_id, academic_year_id, semester'
        })
        .select()
        .single();

    if (error) {
        console.error('Error generating report:', error);
        throw new Error('Gagal regenerate rapot');
    }

    return report;
}

export async function publishReport(reportId: string): Promise<void> {
    const supabase = await createAdminClient();

    const { error } = await supabase
        .from('student_reports')
        .update({ is_published: true })
        .eq('id', reportId);

    if (error) {
        throw new Error('Gagal publish rapot');
    }
}

export async function getClassReportsSummary(classId: string, academicYearId: string, semester: number) {
    const supabase = await createAdminClient();

    // Get enrollments first to know who SHOULD have reports
    console.log('getClassReportsSummary Params:', { classId, academicYearId, semester });

    const enrollments = await getClassEnrollments(classId, academicYearId, semester);

    console.log('Enrollments found:', enrollments?.length);

    if (!enrollments || enrollments.length === 0) return [];

    // Filter out enrollments with null students (data integrity issue)
    const validEnrollments = enrollments.filter(e => e.student !== null && e.student !== undefined);

    if (validEnrollments.length === 0) {
        console.warn('No valid enrollments found - all students are null');
        return [];
    }

    // Get existing reports - with defensive mapping
    const studentIds = validEnrollments
        .map(e => (e.student as any)?.id)
        .filter(id => id !== null && id !== undefined);

    if (studentIds.length === 0) {
        console.warn('No valid student IDs extracted from enrollments');
        return [];
    }

    const { data: reports } = await supabase
        .from('student_reports')
        .select('id, student_id, is_published, generated_at, average_score')
        .in('student_id', studentIds)
        .eq('academic_year_id', academicYearId)
        .eq('semester', semester);

    // Merge data
    const reportMap = new Map(reports?.map(r => [r.student_id, r]));

    return validEnrollments.map(enrollment => {
        const student = enrollment.student as any;
        const report = reportMap.get(student.id);
        return {
            student: student,
            reportId: report?.id,
            isGenerated: !!report,
            isPublished: report?.is_published || false,
            generatedAt: report?.generated_at,
            averageScore: report?.average_score
        };
    });
}


export async function getClassReportsBulk(classId: string, academicYearId: string, semester: number) {
    const supabase = await createAdminClient();

    // 1. Get Enrollments (Students)
    const enrollments = await getClassEnrollments(classId, academicYearId, semester);
    if (!enrollments || enrollments.length === 0) return [];

    // Filter valid enrollments and extract student IDs
    const validEnrollments = enrollments.filter(e => e.student !== null && e.student !== undefined);
    if (validEnrollments.length === 0) return [];

    const studentIds = validEnrollments
        .map(e => (e.student as any)?.id)
        .filter(id => id !== null && id !== undefined);

    // 2. Fetch All Data in Parallel
    const [gradesData, assessmentsData, reportsData] = await Promise.all([
        supabase
            .from('student_grades')
            .select(`
                *,
                subject:report_subjects(
                    id,
                    display_name,
                    display_order,
                    material_type:material_types(
                        name,
                        category:material_categories(
                            id,
                            name
                        )
                    )
                )
            `)
            .in('student_id', studentIds)
            .eq('academic_year_id', academicYearId)
            .eq('semester', semester),

        supabase
            .from('student_character_assessments')
            .select('*')
            .in('student_id', studentIds)
            .eq('academic_year_id', academicYearId)
            .eq('semester', semester),

        supabase
            .from('student_reports')
            .select('*')
            .in('student_id', studentIds)
            .eq('academic_year_id', academicYearId)
            .eq('semester', semester)
    ]);

    // 3. Map Data by Student ID
    const gradesMap: Record<string, StudentGrade[]> = {};
    gradesData.data?.forEach((g: any) => {
        if (!gradesMap[g.student_id]) gradesMap[g.student_id] = [];
        gradesMap[g.student_id].push(g);
    });

    const assessmentsMap: Record<string, StudentCharacterAssessment[]> = {};
    assessmentsData.data?.forEach(a => {
        if (!assessmentsMap[a.student_id]) assessmentsMap[a.student_id] = [];
        assessmentsMap[a.student_id].push(a);
    });

    const reportsMap = new Map(reportsData.data?.map(r => [r.student_id, r]));

    // 4. Transform to Full Object - use validEnrollments
    return validEnrollments.map(enrollment => {
        const student = enrollment.student as any;
        const report = reportsMap.get(student?.id);

        return {
            student: student,
            class: enrollment.class,
            grades: gradesMap[student.id] || [],
            character_assessments: assessmentsMap[student.id] || [],
            sick_days: report?.sick_days || 0,
            permission_days: report?.permission_days || 0,
            absent_days: report?.absent_days || 0,
            teacher_notes: report?.teacher_notes || ''
        };
    });
}

