export const getStatusColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600 dark:text-green-400'
    if (percentage >= 60) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
}

export const getStatusBgColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-100 dark:bg-green-900'
    if (percentage >= 60) return 'bg-yellow-100 dark:bg-yellow-900'
    return 'bg-red-100 dark:bg-red-900'
}

// Calculate grade/predikat based on score
export const getGrade = (nilai?: number): { grade: string; label: string; color: string } => {
    if (!nilai || nilai < 0) return { grade: '-', label: '', color: 'text-gray-400' };

    if (nilai >= 90) return { grade: 'A', label: 'Terlampaui', color: 'text-green-600 bg-green-50 dark:bg-green-900/20' };
    if (nilai >= 80) return { grade: 'B', label: 'Memenuhi', color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' };
    if (nilai >= 70) return { grade: 'C', label: 'Cukup Memenuhi', color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20' };
    return { grade: 'D', label: 'Tidak Memenuhi', color: 'text-red-600 bg-red-50 dark:bg-red-900/20' };
};