import ComponentCard from '@/components/common/ComponentCard';
import Button from '@/components/ui/button/Button';
import Spinner from '@/components/ui/spinner/Spinner';
import type { Quest, RankedQuest } from "../hooks";
import QuestInput from './QuestInput';

interface QuestInputSectionProps {
  quests: Quest[];
  ranking: RankedQuest[] | null;
  highlightEmpty: boolean;
  onQuestChange: (idx: number, value: string) => void;
  onSave: () => void;
  onShowHistory: () => void;
  hasQuestHistory: boolean;
  isLoadingHistory?: boolean;
  importedQuests?: Set<number>;
  onEditToggle?: (idx: number) => void;
  editingQuests?: Set<number>;
  isSaving?: boolean;
  hasNewInputs?: boolean;
  hasAnyInputs?: boolean;
  hasUnsavedChanges?: boolean;
}

export default function QuestInputSection({ 
  quests, 
  ranking, 
  highlightEmpty, 
  onQuestChange, 
  onSave, 
  onShowHistory, 
  hasQuestHistory,
  isLoadingHistory = false,
  importedQuests = new Set(),
  onEditToggle,
  editingQuests = new Set(),
  isSaving = false,
  hasNewInputs = false,
  hasAnyInputs = false,
  hasUnsavedChanges = false
}: QuestInputSectionProps) {
  return (
    <div className="w-full md:w-1/3 md:border-r border-gray-200 dark:border-gray-700 pb-6 md:pb-8 flex flex-col justify-between">
      <ComponentCard className="text-center !shadow-none !bg-transparent !rounded-none !border-0 p-0" title="INPUT 10 QUESTS" classNameTitle="text-xl font-semibold text-gray-900 mt-4 dark:text-white">
        <div className="space-y-5">
          {quests.map((quest, idx) => (
            <QuestInput
              key={quest.label}
              quest={quest}
              idx={idx}
              ranking={ranking}
              highlightEmpty={highlightEmpty}
              onQuestChange={onQuestChange}
              isImported={importedQuests.has(idx)}
              onEditToggle={onEditToggle}
              isEditing={editingQuests.has(idx)}
            />
          ))}
        </div>
      </ComponentCard>
      
      <div className={`grid ml-10 mr-6 gap-2 ${hasQuestHistory ? 'grid-cols-3' : 'grid-cols-1'}`}>
        {/* Quest History Button */}
        {isLoadingHistory ? (
          <div className="mx-10">
            <div className="w-full h-11 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse flex items-center justify-center">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
                <div className="w-32 h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        ) : hasQuestHistory ? (
            <Button
              type="button"
              size="md"
              variant="outline"
              onClick={onShowHistory}
              className="w-full col-span-1"
            >
              📋 Load
            </Button>
        ) : null}
      
        <Button
          type="button"
          size="md"
          variant="primary"
          onClick={onSave}
          className="w-full col-span-2"
          disabled={isSaving || !hasNewInputs}
        >
          {isSaving ? (
            <div className="flex items-center justify-center space-x-2">
              <Spinner size={16} />
              <span>Saving...</span>
            </div>
          ) : (
            'Save'
          )}
        </Button>
      </div>
    </div>
  );
}
