"use client";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

// Helper: get week of year (ISO week)
function getWeekOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 1);
  const diff = (date.getTime() - start.getTime()) / 86400000;
  const day = start.getDay() || 7;
  return Math.ceil((diff + day) / 7);
}

// Helper: get date from week number and day of week (0 = Sunday, 1 = Monday, etc.)
function getDateFromWeek(year: number, week: number, dayOfWeek: number = 1): Date {
  // Get January 1st of the year
  const jan1 = new Date(year, 0, 1);
  
  // Find the first Monday of the year
  const firstMonday = new Date(jan1);
  const dayOfJan1 = jan1.getDay();
  const daysToAdd = dayOfJan1 === 0 ? 1 : (8 - dayOfJan1); // 0 = Sunday, so we need Monday (1)
  firstMonday.setDate(jan1.getDate() + daysToAdd);
  
  // Calculate the target date
  const targetDate = new Date(firstMonday);
  targetDate.setDate(firstMonday.getDate() + (week - 1) * 7 + (dayOfWeek - 1));
  
  return targetDate;
}

// Helper: parse q param (e.g. 2025-Q2)
function parseQParam(q: string | null): { year: number; quarter: number } {
  if (!q) {
    const now = new Date();
    const week = getWeekOfYear(now);
    let quarter = 1;
    if (week >= 1 && week <= 13) quarter = 1;
    else if (week >= 14 && week <= 26) quarter = 2;
    else if (week >= 27 && week <= 39) quarter = 3;
    else quarter = 4;
    return { year: now.getFullYear(), quarter };
  }
  const match = q.match(/(\d{4})-Q([1-4])/);
  if (match) {
    return { year: parseInt(match[1]), quarter: parseInt(match[2]) };
  }
  // fallback
  const now = new Date();
  const week = getWeekOfYear(now);
  let quarter = 1;
  if (week >= 1 && week <= 13) quarter = 1;
  else if (week >= 14 && week <= 26) quarter = 2;
  else if (week >= 27 && week <= 39) quarter = 3;
  else quarter = 4;
  return { year: now.getFullYear(), quarter };
}

export interface QuarterData {
  year: number;
  quarter: number;
  quarterString: string; // e.g., "Q2 2025"
  startDate: Date;
  endDate: Date;
  isCurrentQuarter: boolean;
  weekRange: string; // e.g., "Week 14-26"
}

export function useQuarter(): QuarterData {
  const searchParams = useSearchParams();
  const qParam = searchParams.get("q");
  
  return useMemo(() => {
    const { year, quarter } = parseQParam(qParam);
    
    // Calculate quarter week ranges
    let startWeek: number;
    let endWeek: number;
    
    switch (quarter) {
      case 1:
        startWeek = 1;
        endWeek = 13;
        break;
      case 2:
        startWeek = 14;
        endWeek = 26;
        break;
      case 3:
        startWeek = 27;
        endWeek = 39;
        break;
      case 4:
        startWeek = 40;
        endWeek = 52;
        break;
      default:
        startWeek = 1;
        endWeek = 13;
    }
    
    // Calculate start date (Monday of start week)
    const startDate = getDateFromWeek(year, startWeek, 1); // 1 = Monday
    
    // Calculate end date (Sunday of end week)
    const endDate = getDateFromWeek(year, endWeek, 7); // 7 = Sunday
    
    // Check if this is current quarter
    const currentQuarter = parseQParam(null);
    const isCurrentQuarter = currentQuarter.year === year && currentQuarter.quarter === quarter;
    
    return {
      year,
      quarter,
      quarterString: `Q${quarter} ${year}`,
      startDate,
      endDate,
      isCurrentQuarter,
      weekRange: `Week ${startWeek}-${endWeek}`
    };
  }, [qParam]);
} 