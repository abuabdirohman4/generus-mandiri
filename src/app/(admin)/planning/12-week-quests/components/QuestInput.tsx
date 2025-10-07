import type { Quest, RankedQuest } from "../hooks";

interface QuestInputProps {
  quest: Quest;
  idx: number;
  ranking: RankedQuest[] | null;
  highlightEmpty: boolean;
  onQuestChange: (idx: number, value: string) => void;
  isImported?: boolean;
  onEditToggle?: (idx: number) => void;
  isEditing?: boolean;
}

export default function QuestInput({ 
  quest, 
  idx, 
  ranking, 
  highlightEmpty, 
  onQuestChange,
  isImported = false,
  onEditToggle,
  isEditing = false
}: QuestInputProps) {
  let rankIdx = -1;
  let score = 0;
  if (ranking) {
    const found = ranking.find((r) => r.label === quest.label);
    if (found) {
      rankIdx = ranking.indexOf(found);
      score = found.score;
    }
  }
  const highlight = rankIdx > -1 && rankIdx < 3 && score > 0;

  return (
    <div
      className={`flex items-center gap-2 pl-1 relative rounded transition-colors ${highlight ? 'bg-brand-100 border border-brand-400' : ''} ${isImported ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700' : ''}`}
    >
      <span className="w-6 text-right font-bold dark:text-white/90">{quest.label}.</span>
      
      <div className="flex-1 relative">
        <input
          className={`w-full h-11 rounded-lg border px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-3 focus:ring-brand-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800 ${highlightEmpty && !quest.title.trim() ? 'border-red-500 ring-2 ring-red-200' : ''} ${isImported ? 'pr-12' : ''}`}
          placeholder={`Quest ${idx+1}`}
          value={quest.title}
          onChange={e => onQuestChange(idx, e.target.value)}
          required
        />
        
        {/* Edit button for imported quests */}
        {isImported && onEditToggle && (
          <button
            type="button"
            onClick={() => onEditToggle(idx)}
            className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded transition-colors ${
              isEditing 
                ? 'text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300' 
                : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
            }`}
            title={isEditing ? "Selesai edit" : "Edit quest"}
          >
            {isEditing ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            )}
          </button>
        )}
      </div>
      
      <div className="absolute right-0 top-1/2 -translate-y-1/2 mr-2">
        {quest.title.trim() ? (
          <span className="inline-block min-w-[28px] px-2 py-0.5 rounded bg-gray-200 text-xs font-bold text-gray-700 border border-gray-300 text-center select-none">
            {score}
          </span>
        ) : (
          <span className="inline-block min-w-[28px] px-2 py-0.5 rounded bg-gray-100 text-xs text-gray-400 border border-gray-200 text-center select-none">
            -
          </span>
        )}
      </div>
    </div>
  );
}
