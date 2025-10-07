export interface WeekSelectorProps {
  displayWeek: number;
  totalWeeks: number;
  isWeekDropdownOpen: boolean;
  setIsWeekDropdownOpen: (value: boolean) => void;
  handleSelectWeek: (weekIdx: number) => void;
  goPrevWeek: () => void;
  goNextWeek: () => void;
}

export interface DaySelectorProps {
  weekDates: Date[];
  selectedDayIdx: number;
  setSelectedDayIdx: (idx: number) => void;
}
