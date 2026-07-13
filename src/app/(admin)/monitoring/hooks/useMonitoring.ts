'use client';

import useSWR, { KeyedMutator } from 'swr';
import { swrConfig, monitoringKeys } from '@/lib/swr';
import {
    getClassProgress,
    getMaterialsByClassAndSemester,
    getHafalanCategories,
    getMonthlyTargetProgress,
    getCrossClassHistory,
    getClassMonthlyTargetSummary,
    getTeacherRestrictions,
    getAllowedCategories,
} from '../actions/monitoring';
import { getAllClasses } from '@/app/(admin)/users/siswa/actions/classes/actions';
import { getActiveAcademicYear, getAcademicYears } from '@/app/(admin)/tahun-ajaran/actions/academic-years';
import { getAllDaerah } from '@/app/(admin)/organisasi/actions/daerah';
import { getAllDesa } from '@/app/(admin)/organisasi/actions/desa';
import { getAllKelompok } from '@/app/(admin)/organisasi/actions/kelompok';

const SWR_OPTS = {
    ...swrConfig,
    revalidateOnFocus: false,
    dedupingInterval: 2 * 60 * 1000,
    keepPreviousData: true,
} as const;

// ─── Initial data (org/categories/classes/years) — stable reference data ───────

interface MonitoringInitialData {
    activeYearId: string | null;
    academicYears: { value: string; label: string }[];
    daerahList: any[];
    desaList: any[];
    kelompokList: any[];
    classes: any[];
    hafalanCategories: any[];
}

async function fetchMonitoringInitial(): Promise<MonitoringInitialData> {
    const activeYear = await getActiveAcademicYear();

    const [daerahData, desaData, allKelompokData, categoriesResult, classesResult, cmRestrictionsResult, yearsData] =
        await Promise.all([
            getAllDaerah(),
            getAllDesa(),
            getAllKelompok(),
            getHafalanCategories(),
            getAllClasses(),
            getTeacherRestrictions(),
            getAcademicYears(),
        ]);

    let finalCategories = categoriesResult.success ? categoriesResult.data : [];
    const cmRestrictions = cmRestrictionsResult.success ? cmRestrictionsResult.data : null;
    if (cmRestrictions && cmRestrictions.length > 0) {
        const allowedCategoryIds = await getAllowedCategories(cmRestrictions);
        finalCategories = finalCategories.filter((cat: any) => allowedCategoryIds.includes(cat.id));
    }

    return {
        activeYearId: activeYear?.id ?? null,
        academicYears: yearsData.map((y: any) => ({ value: y.id, label: y.name })),
        daerahList: daerahData,
        desaList: desaData,
        kelompokList: allKelompokData,
        classes: classesResult.success ? classesResult.data : [],
        hafalanCategories: finalCategories,
    };
}

export function useMonitoringInitial() {
    return useSWR(monitoringKeys.initial(), fetchMonitoringInitial, {
        ...SWR_OPTS,
        dedupingInterval: 5 * 60 * 1000, // reference data — cache 5 min
        revalidateIfStale: false,
    });
}

// ─── Class progress (students + progress rows) ───────────────────────────────

interface ClassProgressData {
    students: any[];
    progress: any[];
}

async function fetchClassProgress(
    _key: readonly unknown[],
    classId: string,
    yearId: string,
    semester: number
): Promise<ClassProgressData> {
    const result = await getClassProgress(classId, yearId, semester);
    if (!result.success) throw new Error(result.message || 'Gagal memuat progress kelas');
    return { students: result.students || [], progress: result.progress || [] };
}

export function useClassProgress(classId: string, yearId: string, semester: number) {
    const key = classId && yearId && classId !== 'ALL'
        ? monitoringKeys.classProgress(classId, yearId, semester)
        : null;

    return useSWR(
        key,
        (k) => fetchClassProgress(k, classId, yearId, semester),
        SWR_OPTS
    );
}

// ─── Class progress ALL — loop+merge across all classes ─────────────────────

async function fetchClassProgressAll(
    _key: readonly unknown[],
    classes: any[],
    yearId: string,
    semester: number
): Promise<ClassProgressData> {
    const studentsMap = new Map<string, any>();
    const progressMap = new Map<string, any>();

    for (const classData of classes) {
        try {
            const result = await getClassProgress(classData.id, yearId, semester);
            if (result.success) {
                result.students?.forEach((s: any) => {
                    if (!studentsMap.has(s.id)) {
                        studentsMap.set(s.id, { ...s, class_name: classData.name });
                    }
                });
                result.progress?.forEach((p: any) => {
                    progressMap.set(`${p.student_id}-${p.material_item_id}`, p);
                });
            }
        } catch {
            // skip individual class errors, continue
        }
    }

    return {
        students: Array.from(studentsMap.values()),
        progress: Array.from(progressMap.values()),
    };
}

export function useClassProgressAll(classes: any[], yearId: string, semester: number) {
    const classIds = classes.map((c: any) => c.id).sort().join(',');
    const key = classes.length > 0 && yearId
        ? monitoringKeys.classProgressAll(yearId, semester, classIds)
        : null;

    return useSWR(
        key,
        (k) => fetchClassProgressAll(k, classes, yearId, semester),
        { ...SWR_OPTS, dedupingInterval: 3 * 60 * 1000 } // ALL case slightly shorter
    );
}

// ─── Materials for class+semester ───────────────────────────────────────────

async function fetchMaterials(
    _key: readonly unknown[],
    classId: string,
    semester: number
): Promise<any[]> {
    const result = await getMaterialsByClassAndSemester(classId, semester);
    if (!result.success) throw new Error(result.message || 'Gagal memuat materi');
    return result.data || [];
}

export function useMonitoringMaterials(classId: string, semester: number) {
    const key = classId && classId !== 'ALL'
        ? monitoringKeys.materials(classId, semester)
        : null;

    return useSWR(
        key,
        (k) => fetchMaterials(k, classId, semester),
        { ...SWR_OPTS, dedupingInterval: 5 * 60 * 1000, revalidateIfStale: false }
    );
}

// ─── Monthly target progress (per student) ───────────────────────────────────

interface MonthlyTargetParams {
    classId: string;
    yearId: string;
    semester: number;
    month: number;
    studentId: string;
}

async function fetchMonthlyTarget(
    _key: readonly unknown[],
    params: MonthlyTargetParams
): Promise<{ summary: { total_targets: number; completed: number; percentage: number } | null; targetItemIds: Set<string> }> {
    const result = await getMonthlyTargetProgress({
        classId: params.classId,
        academicYearId: params.yearId,
        semester: params.semester,
        month: params.month,
        studentId: params.studentId,
    });

    if (!result.success) return { summary: null, targetItemIds: new Set() };

    const completed = result.progress.filter((p: any) => {
        const score = p.nilai !== null && p.nilai !== undefined ? p.nilai : (p.done ? 100 : 0);
        return score >= 70;
    }).length;

    return {
        summary: {
            total_targets: result.targets.length,
            completed,
            percentage: result.percentage,
        },
        targetItemIds: new Set(result.targets.map((t: any) => t.material_item_id)),
    };
}

export function useMonthlyTargetProgress(params: MonthlyTargetParams | null) {
    const key = params?.classId && params?.yearId && params?.studentId && params?.month
        ? monitoringKeys.monthlyTarget(params.classId, params.yearId, params.semester, params.month, params.studentId)
        : null;

    return useSWR(
        key,
        (k) => fetchMonthlyTarget(k, params!),
        SWR_OPTS
    );
}

// ─── Cross-class history (per student) ──────────────────────────────────────

async function fetchCrossClassHistory(
    _key: readonly unknown[],
    studentId: string,
    yearId: string
): Promise<any[]> {
    const result = await getCrossClassHistory(studentId, yearId);
    if (!result.success) throw new Error(result.message || 'Gagal memuat riwayat lintas kelas');
    return result.data || [];
}

export function useCrossClassHistory(studentId: string, yearId: string) {
    const key = studentId && yearId
        ? monitoringKeys.crossClass(studentId, yearId)
        : null;

    return useSWR(
        key,
        (k) => fetchCrossClassHistory(k, studentId, yearId),
        SWR_OPTS
    );
}

// ─── Monthly summary (% per student in class) ────────────────────────────────

interface MonthlySummaryParams {
    classId: string;
    yearId: string;
    semester: number;
    month: number;
}

async function fetchMonthlySummary(
    _key: readonly unknown[],
    params: MonthlySummaryParams
): Promise<Map<string, number>> {
    const result = await getClassMonthlyTargetSummary({
        classId: params.classId,
        academicYearId: params.yearId,
        semester: params.semester,
        month: params.month,
    });

    if (!result.success) throw new Error(result.message || 'Gagal memuat ringkasan target bulanan');
    return new Map(result.data.map((s: any) => [s.student_id, s.percentage]));
}

export function useClassMonthlySummary(params: MonthlySummaryParams | null) {
    const key = params?.classId && params?.yearId && params?.month
        ? monitoringKeys.monthlySummary(params.classId, params.yearId, params.semester, params.month)
        : null;

    return useSWR(
        key,
        (k) => fetchMonthlySummary(k, params!),
        SWR_OPTS
    );
}

// ─── Mutate helpers ──────────────────────────────────────────────────────────

export type { KeyedMutator };
