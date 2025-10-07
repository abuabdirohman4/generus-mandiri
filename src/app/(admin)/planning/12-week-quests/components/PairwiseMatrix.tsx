import ComponentCard from '@/components/common/ComponentCard';
import type { Quest } from "../hooks";
import PairwiseCell from './PairwiseCell';

interface PairwiseMatrixProps {
  quests: Quest[];
  pairwiseResults: { [key: string]: string };
  onPairwiseClick: (row: number, col: number, winner: 'row' | 'col') => void;
  isExpanded: boolean;
  hasAnyComparisons?: boolean;
}

export default function PairwiseMatrix({ 
  quests, 
  pairwiseResults, 
  onPairwiseClick, 
  isExpanded,
  hasAnyComparisons = false
}: PairwiseMatrixProps) {
  return (
    <ComponentCard className="text-center !shadow-none !bg-transparent !rounded-none !border-0 p-0" title="HIGHEST FIRST" classNameTitle="text-xl font-semibold text-gray-900 mt-4 dark:text-white">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse border text-xs">
          <thead>
            <tr>
              <th className="border px-1 py-1 min-w-14 bg-gray-50" />
              {quests.map((q) => (
                <th key={q.label} className={`border px-1 py-1 min-w-14 bg-gray-50 font-bold`}>
                  {q.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {quests.map((rowQ, i) => (
              <tr key={rowQ.label}>
                <th
                  className={`border px-1 py-1 w-10 ${isExpanded ? 'h-[3.61rem]' : 'h-[3.71rem]'} bg-gray-50 font-bold text-center`}
                >
                  {rowQ.label}
                </th>
                {quests.map((colQ, j) => (
                  <PairwiseCell
                    key={colQ.label}
                    rowQ={rowQ}
                    colQ={colQ}
                    i={i}
                    j={j}
                    pairwiseResults={pairwiseResults}
                    onPairwiseClick={onPairwiseClick}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* No Comparisons Message */}
      {/* {!hasAnyComparisons && (
        <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-center space-x-2">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-gray-600 font-medium">
              Belum ada perbandingan yang dilakukan. Klik tombol A atau B untuk membandingkan quest.
            </span>
          </div>
        </div>
      )} */}
    </ComponentCard>
  );
}
