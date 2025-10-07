import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface QuarterState {
  year: number;
  quarter: number;
  setQuarter: (year: number, quarter: number) => void;
  getQuarterString: () => string;
}

export const useQuarterStore = create<QuarterState>()(
  persist(
    (set, get) => ({
      year: new Date().getFullYear(),
      quarter: Math.ceil((new Date().getMonth() + 1) / 3), // Current quarter
      
      setQuarter: (year: number, quarter: number) => {
        set({ year, quarter });
      },
      
      getQuarterString: () => {
        const { year, quarter } = get();
        return `Q${quarter} ${year}`;
      },
    }),
    {
      name: 'quarter-storage', // localStorage key
    }
  )
);
