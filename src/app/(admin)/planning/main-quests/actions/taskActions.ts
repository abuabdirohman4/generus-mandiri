"use server";

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

// Ambil semua tasks untuk milestone tertentu
export async function getTasksForMilestone(milestoneId: string) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('tasks')
      .select('id, title, status, display_order')
      .eq('milestone_id', milestoneId)
      .is('parent_task_id', null)
      .order('display_order', { ascending: true });
    
    if (error) {
      console.error('Error fetching tasks for milestone:', error);
      throw new Error(`Failed to fetch tasks: ${error.message}`);
    }
  
    // Jika ada task tanpa display_order, perbaiki otomatis
    const tasksToUpdate = data?.filter(task => !task.display_order || task.display_order === 0);
    if (tasksToUpdate && tasksToUpdate.length > 0) {
      for (let i = 0; i < tasksToUpdate.length; i++) {
        const task = tasksToUpdate[i];
        const newOrder = i + 1;
        await supabase
          .from('tasks')
          .update({ display_order: newOrder })
          .eq('id', task.id);
      }
      // Fetch ulang data setelah update
      const { data: updatedData } = await supabase
        .from('tasks')
        .select('id, title, status, display_order')
        .eq('milestone_id', milestoneId)
        .is('parent_task_id', null)
        .order('display_order', { ascending: true });
      return updatedData || [];
    }
    
    const result = data || [];
    return result;
  } catch (error) {
    console.error('Error in getTasksForMilestone:', error);
    throw error;
  }
}

// Tambah task baru ke milestone
export async function addTask(formData: FormData): Promise<{ message: string, task?: {
  id: string;
  title: string;
  status: 'TODO' | 'DONE';
  display_order: number;
  parent_task_id?: string | null;
  milestone_id: string;
} }> {
  const supabase = await createClient();
  const milestone_id_val = formData.get('milestone_id');
  const title_val = formData.get('title');
  const parent_task_id_val = formData.get('parent_task_id');
  const display_order = formData.get('display_order');
  const milestone_id = milestone_id_val ? milestone_id_val.toString() : null;
  const title = title_val ? title_val.toString() : null;
  const parent_task_id = parent_task_id_val ? parent_task_id_val.toString() : null;
  
  // Untuk subtask, milestone_id tidak wajib karena sudah punya parent_task_id
  if (!parent_task_id && !milestone_id) {
    throw new Error('milestone_id wajib diisi untuk task utama');
  }
  
  // Validasi milestone_id exists hanya jika milestone_id ada
  if (milestone_id) {
    const { data: milestoneExists, error: milestoneError } = await supabase
      .from('milestones')
      .select('id')
      .eq('id', milestone_id)
      .single();
    
    if (milestoneError || !milestoneExists) {
      throw new Error('Milestone tidak ditemukan atau tidak valid');
    }
  }
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User tidak ditemukan');
  interface InsertTaskData {
    milestone_id: string | null;
    title: string | null;
    status: 'TODO' | 'DONE';
    user_id: string;
    parent_task_id?: string | null;
    type?: string;
    display_order?: number;
  }
  const insertData: InsertTaskData = { 
    milestone_id: parent_task_id ? null : milestone_id, // Subtask tidak perlu milestone_id
    title, 
    status: 'TODO', 
    user_id: user.id 
  };
  
  if (parent_task_id) {
    insertData.parent_task_id = parent_task_id;
    insertData.type = 'MAIN_QUEST'; // Subtask juga MAIN_QUEST
    if (display_order !== undefined && display_order !== null) {
      insertData.display_order = Number(display_order);
    }
  } else {
    insertData.type = 'MAIN_QUEST';
    // Hitung display_order untuk task utama berdasarkan posisi input
    if (display_order !== undefined && display_order !== null) {
      insertData.display_order = Number(display_order);
    } else {
      // Fallback: hitung display_order terakhir untuk milestone ini
      const { data: lastTask } = await supabase
        .from('tasks')
        .select('display_order')
        .eq('milestone_id', milestone_id)
        .is('parent_task_id', null)
        .order('display_order', { ascending: false })
        .limit(1)
        .single();
      insertData.display_order = lastTask && lastTask.display_order ? lastTask.display_order + 1 : 1;
    }
  }
  const { data, error } = await supabase
    .from('tasks')
    .insert(insertData)
    .select('id, title, status, display_order, parent_task_id, milestone_id')
    .single();
  if (error) throw new Error('Gagal menambah task: ' + (error.message || ''));
  // Revalidate multiple paths to ensure all data is fresh
  revalidatePath('/planning/main-quests');
  revalidatePath('/execution/weekly-sync');
  revalidatePath('/execution/daily-sync');
  return { message: 'Task berhasil ditambahkan!', task: data };
}

// Update status task (TODO/DONE)
export async function updateTaskStatus(taskId: string, newStatus: 'TODO' | 'DONE') {
  const supabase = await createClient();
  const { error } = await supabase
    .from('tasks')
    .update({ status: newStatus })
    .eq('id', taskId);
  if (error) throw new Error('Gagal update status task: ' + (error.message || ''));
  // Revalidate multiple paths to ensure all data is fresh
  revalidatePath('/planning/main-quests');
  revalidatePath('/execution/weekly-sync');
  revalidatePath('/execution/daily-sync');
  return { message: 'Status task berhasil diupdate!' };
}

// Edit task
export async function updateTask(taskId: string, title: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('tasks')
    .update({ title })
    .eq('id', taskId);
  if (error) throw new Error('Gagal update task: ' + (error.message || ''));
  // Revalidate multiple paths to ensure all data is fresh
  revalidatePath('/planning/main-quests');
  revalidatePath('/execution/weekly-sync');
  revalidatePath('/execution/daily-sync');
  return { message: 'Task berhasil diupdate!' };
}

// Hapus task
export async function deleteTask(taskId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);
  if (error) throw new Error('Gagal hapus task: ' + (error.message || ''));
  // Revalidate multiple paths to ensure all data is fresh
  revalidatePath('/planning/main-quests');
  revalidatePath('/execution/weekly-sync');
  revalidatePath('/execution/daily-sync');
  return { message: 'Task berhasil dihapus!' };
}

// Update display_order task
export async function updateTaskDisplayOrder(taskId: string, display_order: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('tasks')
    .update({ display_order })
    .eq('id', taskId);
  if (error) throw new Error('Gagal update urutan task: ' + (error.message || ''));
  return { message: 'Urutan task berhasil diupdate!' };
}

// Update scheduled_date pada task tertentu
export async function scheduleTask(taskId: string, newScheduledDate: string | null) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('tasks')
    .update({ scheduled_date: newScheduledDate })
    .eq('id', taskId);
  if (error) {
    return { success: false, message: error.message || 'Gagal menjadwalkan tugas.' };
  }
  // Revalidate path agar data fresh
  revalidatePath('/execution/weekly-sync');
  return { success: true, message: 'Tugas berhasil dijadwalkan.' };
}
