export function formatDateIndo(date: Date): string {
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}


export const daysOfWeek: string[] = [
  "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"
];

export function getWeekDates(date: Date): Date[] {
  const d = new Date(date);
  let day = d.getDay();
  // Jika hari Minggu, treat as 7 (bukan 0)
  if (day === 0) day = 7;
  // Mundur ke Senin
  d.setDate(d.getDate() - (day - 1));
  d.setHours(12, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(d);
    day.setDate(d.getDate() + i);
    return day;
  });
}

export function getLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentLocalDate(): string {
  return new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format
}

export function formatTimeRange(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const pad = (n: number) => n.toString().padStart(2, '0');
  // Convert to local time
  const startLocal = s.toLocaleTimeString('id-ID', { 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: false,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });
  const endLocal = e.toLocaleTimeString('id-ID', { 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: false,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });
  return `${startLocal} - ${endLocal}`;
}