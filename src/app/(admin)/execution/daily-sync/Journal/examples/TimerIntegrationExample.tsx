'use client';

import React from 'react';
import OneMinuteJournalModal from '../OneMinuteJournalModal';
import { useJournal } from '../hooks/useJournal';

// Example component showing how to integrate journal modal with timer completion
const TimerIntegrationExample: React.FC = () => {
  const {
    isJournalModalOpen,
    pendingActivityData,
    openJournalModal,
    closeJournalModal,
    saveJournal,
    isRetrying,
    retryCount,
  } = useJournal();

  // Example function to be called when timer completes
  const handleTimerComplete = (timerData: {
    taskId: string;
    startTime: string;
    endTime: string;
    taskTitle?: string;
    duration: number;
  }) => {
    // Open journal modal after timer completion
    openJournalModal({
      ...timerData,
      date: new Date().toISOString().split('T')[0], // Today's date
    });
  };

  // Example usage in a timer component
  const simulateTimerCompletion = () => {
    const now = new Date();
    const startTime = new Date(now.getTime() - 25 * 60 * 1000); // 25 minutes ago
    
    handleTimerComplete({
      taskId: 'example-task-id',
      startTime: startTime.toISOString(),
      endTime: now.toISOString(),
      taskTitle: 'Example Task',
      duration: 25,
    });
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Timer Integration Example</h2>
      
      <button 
        onClick={simulateTimerCompletion}
        className="btn btn-primary"
      >
        Simulate Timer Completion
      </button>

      {/* Journal Modal */}
      <OneMinuteJournalModal
        isOpen={isJournalModalOpen}
        onClose={closeJournalModal}
        onSave={async (whatDone: string, whatThink: string) => {
          await saveJournal({ whatDone, whatThink });
        }}
        taskTitle={pendingActivityData?.taskTitle}
        duration={pendingActivityData?.duration || 0}
        isRetrying={isRetrying}
        retryCount={retryCount}
      />
    </div>
  );
};

export default TimerIntegrationExample;
