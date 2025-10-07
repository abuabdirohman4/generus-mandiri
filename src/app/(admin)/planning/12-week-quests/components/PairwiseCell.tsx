import Button from '@/components/ui/button/Button';
import type { Quest } from "../hooks";

interface PairwiseCellProps {
  rowQ: Quest;
  colQ: Quest;
  i: number;
  j: number;
  pairwiseResults: { [key: string]: string };
  onPairwiseClick: (row: number, col: number, winner: 'row' | 'col') => void;
}

export default function PairwiseCell({ 
  rowQ, 
  colQ, 
  i, 
  j, 
  pairwiseResults, 
  onPairwiseClick 
}: PairwiseCellProps) {
  if (i === j) {
    return <td className="border px-1 py-1 bg-gray-100 text-center" />;
  }
  if (i < j) {
    const key = `${rowQ.label}-${colQ.label}`;
    const winner = pairwiseResults[key];
    const canCompare = rowQ.title.trim() && colQ.title.trim();
    
    return (
      <td className="border px-1 py-1 text-center">
        {winner ? (
          <span className="font-bold text-[16px] text-brand-400">{winner}</span>
        ) : canCompare ? (
          <div className="flex gap-1 justify-center">
            <Button
              type="button"
              size="xs"
              variant="outline"
              className="!rounded bg-brand-100 hover:bg-brand-200 text-brand-700 text-xs font-semibold border border-brand-200"
              onClick={() => onPairwiseClick(i, j, 'row')}
            >
              {rowQ.label}
            </Button>
            <Button
              type="button"
              size="xs"
              variant="outline"
              className="!rounded bg-brand-100 hover:bg-brand-200 text-brand-700 text-xs font-semibold border border-brand-200"
              onClick={() => onPairwiseClick(i, j, 'col')}
            >
              {colQ.label}
            </Button>
          </div>
        ) : (
          <span className="text-gray-400 text-xs">-</span>
        )}
      </td>
    );
  }
  return <td className="border px-1 py-1 bg-gray-100 text-center" />;
}
