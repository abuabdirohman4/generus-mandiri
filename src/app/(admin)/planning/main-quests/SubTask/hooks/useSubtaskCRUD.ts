import { useCallback } from 'react';
import { addTask, updateTaskStatus, deleteTask } from '../../actions/taskActions';
import { toast } from 'sonner';

interface Subtask {
  id: string;
  title: string;
  status: 'TODO' | 'DONE';
  display_order: number;
}

export function useSubtaskCRUD(
  taskId: string, 
  milestoneId: string, 
  subtasks: Subtask[], 
  refetchSubtasks: () => void
) {
  const handleSubtaskEnter = useCallback(async (
    idx: number,
    title: string = '',
    subtasksOverride?: Subtask[]
  ): Promise<{ newIndex: number | null; newSubtaskId?: string } | null> => {
    const subtasksArr = subtasksOverride ?? subtasks;
    let newOrder = 1.0;
    
    if (subtasksArr.length === 0) {
      // Jika tidak ada subtask, mulai dengan order 1
      newOrder = 1.0;
    } else if (idx >= subtasksArr.length) {
      // Jika insert di akhir (idx >= length), ambil order terakhir + 1
      const lastSubtask = subtasksArr[subtasksArr.length - 1];
      newOrder = lastSubtask.display_order + 1.0;
    } else if (idx === 0) {
      // Jika insert di awal (idx = 0), insert sebelum subtask pertama
      const firstSubtask = subtasksArr[0];
      newOrder = firstSubtask.display_order - 1.0;
    } else {
      // Jika insert di tengah (0 < idx < length), hitung order di antara prev dan next
      const prevSubtask = subtasksArr[idx - 1]; // Subtask sebelum posisi insert
      const nextSubtask = subtasksArr[idx];     // Subtask di posisi insert
      
      if (prevSubtask && nextSubtask) {
        // Insert di antara prev dan next
        newOrder = (prevSubtask.display_order + nextSubtask.display_order) / 2;
      } else if (prevSubtask) {
        // Hanya ada prev, insert setelahnya
        newOrder = prevSubtask.display_order + 1.0;
      } else if (nextSubtask) {
        // Hanya ada next, insert sebelumnya
        newOrder = nextSubtask.display_order - 1.0;
      } else {
        // Fallback
        newOrder = 1.0;
      }
    }
    
    try {
      const formData = new FormData();
      formData.append('parent_task_id', taskId);
      formData.append('title', title);
      formData.append('milestone_id', milestoneId);
      formData.append('display_order', String(newOrder));
      const res = await addTask(formData);
      if (res && res.task) {
      // ✅ Refetch data to ensure consistency
      refetchSubtasks();
      toast.success('Subtask berhasil ditambahkan');
      return { 
        newIndex: idx + 1, // Return next index
        newSubtaskId: res.task.id // Return new subtask ID for focus
      };
      } else {
        toast.error('Gagal membuat tugas baru. Coba lagi.');
        return null;
      }
    } catch {
      toast.error('Gagal membuat tugas baru. Coba lagi.');
      return null;
    }
  }, [taskId, milestoneId, refetchSubtasks]); // 🔧 FIX: Remove subtasks dependency

  const handleCheck = useCallback(async (subtask: Subtask) => {
    const newStatus = subtask.status === 'DONE' ? 'TODO' : 'DONE';
    try {
      const res = await updateTaskStatus(subtask.id, newStatus);
      if (res) {
        // ✅ Always refetch on success for status changes (important for UI consistency)
        refetchSubtasks();
        toast.success(`Subtask ${newStatus === 'DONE' ? 'selesai' : 'dibuka kembali'}`);
      } else {
        toast.error('Gagal update status');
      }
    } catch {
      toast.error('Gagal update status');
      // Refetch on error to ensure data consistency
      refetchSubtasks();
    }
  }, [refetchSubtasks]);

  const handleDeleteSubtask = useCallback(async (id: string, idx: number): Promise<{ newIndex: number; newFocusId?: string }> => {
    // Validasi UUID format untuk Supabase
    if (!id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return { newIndex: idx > 0 ? idx - 1 : -1 };
    }
    
    // 🔧 FIX: Find the subtask to focus after deletion
    // Find the current subtask in the array to get its position
    const currentSubtaskIndex = subtasks.findIndex(st => st.id === id);
    let newFocusId: string | undefined;
    
    if (currentSubtaskIndex > 0) {
      // Focus on the subtask above
      const subtaskAbove = subtasks[currentSubtaskIndex - 1];
      newFocusId = subtaskAbove?.id;
    } else if (currentSubtaskIndex < subtasks.length - 1) {
      // If deleting the first subtask, focus on the next one
      const subtaskBelow = subtasks[currentSubtaskIndex + 1];
      newFocusId = subtaskBelow?.id;
    }
    // If deleting the only subtask, newFocusId will be undefined (no focus)
    
    try {
      // Hapus dari database
      await deleteTask(id);
      toast.success('Subtask berhasil dihapus');
      
      // ✅ Refetch immediately for delete operations (critical for UI consistency)
      refetchSubtasks();
    } catch (error) {
      toast.error('Gagal menghapus subtask');
      // Refetch on error to ensure data consistency
      refetchSubtasks();
    }
    
    return { 
      newIndex: idx > 0 ? idx - 1 : -1,
      newFocusId
    };
  }, [refetchSubtasks]); // 🔧 FIX: Remove subtasks dependency

  return {
    handleSubtaskEnter,
    handleCheck,
    handleDeleteSubtask
  };
}
