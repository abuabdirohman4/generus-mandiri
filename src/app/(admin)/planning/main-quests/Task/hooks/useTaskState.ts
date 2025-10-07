import { useState, useCallback } from 'react';
import { getTasksForMilestone, addTask, updateTask } from '../../actions/taskActions';

interface Task {
  id: string;
  title: string;
  status: 'TODO' | 'DONE';
  parent_task_id?: string | null;
  display_order?: number;
}

export function useTaskState(milestoneId: string) {
  // Task state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [newTaskInputs, setNewTaskInputs] = useState(['', '', '']);
  const [newTaskLoading, setNewTaskLoading] = useState([false, false, false]);
  const [activeTaskIdx, setActiveTaskIdx] = useState(0);

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    setLoadingTasks(true);
    try {
      const data = await getTasksForMilestone(milestoneId);
      // Filter dan urutkan berdasarkan display_order
      const filteredTasks = (data || []).filter((t: Task) => !t.parent_task_id);
      const sortedTasks = filteredTasks.sort((a: Task, b: Task) => (a.display_order || 0) - (b.display_order || 0));
      setTasks(sortedTasks);
    } finally {
      setLoadingTasks(false);
    }
  }, [milestoneId]);

  // Save new task
  const handleSaveTask = useCallback(async (idx: number) => {
    const val = newTaskInputs[idx];
    if (!val.trim()) return;

    setNewTaskLoading(l => l.map((v, i) => i === idx ? true : v));
    try {
      const formData = new FormData();
      formData.append('milestone_id', milestoneId);
      formData.append('title', val.trim());
      formData.append('display_order', String(idx + 1));
      await addTask(formData);
      fetchTasks();
      setNewTaskInputs(inputs => inputs.map((v, i) => i === idx ? '' : v));
    } catch (error) {
    } finally {
      setNewTaskLoading(l => l.map((v, i) => i === idx ? false : v));
    }
  }, [milestoneId, newTaskInputs, fetchTasks]);

  // Task editing functions
  const handleTaskEdit = useCallback(async (taskId: string, newTitle: string) => {
    try {
      await updateTask(taskId, newTitle.trim());
      // Update local state
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, title: newTitle.trim() } : t));
    } catch (error) {
    }
  }, []);

  // Navigation functions for keyboard support
  const handleNavigateUp = useCallback((currentIdx: number) => {
    if (currentIdx > 0) {
      setActiveTaskIdx(currentIdx - 1);
      // Focus the input in the previous task
      setTimeout(() => {
        const prevInput = document.querySelector(`input[data-task-idx="${currentIdx - 1}"]`) as HTMLInputElement;
        prevInput?.focus();
      }, 0);
    }
  }, []);

  const handleNavigateDown = useCallback((currentIdx: number) => {
    if (currentIdx < 2) {
      setActiveTaskIdx(currentIdx + 1);
      // Focus the input in the next task
      setTimeout(() => {
        const nextInput = document.querySelector(`input[data-task-idx="${currentIdx + 1}"]`) as HTMLInputElement;
        nextInput?.focus();
      }, 0);
    }
  }, []);

  return {
    // State
    tasks,
    loadingTasks,
    newTaskInputs,
    setNewTaskInputs,
    newTaskLoading,
    activeTaskIdx,
    setActiveTaskIdx,
    
    // Actions
    fetchTasks,
    handleSaveTask,
    handleTaskEdit,
    handleNavigateUp,
    handleNavigateDown,
  };
}
