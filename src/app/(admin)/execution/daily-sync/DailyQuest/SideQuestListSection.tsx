import { useState, useTransition, useRef, useEffect, FormEvent } from 'react';
import TaskItemCard from './components/TaskItemCard';
import SideQuestModal from './components/SideQuestModal';
import { TaskColumnProps } from './types';
import { SideQuestFormProps } from './types';
import { EyeIcon, EyeCloseIcon } from '@/lib/icons';
import { useUIPreferencesStore } from '@/stores/uiPreferencesStore';
import { isMac, isModifierKeyPressed, isDesktop } from '@/lib/utils';
import { SideQuest } from '@/app/(admin)/quests/side-quests/types';

// SideQuestForm component (merged from SideQuestForm.tsx)
const SideQuestForm = ({ onSubmit, onCancel }: SideQuestFormProps) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Keyboard shortcut handler for Cmd+Enter (Mac) and Ctrl+Enter (Windows/Linux) - Desktop only
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle keyboard shortcuts on desktop
      if (!isDesktop()) return;
      
      // Check if the target is our input field
      if (document.activeElement !== inputRef.current) return;
      
      // Check for Enter key
      if (event.key === 'Enter') {
        // Check for Cmd key on Mac or Ctrl key on Windows/Linux
        if (isModifierKeyPressed(event)) {
          event.preventDefault();
          
          // Only submit if there's content and not pending
          if (newTaskTitle.trim() && !isPending) {
            handleSubmit(event as any);
          }
        }
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [newTaskTitle, isPending]);

  const handleSubmit = (e: FormEvent<HTMLFormElement> | KeyboardEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    
    startTransition(async () => {
      await onSubmit(newTaskTitle);
      setNewTaskTitle('');
    });
  };

  // Detect if user is on Mac for keyboard shortcut hint
  const isMacUser = isMac();

  return (
    <form onSubmit={handleSubmit} className="mb-4">
      <div className="flex space-x-2">
        <input
          ref={inputRef}
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          placeholder="Masukkan judul side quest..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
          disabled={isPending}
        />
        <button
          type="submit"
          disabled={!newTaskTitle.trim() || isPending}
          className="px-4 py-2 bg-brand-500 text-white rounded-md hover:bg-brand-600 disabled:opacity-50"
        >
          {isPending ? 'Adding...' : 'Add'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
      {/* Keyboard shortcut hint - Desktop only */}
      <div className="hidden md:block mt-2 text-xs text-gray-500 dark:text-gray-400">
        Tekan <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">
          {isMacUser ? '⌘' : 'Ctrl'}
        </kbd> + <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">
          Enter
        </kbd> untuk submit cepat.
      </div>
    </form>
  );
};

// Main SideQuestListSection component
const SideQuestListSection = ({ 
  title, 
  items, 
  onStatusChange, 
  onAddSideQuest, 
  onSelectTasks, 
  onSetActiveTask, 
  selectedDate, 
  onTargetChange, 
  onFocusDurationChange, 
  completedSessions, 
  refreshSessionKey, 
  forceRefreshTaskId, 
  showAddQuestButton 
}: TaskColumnProps) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showSideQuestModal, setShowSideQuestModal] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const {showCompletedSideQuest, toggleShowCompletedSideQuest} = useUIPreferencesStore();

  // Filter items based on showCompletedSideQuest state
  const filteredItems = showCompletedSideQuest 
    ? items 
    : items.filter(item => item.status !== 'DONE');

  const handleAddSideQuest = (title: string) => {
    if (onAddSideQuest) {
      onAddSideQuest(title);
      setShowAddForm(false);
    }
  };

  const handleSelectSideQuests = async (selectedQuests: SideQuest[]) => {
    try {
      // Format selected quests for daily plan
      const formattedQuests = selectedQuests.map(quest => ({
        item_id: quest.id,
        item_type: 'SIDE_QUEST'
      }));

      // Call onSelectTasks to save to daily_plan_items
      if (onSelectTasks) {
        await onSelectTasks(formattedQuests);
      }

      setShowSideQuestModal(false);
    } catch (error) {
      console.error('Error saving side quest selections:', error);
    }
  };

  // Calculate completed today count
  const completedTodayCount = items.filter(item => item.status === 'DONE').length;
  
  // Get existing side quest IDs for today
  const existingSideQuestIds = items
    .filter(item => item.item_type === 'SIDE_QUEST')
    .map(item => item.item_id);

  return (
    <div className="rounded-lg h-fit">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">{title}</h3>
        
        {/* Toggle Show/Hide Completed Button */}
        <div className="relative mr-8" onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}>
          <button
            onClick={toggleShowCompletedSideQuest}
            className="mt-0.5 p-1.25 text-gray-500 rounded rounded-full hover:text-gray-900 hover:shadow-md transition-colors"
          >
            {showCompletedSideQuest ? (
              <EyeIcon className="w-5 h-5" />
            ) : (
              <EyeCloseIcon className="w-5 h-5" />
            )}
          </button>
          
          {/* Custom Tooltip with Arrow */}
          {/* {isHovering && (
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-0 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap z-20 shadow-lg">
              {showCompletedTasks ? 'Hide completed' : 'Show completed'}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-gray-800"></div>
            </div>
          )} */}
        </div>
      </div>

      <div className="space-y-3">
        {filteredItems.map((item) => (
          <TaskItemCard
            key={item.id}
            item={item}
            onStatusChange={onStatusChange}
            onSetActiveTask={onSetActiveTask}
            selectedDate={selectedDate}
            onTargetChange={onTargetChange}
            onFocusDurationChange={onFocusDurationChange}
            completedSessions={completedSessions}
            refreshKey={refreshSessionKey?.[item.id]}
            forceRefreshTaskId={forceRefreshTaskId}
          />
        ))}

        {filteredItems.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400">
            <p className="mb-6 py-8">
              {showCompletedSideQuest 
                ? 'Tidak ada side quest hari ini' 
                : 'Tidak ada side quest yang belum selesai'
              }
            </p>
          </div>
        ) : null}

        {showAddForm && onAddSideQuest ? (
          <SideQuestForm
            onSubmit={handleAddSideQuest}
            onCancel={() => setShowAddForm(false)}
          />
        ) : null}
        
        {/* Tombol Add Quest di dalam card Side Quest - hanya muncul jika ada task */}
        {onAddSideQuest ? (
          <div className="grid grid-cols-4 mt-6 gap-2">
            <button 
              className="col-span-3 px-4 py-2 bg-brand-500 text-white font-medium rounded-lg hover:bg-brand-600 transition-colors text-sm"
              onClick={() => setShowSideQuestModal(true)}
            >
              Select Quest
            </button>
            <button 
              className="col-span-1 px-4 py-2 bg-brand-500 text-white font-medium rounded-lg hover:bg-brand-600 transition-colors text-sm"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              Add
            </button>
          </div>
        ) : null}
      </div>

      {/* Side Quest Modal */}
      <SideQuestModal
        isOpen={showSideQuestModal}
        onClose={() => setShowSideQuestModal(false)}
        onSave={handleSelectSideQuests}
        selectedCount={existingSideQuestIds.length}
        completedTodayCount={completedTodayCount}
        existingSideQuests={existingSideQuestIds}
      />
    </div>
  );
};

export default SideQuestListSection;
