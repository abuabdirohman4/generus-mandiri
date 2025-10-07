import { useState, useCallback, useEffect } from 'react';
import { getSubtasksForTask } from '../../actions/subTaskActions';

interface Subtask {
  id: string;
  title: string;
  status: 'TODO' | 'DONE';
  display_order: number;
}

export function useSubtaskManagement(taskId: string) {
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [loadingSubtasks, setLoadingSubtasks] = useState(true);

  const fetchSubtasks = useCallback(async () => {
    setLoadingSubtasks(true);
    try {
      const data = await getSubtasksForTask(taskId);
      setSubtasks(Array.isArray(data) ? data : []);
    } finally {
      setLoadingSubtasks(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchSubtasks();
  }, [fetchSubtasks]);

  return {
    subtasks,
    setSubtasks,
    loadingSubtasks,
    fetchSubtasks
  };
}
