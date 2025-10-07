// Helper: get planning year start date (Monday of the week containing January 1st)
function getPlanningYearStartDate(year: number): Date {
  const janFirst = new Date(year, 0, 1);
  const dayOfWeekJan1 = janFirst.getDay();
  const daysToSubtract = dayOfWeekJan1 === 0 ? 6 : dayOfWeekJan1 - 1;
  
  const planningYearStartDate = new Date(janFirst);
  planningYearStartDate.setDate(janFirst.getDate() - daysToSubtract);
  
  return planningYearStartDate;
}

// Helper: get quarter from week number
export function getQuarterFromWeek(week: number): number {
  if (week >= 1 && week <= 13) return 1;
  if (week >= 14 && week <= 26) return 2;
  if (week >= 27 && week <= 39) return 3;
  return 4;
}

// Helper: get week of year (menggunakan logika yang sama dengan getDateFromWeek & getQuarterDates)
export function getWeekOfYear(date: Date): number {
  const year = date.getFullYear();
  const planningYearStartDate = getPlanningYearStartDate(year);

  // Hitung berapa minggu dari planningYearStartDate ke tanggal target
  const diffInDays = (date.getTime() - planningYearStartDate.getTime()) / 86400000;
  const weekNumber = Math.floor(diffInDays / 7) + 1;
  
  return Math.max(1, weekNumber);
}

// Helper: get date from week number and day of week (1 = Monday, 2 = Tuesday, etc.)
export function getDateFromWeek(year: number, week: number, dayOfWeek: number = 1): Date {
  const planningYearStartDate = getPlanningYearStartDate(year);

  // Hitung tanggal target berdasarkan week number dan day of week
  // week - 1 karena week 1 dimulai dari planningYearStartDate
  // dayOfWeek - 1 karena dayOfWeek 1 = Senin, jadi offset 0 hari dari Senin
  const targetDate = new Date(planningYearStartDate);
  targetDate.setDate(planningYearStartDate.getDate() + (week - 1) * 7 + (dayOfWeek - 1));
  
  return targetDate;
}

// Helper: parse q param (e.g. 2025-Q2)
export function parseQParam(q: string | null): { year: number; quarter: number } {
  if (!q) {
    const now = new Date();
    const week = getWeekOfYear(now);
    const quarter = getQuarterFromWeek(week);
    return { year: now.getFullYear(), quarter };
  }
  
  const match = q.match(/(\d{4})-Q([1-4])/);
  if (match) {
    return { year: parseInt(match[1]), quarter: parseInt(match[2]) };
  }
  
  // fallback
  const now = new Date();
  const week = getWeekOfYear(now);
  const quarter = getQuarterFromWeek(week);
  return { year: now.getFullYear(), quarter };
}

export function formatQParam(year: number, quarter: number): string {
  return `${year}-Q${quarter}`;
}

// Get previous quarter
export function getPrevQuarter(year: number, quarter: number): { year: number; quarter: number } {
  if (quarter === 1) return { year: year - 1, quarter: 4 };
  return { year, quarter: quarter - 1 };
}

// Get next quarter
export function getNextQuarter(year: number, quarter: number): { year: number; quarter: number } {
  if (quarter === 4) return { year: year + 1, quarter: 1 };
  return { year, quarter: quarter + 1 };
}

// Get quarter week range
export function getQuarterWeekRange(year: number, quarter: number): { startWeek: number; endWeek: number } {
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
  
  return { startWeek, endWeek };
}

// Get quarter dates (Monday to Sunday)
/**
 * Mendapatkan tanggal mulai dan selesai untuk kuartal tertentu dalam setahun,
 * berdasarkan sistem 13 minggu per kuartal.
 * Tahun perencanaan dimulai pada hari Senin di minggu yang sama dengan 1 Januari.
 */
export const getQuarterDates = (year: number, quarter: number): { startDate: Date; endDate: Date } => {
  const planningYearStartDate = getPlanningYearStartDate(year);

  // Hitung tanggal mulai kuartal yang diminta.
  // Setiap kuartal adalah 13 minggu * 7 hari = 91 hari.
  const daysToAdd = (quarter - 1) * 91;
  const quarterStartDate = new Date(planningYearStartDate);
  quarterStartDate.setDate(planningYearStartDate.getDate() + daysToAdd);

  // Hitung tanggal akhir kuartal.
  const quarterEndDate = new Date(quarterStartDate);
  quarterEndDate.setDate(quarterStartDate.getDate() + 90); // 91 hari total, jadi tambah 90 hari dari tanggal mulai.

  return { startDate: quarterStartDate, endDate: quarterEndDate };
};

// Check if quarter is current
export function isCurrentQuarter(year: number, quarter: number): boolean {
  const currentQuarter = parseQParam(null);
  return currentQuarter.year === year && currentQuarter.quarter === quarter;
}

// Get quarter string
export function getQuarterString(year: number, quarter: number): string {
  return `Q${quarter} ${year}`;
}

// Get quarter display info
export function getQuarterInfo(year: number, quarter: number) {
  const { startDate, endDate } = getQuarterDates(year, quarter);
  const { startWeek, endWeek } = getQuarterWeekRange(year, quarter);
  
  return {
    year,
    quarter,
    quarterString: getQuarterString(year, quarter),
    startDate,
    endDate,
    weekRange: `Week ${startWeek}-${endWeek}`,
    isCurrentQuarter: isCurrentQuarter(year, quarter)
  };
}

// Generate quarter options for selector (2 prev, current, 1 next year)
export function generateQuarterOptions(current: { year: number; quarter: number }) {
  const options: { year: number; quarter: number }[] = [];
  const startYear = current.year - 2;
  for (let y = startYear; y <= current.year + 1; y++) {
    for (let q = 1; q <= 4; q++) {
      options.push({ year: y, quarter: q });
    }
  }
  // Sort descending (latest first)
  return options.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.quarter - a.quarter;
  });
}