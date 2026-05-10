/**
 * Unified Rate & Grade Utilities
 * 
 * Standardized thresholds for all metrics (Attendance, Progress, Grades):
 * - 90+ : Success (Green / A)
 * - 80+ : Info (Blue / B)
 * - 70+ : Warning (Yellow / C)
 * - <70 : Danger (Red / D)
 */

export type RateVariant = 'text' | 'bg' | 'bg-light' | 'bar' | 'text-pure';

const COLORS = {
    success: {
        text: 'text-green-600 dark:text-green-400',
        textPure: 'text-green-500 dark:text-green-400',
        bg: 'bg-green-100 dark:bg-green-900',
        bgLight: 'bg-green-50 dark:bg-green-900/20',
        bar: 'bg-green-500'
    },
    info: {
        text: 'text-blue-600 dark:text-blue-400',
        textPure: 'text-blue-500 dark:text-blue-400',
        bg: 'bg-blue-100 dark:bg-blue-900',
        bgLight: 'bg-blue-50 dark:bg-blue-900/20',
        bar: 'bg-blue-500'
    },
    warning: {
        text: 'text-yellow-600 dark:text-yellow-400',
        textPure: 'text-yellow-500 dark:text-yellow-400',
        bg: 'bg-yellow-100 dark:bg-yellow-900',
        bgLight: 'bg-yellow-50 dark:bg-yellow-900/20',
        bar: 'bg-yellow-500'
    },
    danger: {
        text: 'text-red-600 dark:text-red-400',
        textPure: 'text-red-500 dark:text-red-400',
        bg: 'bg-red-100 dark:bg-red-900',
        bgLight: 'bg-red-50 dark:bg-red-900/20',
        bar: 'bg-red-500'
    },
    default: {
        text: 'text-gray-400',
        textPure: 'text-gray-400',
        bg: 'bg-gray-100',
        bgLight: 'bg-gray-50',
        bar: 'bg-gray-400'
    }
};

/**
 * Get color/style class for a percentage value based on unified thresholds.
 */
export const getRateStyle = (value: number, variant: RateVariant = 'text'): string => {
    let level: keyof typeof COLORS;
    
    if (value >= 90) level = 'success';
    else if (value >= 80) level = 'info';
    else if (value >= 70) level = 'warning';
    else level = 'danger';

    const set = COLORS[level];
    switch (variant) {
        case 'text': return set.text;
        case 'bg': return set.bg;
        case 'bg-light': return set.bgLight;
        case 'bar': return set.bar;
        case 'text-pure': return set.textPure;
        default: return set.text;
    }
};

/**
 * Get grade information (Grade, Label, and combined Style) for a value.
 */
export const getRateGrade = (value?: number | null) => {
    if (value === undefined || value === null || value < 0) {
        return { grade: '-', label: '', color: COLORS.default.text, bg: COLORS.default.bg };
    }

    const text = getRateStyle(value, 'text');
    const bg = getRateStyle(value, 'bg-light');
    
    const info = value >= 90 ? { g: 'A', l: 'Terlampaui' } :
                 value >= 80 ? { g: 'B', l: 'Memenuhi' } :
                 value >= 70 ? { g: 'C', l: 'Cukup Memenuhi' } : 
                 { g: 'D', l: 'Tidak Memenuhi' };

    return {
        grade: info.g,
        label: info.l,
        style: `${text} ${bg}`,
        color: text,
        text,
        bg
    };
};