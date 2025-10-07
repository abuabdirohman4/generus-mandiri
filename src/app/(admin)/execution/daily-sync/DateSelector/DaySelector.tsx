import React, { useRef, useEffect } from 'react';
import { daysOfWeek } from '@/lib/dateUtils';

interface DaySelectorProps {
  weekDates: Date[];
  selectedDayIdx: number;
  setSelectedDayIdx: (idx: number) => void;
}

const DaySelector: React.FC<DaySelectorProps> = ({ 
  weekDates, 
  selectedDayIdx, 
  setSelectedDayIdx 
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to selected day when selectedDayIdx changes
  useEffect(() => {
    if (scrollContainerRef.current && selectedDayIdx >= 0) {
      const container = scrollContainerRef.current;
      const buttons = container.querySelectorAll('button');
      const selectedButton = buttons[selectedDayIdx] as HTMLElement;
      
      if (selectedButton) {
        const containerRect = container.getBoundingClientRect();
        const buttonRect = selectedButton.getBoundingClientRect();
        
        // Check if button is outside visible area
        const isButtonLeftOfVisible = buttonRect.left < containerRect.left;
        const isButtonRightOfVisible = buttonRect.right > containerRect.right;
        
        if (isButtonLeftOfVisible || isButtonRightOfVisible) {
          selectedButton.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center'
          });
        }
      }
    }
  }, [selectedDayIdx]);

  return (
    <div 
      ref={scrollContainerRef}
      className="flex items-center gap-2 overflow-x-auto scrollbar-hide"
    >
      {weekDates.map((date, idx) => (
        <button
          key={`day-${date.toISOString()}`}
          onClick={() => setSelectedDayIdx(idx)}
          className={`flex-shrink-0 w-20 min-w-[80px] px-2 py-2 rounded-lg border text-sm font-medium transition-all text-center ${selectedDayIdx === idx ? 'bg-brand-500 text-white border-brand-500' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-brand-100 dark:hover:bg-brand-900/30'}`}
        >
          <div className="flex flex-col items-center">
            <span className="text-xs font-semibold">{daysOfWeek[idx]}</span>
            <span className="text-xs mt-0.5">
              {date.getDate()}/{date.getMonth() + 1}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
};

export default DaySelector;
