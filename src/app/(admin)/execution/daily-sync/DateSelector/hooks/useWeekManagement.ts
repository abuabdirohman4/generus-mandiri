import { useState, useMemo, useEffect } from 'react';
import { useQuarterStore } from '@/stores/quarterStore';
import { getWeekOfYear, getQuarterWeekRange, getDateFromWeek } from '@/lib/quarterUtils';

const getTodayDate = () => {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return today;
};

function ensureMonday(date: Date) {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  return d;
}

export function useWeekManagement() {
  const { year, quarter } = useQuarterStore();
  
  // Memoize today to prevent infinite loops
  const today = useMemo(() => getTodayDate(), []);
  
  // Check if today falls within the selected quarter
  const isTodayInQuarter = useMemo(() => {
    const { startWeek, endWeek } = getQuarterWeekRange(year, quarter);
    const todayWeek = getWeekOfYear(today);
    return todayWeek >= startWeek && todayWeek <= endWeek;
  }, [year, quarter, today]);
  
  // Initialize currentWeek based on whether today is in quarter or not
  const [currentWeek, setCurrentWeek] = useState(() => {
    if (isTodayInQuarter) {
      // If today is in the selected quarter, use today's week
      return ensureMonday(today);
    } else {
      // If today is not in the selected quarter, use first week of quarter
      const { startWeek } = getQuarterWeekRange(year, quarter);
      const weekStartDate = getDateFromWeek(year, startWeek, 1);
      return ensureMonday(weekStartDate);
    }
  });
  const [isWeekDropdownOpen, setIsWeekDropdownOpen] = useState(false);

  // Update currentWeek when quarter changes
  useEffect(() => {
    if (isTodayInQuarter) {
      // If today is in the selected quarter, use today's week
      setCurrentWeek(ensureMonday(today));
    } else {
      // If today is not in the selected quarter, use first week of quarter
      const { startWeek } = getQuarterWeekRange(year, quarter);
      const weekStartDate = getDateFromWeek(year, startWeek, 1);
      setCurrentWeek(ensureMonday(weekStartDate));
    }
  }, [year, quarter, isTodayInQuarter, today]);

  const getDefaultDayIndexForWeek = (weekStartDate: Date) => {
    const weekDateStrs = getWeekDates(weekStartDate).map(d => getLocalDateString(d));
    const todayStr = getLocalDateString(today);
    const todayIndex = weekDateStrs.indexOf(todayStr);
    return todayIndex !== -1 ? todayIndex : 0;
  };

  const weekCalculations = useMemo(() => {
    const currentWeekNumber = getWeekOfYear(currentWeek);
    const { startWeek, endWeek } = getQuarterWeekRange(year, quarter);
    const totalWeeks = endWeek - startWeek + 1;
    const weekInQuarter = Math.max(1, Math.min(totalWeeks, currentWeekNumber - startWeek + 1));
    const displayWeek = weekInQuarter;
    const weekStartDate = getDateFromWeek(year, startWeek + displayWeek - 1, 1);
    const weekEndDate = getDateFromWeek(year, startWeek + displayWeek - 1, 7);
    return {
      currentWeekNumber,
      startWeek,
      endWeek,
      totalWeeks,
      weekInQuarter,
      displayWeek,
      weekStartDate,
      weekEndDate
    };
  }, [currentWeek, year, quarter]);

  const goPrevWeek = () => {
    const prev = new Date(currentWeek);
    prev.setDate(currentWeek.getDate() - 7);
    prev.setHours(12, 0, 0, 0);
    const monday = ensureMonday(prev);
    setCurrentWeek(monday);
    return getDefaultDayIndexForWeek(monday);
  };

  const goNextWeek = () => {
    const next = new Date(currentWeek);
    next.setDate(currentWeek.getDate() + 7);
    next.setHours(12, 0, 0, 0);
    const monday = ensureMonday(next);
    setCurrentWeek(monday);
    return getDefaultDayIndexForWeek(monday);
  };

  const handleSelectWeek = (weekIdx: number) => {
    const { startWeek } = weekCalculations;
    const weekNumber = startWeek + weekIdx - 1;
    const rawDate = getDateFromWeek(year, weekNumber, 1);
    rawDate.setHours(12, 0, 0, 0);
    const monday = ensureMonday(rawDate);
    setCurrentWeek(monday);
    setIsWeekDropdownOpen(false);
    return getDefaultDayIndexForWeek(monday);
  };

  return {
    year,
    quarter,
    currentWeek,
    weekCalculations,
    isWeekDropdownOpen,
    setIsWeekDropdownOpen,
    getDefaultDayIndexForWeek,
    goPrevWeek,
    goNextWeek,
    handleSelectWeek
  };
}

// Import getWeekDates and getLocalDateString functions
import { getWeekDates, getLocalDateString } from '@/lib/dateUtils';
