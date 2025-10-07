import { useState, useEffect } from 'react';

import ComponentCard from '@/components/common/ComponentCard';
import Button from '@/components/ui/button/Button';

import { updateQuestMotivation } from './actions/questActions';

import Milestone from './Milestone';
import SubTask from './SubTask';
import QuestProgressBar from './Quest/components/QuestProgressBar';
import { useMilestones } from './hooks/useMainQuestsSWR';

interface Task {
  id: string;
  title: string;
  status: 'TODO' | 'DONE';
}

interface QuestProps {
  id: string;
  title: string;
  motivation?: string;
}

export default function Quest({ quest, showCompletedTasks }: { quest: QuestProps; showCompletedTasks: boolean }) {
  const [motivationValue, setMotivationValue] = useState(quest.motivation || '');
  const [activeSubTask, setActiveSubTask] = useState<Task | null>(null);
  const [showSubTask, setShowSubTask] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  const hasExistingContent = !!quest.motivation;
  const canSave = hasChanges && !isSaving;

  const handleEditChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setMotivationValue(newValue);
    setHasChanges(newValue.trim() !== (quest.motivation || '').trim());
  };

  const handleSaveMotivation = async () => {
    if (motivationValue.trim() === (quest.motivation || '').trim()) {
      setHasChanges(false);
      return; // No changes
    }
    
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      await updateQuestMotivation(quest.id, motivationValue);
      setHasChanges(false);
    } catch (error) {
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Check for Cmd + Enter (Mac) or Ctrl + Enter (Windows/Linux)
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      // Only allow save if button is not disabled
      if (canSave) {
        handleSaveMotivation();
      }
    }
  };

  // Handle SubTask opening/closing with smooth animation
  useEffect(() => {
    if (activeSubTask) {
      // Delay showing content to allow container animation to start
      const timer = setTimeout(() => {
        setShowSubTask(true);
      }, 50);
      return () => clearTimeout(timer);
    } else {
      // Hide content immediately when closing
      setShowSubTask(false);
    }
  }, [activeSubTask]);

  return (
    <div className={`flex flex-col lg:flex-row gap-4 transition-all duration-300 ease-in ${
      !activeSubTask ? 'justify-center' : ''
    }`}>
      <div className={`flex-1 max-w-2xl w-full transition-all duration-300 ease-in ${
        !activeSubTask 
          ? 'mx-auto transform translate-x-0' 
          : 'mx-auto lg:mx-0 lg:transform lg:translate-x-0'
      }`}>
        <ComponentCard title={quest.title} className='' classNameTitle='text-center text-xl !font-extrabold' classNameHeader="pb-0">
          {/* Quest Progress Bar */}
          <QuestProgressBar questId={quest.id}/>
          
          <label className='block mb-2 font-semibold'>Motivasi terbesar saya untuk mencapai Goal ini :</label>
          <textarea
            className="border rounded mb-0 px-2 py-1 text-sm w-full"
            value={motivationValue}
            onChange={handleEditChange}
            onKeyDown={handleKeyDown}
            rows={3}
          />
          <div className="flex justify-end mb-3">
            <Button
              onClick={handleSaveMotivation}
              disabled={!canSave}
              size="xs"
              variant="primary"
              className="disabled:bg-gray-300"
            >
              {isSaving ? (
                <>
                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  {hasExistingContent ? 'Editing...' : 'Saving...'}
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {hasExistingContent ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    )}
                  </svg>
                  {hasExistingContent ? 'Edit' : 'Save'}
                </>
              )}
            </Button>
          </div>
          <Milestone 
            questId={quest.id}
            activeSubTask={activeSubTask}
            onOpenSubtask={setActiveSubTask}
            showCompletedTasks={showCompletedTasks}
          />
        </ComponentCard>
      </div>
      <div className={`transition-all duration-300 ease-out ${
        activeSubTask 
          ? 'flex-1 max-w-2xl w-full mx-auto lg:mx-0 opacity-100 translate-x-0' 
          : 'w-0 opacity-0 translate-x-4 overflow-hidden pointer-events-none'
      }`}>
        {showSubTask && activeSubTask && (
          <SubTask
            task={activeSubTask}
            onBack={() => setActiveSubTask(null)}
            milestoneId=""
            showCompletedTasks={showCompletedTasks}
          />
        )}
      </div>
    </div>
  );
} 