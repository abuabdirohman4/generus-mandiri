import { useMemo } from 'react';
import { formatDateIndo } from '@/lib/dateUtils';
import { getWeekOfYear, getQuarterWeekRange, getDateFromWeek } from '@/lib/quarterUtils';

export function useWeekCalculations(
  currentWeek: Date, 
  year: number, 
  quarter: number, 
  selectedWeekInQuarter: number | undefined
) {
  return useMemo(() => {
    const currentWeekNumber = getWeekOfYear(currentWeek);
    const { startWeek, endWeek } = getQuarterWeekRange(year, quarter);
    const totalWeeks = endWeek - startWeek + 1;
    const weekInQuarter = Math.max(1, Math.min(totalWeeks, currentWeekNumber - startWeek + 1));
    const displayWeek = weekInQuarter;

    const weekStartDate = getDateFromWeek(year, startWeek + displayWeek - 1, 1);
    const weekEndDate = getDateFromWeek(year, startWeek + displayWeek - 1, 7);
    const weekRangeLabel = `${formatDateIndo(weekStartDate)} – ${formatDateIndo(weekEndDate)}`;

    return {
      currentWeekNumber,
      startWeek,
      endWeek,
      totalWeeks,
      weekInQuarter,
      displayWeek,
      weekStartDate,
      weekEndDate,
      weekRangeLabel
    };
  }, [currentWeek.getTime(), year, quarter, selectedWeekInQuarter]); // Use getTime() for stable comparison
}
