import { useMemo, useCallback } from 'react';
import { DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import debounce from 'lodash/debounce';
import { updateTask, updateTaskDisplayOrder, deleteTask } from '../../actions/taskActions';

interface Subtask {
  id: string;
  title: string;
  status: 'TODO' | 'DONE';
  display_order: number;
}

export function useSubtaskOperations(
  taskId: string,
  _milestoneId: string,
  subtasks: Subtask[],
  refetchSubtasks: () => void,
  draftTitles: Record<string, string>,
  setDraftTitles: React.Dispatch<React.SetStateAction<Record<string, string>>>,
  focusSubtaskId: string | null,
  setFocusSubtaskId: (id: string | null) => void,
  handleSubtaskEnter: (idx: number, title?: string, subtasksOverride?: Subtask[]) => Promise<{ newIndex: number | null; newSubtaskId?: string } | null>,
  handleCheck: (subtask: Subtask) => void,
  handleDeleteSubtask: (id: string, idx: number) => Promise<{ newIndex: number; newFocusId?: string }>
) {
  const debouncedUpdateTask = useMemo(() => debounce(async (id: string, val: string) => {
    try {
      await updateTask(id, val);
      // ✅ Always refetch after successful update to ensure data consistency
      refetchSubtasks();
    } catch {
      // Refetch on error to get fresh data
      refetchSubtasks();
    }
  }, 1000), [refetchSubtasks]);

  const updateTaskImmediate = useCallback(async (id: string, val: string) => {
    try {
      await updateTask(id, val);
      // 🔧 FIX: Only refetch for immediate updates (like Enter key)
      refetchSubtasks();
    } catch {
      refetchSubtasks();
    }
  }, [refetchSubtasks]);

  const handleDraftTitleChange = useCallback((id: string, val: string, immediate = false) => {
    setDraftTitles(draft => ({ ...draft, [id]: val }));
    
    // 🔧 FIX: Only make API calls if there are actual changes
    const currentSubtask = subtasks.find(st => st.id === id);
    const hasChanges = currentSubtask && val.trim() !== (currentSubtask.title || '').trim();
    
    if (hasChanges) {
      if (immediate) {
        updateTaskImmediate(id, val);
      } else {
        debouncedUpdateTask(id, val);
      }
    }
  }, [setDraftTitles, updateTaskImmediate, debouncedUpdateTask, subtasks]);

  const handleDeleteSubtaskWithFocus = useCallback(async (id: string, idx: number) => {
    const result = await handleDeleteSubtask(id, idx);
    
    // 🔧 FIX: Clear draft title for deleted subtask
    setDraftTitles(draft => {
      const newDraft = { ...draft };
      delete newDraft[id];
      return newDraft;
    });
    
    // 🔧 FIX: Focus on the appropriate subtask after deletion
    if (result.newFocusId) {
      setFocusSubtaskId(result.newFocusId);
    } else {
      setFocusSubtaskId(null);
    }
  }, [handleDeleteSubtask, setDraftTitles, setFocusSubtaskId]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const oldIndex = subtasks.findIndex(st => st.id === activeId);
    const newIndex = subtasks.findIndex(st => st.id === overId);
    if (oldIndex === -1 || newIndex === -1) return;
    const newSubtasks = arrayMove(subtasks, oldIndex, newIndex);
    let newOrder = newSubtasks[newIndex].display_order;
    if (newIndex === 0) {
      newOrder = newSubtasks[1]?.display_order ? newSubtasks[1].display_order - 1 : 1;
    } else if (newIndex === newSubtasks.length - 1) {
      newOrder = newSubtasks[newSubtasks.length - 2]?.display_order + 1;
    } else {
      const prev = newSubtasks[newIndex - 1].display_order;
      const next = newSubtasks[newIndex + 1].display_order;
      newOrder = (prev + next) / 2;
    }
    
    try {
      await updateTaskDisplayOrder(newSubtasks[newIndex].id, newOrder);
      // 🔧 FIX: Refetch data instead of optimistic updates
      refetchSubtasks();
    } catch {}
  }, [subtasks, refetchSubtasks]);

  const handleSubtaskEnterWithFocus = useCallback(async (idx: number, title: string = '', subtasksOverride?: Subtask[]): Promise<number> => {
    const result = await handleSubtaskEnter(idx, title, subtasksOverride);
    return result?.newIndex ?? -1;
  }, [handleSubtaskEnter]);

  return {
    handleDraftTitleChange,
    handleDeleteSubtask: handleDeleteSubtaskWithFocus,
    handleDragEnd,
    handleSubtaskEnter: handleSubtaskEnterWithFocus,
    handleSubtaskEnterWithFocus,
    handleCheck
  };
}
