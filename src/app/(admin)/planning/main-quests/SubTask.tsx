import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import debounce from 'lodash/debounce';
import ComponentCard from '@/components/common/ComponentCard';
import { toast } from 'sonner';
import { addTask } from './actions/taskActions';
import { useSubtasks } from './hooks/useMainQuestsSWR';
import { useSubtaskState } from './SubTask/hooks/useSubtaskState';
import { useSubtaskCRUD } from './SubTask/hooks/useSubtaskCRUD';
import { useSubtaskOperations } from './SubTask/hooks/useSubtaskOperations';
import SubtaskList from './SubTask/components/SubtaskList';

interface Subtask {
  id: string;
  title: string;
  status: 'TODO' | 'DONE';
  display_order: number;
}

// Custom hook for new subtask management
function useNewSubtaskManagement(taskId: string, milestoneId: string, subtasks: Subtask[], fetchSubtasks: () => void) {
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskLoading, setNewSubtaskLoading] = useState(false);

  const debouncedInsertNewSubtask = useMemo(() => debounce(async (title: string) => {
    if (!title) return;
    setNewSubtaskLoading(true);
    let newOrder = 1.0;
    if (subtasks.length > 0) {
      const lastOrder = subtasks[subtasks.length - 1].display_order;
      newOrder = lastOrder + 1.0;
    }
    try {
      const formData = new FormData();
      formData.append('parent_task_id', taskId);
      formData.append('title', title);
      formData.append('milestone_id', milestoneId);
      formData.append('display_order', String(newOrder));
      const res = await addTask(formData);
      if (res && res.task) {
        setNewSubtaskTitle('');
        fetchSubtasks();
        toast.success(res.message || 'Sub-tugas berhasil ditambahkan');
      } else {
        toast.error('Gagal menambah sub-tugas');
      }
    } catch {
      toast.error('Gagal menambah sub-tugas');
    } finally {
      setNewSubtaskLoading(false);
    }
  }, 500), [taskId, milestoneId, fetchSubtasks]); // 🔧 FIX: Remove subtasks dependency to prevent recreation

  useEffect(() => {
    if (newSubtaskTitle) debouncedInsertNewSubtask(newSubtaskTitle);
  }, [newSubtaskTitle, debouncedInsertNewSubtask]);

  const handleBulkPasteEmpty = async (e: React.ClipboardEvent, handleSubtaskEnter: (idx: number, title?: string, subtasksOverride?: Subtask[]) => Promise<{ newIndex: number | null; newSubtaskId?: string } | null>) => {
    const pastedText = e.clipboardData.getData('text');
    const lines = pastedText.split('\n').filter(line => line.trim());
    
    if (lines.length <= 1) return;
    
    e.preventDefault();
    
    setNewSubtaskTitle(lines[0]);
    
    const localSubtasks = subtasks.map(st => ({ ...st }));
    for (let i = 1; i < lines.length; i++) {
      const idx = localSubtasks.length - 1;
      const result = await handleSubtaskEnter(idx, lines[i], localSubtasks);
      if (result && result.newIndex !== null) {
        localSubtasks.push({
          id: `dummy-${i}`,
          title: lines[i],
          status: 'TODO' as const,
          display_order: result.newIndex,
        });
      }
    }
  };

  return {
    newSubtaskTitle,
    setNewSubtaskTitle,
    newSubtaskLoading,
    handleBulkPasteEmpty
  };
}

export default function SubTask({ task, onBack, milestoneId, showCompletedTasks }: { task: { id: string; title: string; status: 'TODO' | 'DONE' }; onBack: () => void; milestoneId: string; showCompletedTasks: boolean; }) {
  const { subtasks, isLoading: loadingSubtasks, mutate: refetchSubtasks } = useSubtasks(task.id);
  
  // 🔧 FIX: Use subtasks directly instead of localSubtasks to avoid infinite loop
  const displaySubtasks = subtasks || [];

  // For now, keep the old state management for subtask editing
  // TODO: Migrate subtask editing to use SWR and RPC
  const { focusSubtaskId, setFocusSubtaskId, draftTitles, setDraftTitles } = useSubtaskState();
  
  // 🔧 FIX: Create stable wrapper function for refetchSubtasks
  const handleRefetchSubtasks = useCallback(() => {
    refetchSubtasks();
  }, [refetchSubtasks]);

  // 🔧 FIX: Memoize displaySubtasks to prevent unnecessary re-renders
  const stableDisplaySubtasks = useMemo(() => displaySubtasks, [displaySubtasks]);

  // 🔧 FIX: Use refetchSubtasks to refresh data after CRUD operations
  const { handleSubtaskEnter, handleCheck, handleDeleteSubtask: handleDeleteSubtaskCRUD } = useSubtaskCRUD(task.id, milestoneId, stableDisplaySubtasks, handleRefetchSubtasks);
  const { handleDraftTitleChange, handleDeleteSubtask, handleDragEnd, handleSubtaskEnterWithFocus } = useSubtaskOperations(
    task.id, 
    milestoneId, 
    stableDisplaySubtasks, 
    handleRefetchSubtasks, // 🔧 FIX: Use refetchSubtasks to refresh data after operations
    draftTitles, 
    setDraftTitles, 
    focusSubtaskId, 
    setFocusSubtaskId, 
    handleSubtaskEnter, 
    handleCheck, 
    handleDeleteSubtaskCRUD
  );
  const { newSubtaskTitle, setNewSubtaskTitle, newSubtaskLoading, handleBulkPasteEmpty } = useNewSubtaskManagement(task.id, milestoneId, stableDisplaySubtasks, refetchSubtasks);

  // 🔧 FIX: Only reset state when task.id actually changes, not on every render
  const prevTaskId = useRef<string | null>(null);
  useEffect(() => {
    if (prevTaskId.current !== task.id) {
      setDraftTitles({});
      setFocusSubtaskId(null);
      setNewSubtaskTitle('');
      prevTaskId.current = task.id;
    }
  }, [task.id, setDraftTitles, setFocusSubtaskId, setNewSubtaskTitle]);

  const handleBulkPasteEmptyWrapper = (e: React.ClipboardEvent) => {
    handleBulkPasteEmpty(e, handleSubtaskEnter);
  };

  // Filter subtasks based on showCompletedTasks state
  const filteredSubtasks = showCompletedTasks 
    ? displaySubtasks 
    : displaySubtasks.filter((subtask: any) => subtask.status !== 'DONE');

  // 🔧 FIX: Create a function to get original index for filtered subtasks
  const getOriginalIndex = (subtask: any) => {
    return displaySubtasks.findIndex(st => st.id === subtask.id);
  };

  return (
    <div className="flex-1 mx-auto">
      <ComponentCard 
        title={task.title} 
        className='' 
        classNameTitle='text-center text-xl !font-extrabold' 
        classNameHeader="pb-0"
        onClose={onBack}
      >
        <SubtaskList
          subtasks={filteredSubtasks}
          loadingSubtasks={loadingSubtasks}
          newSubtaskTitle={newSubtaskTitle}
          setNewSubtaskTitle={setNewSubtaskTitle}
          newSubtaskLoading={newSubtaskLoading}
          handleBulkPasteEmpty={handleBulkPasteEmptyWrapper}
          handleSubtaskEnter={async (idx: number, title?: string) => {
            // 🔧 FIX: Handle out of bounds case
            if (idx >= filteredSubtasks.length) {
              // If idx is out of bounds, insert at the end
              const lastSubtask = filteredSubtasks[filteredSubtasks.length - 1];
              const originalIdx = getOriginalIndex(lastSubtask) + 1;
              const result = await handleSubtaskEnter(originalIdx, title);
              
              // 🔧 FIX: Focus on the newly created subtask
              if (result && result.newSubtaskId) {
                setFocusSubtaskId(result.newSubtaskId);
              }
              return result;
            }
            
            // Normal case: convert filtered index to original index
            const subtask = filteredSubtasks[idx];
            if (!subtask) {
              return Promise.resolve(null);
            }
            
            const originalIdx = getOriginalIndex(subtask);
            const result = await handleSubtaskEnter(originalIdx, title);
            
            // 🔧 FIX: Focus on the newly created subtask
            if (result && result.newSubtaskId) {
              setFocusSubtaskId(result.newSubtaskId);
            }
            return result;
          }}
          handleSubtaskEnterWithOverride={handleSubtaskEnterWithFocus}
          handleCheck={handleCheck}
          focusSubtaskId={focusSubtaskId}
          setFocusSubtaskId={setFocusSubtaskId}
          draftTitles={draftTitles}
          handleDraftTitleChange={handleDraftTitleChange}
          handleDeleteSubtask={handleDeleteSubtask}
          handleDragEnd={handleDragEnd}
        />
      </ComponentCard>
    </div>
  );
}
