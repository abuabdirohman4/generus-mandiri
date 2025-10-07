"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { 
  WorkQuest, 
  WorkQuestFormData, 
  WorkQuestSubtaskFormData,
  WorkQuestProject,
  WorkQuestProjectFormData,
  WorkQuestTask,
  WorkQuestTaskFormData
} from "../types";

export async function getWorkQuests(): Promise<WorkQuest[]> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get main work quests
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        description,
        status,
        created_at,
        updated_at
      `)
      .eq('user_id', user.id)
      .eq('type', 'WORK_QUEST')
      .is('parent_task_id', null)
      .order('created_at', { ascending: false });

    if (tasksError) {
      throw tasksError;
    }

    // Get subtasks for each main task
    const workQuests: WorkQuest[] = [];
    
    for (const task of tasks || []) {
      const { data: subtasks, error: subtasksError } = await supabase
        .from('tasks')
        .select(`
          id,
          parent_task_id,
          title,
          description,
          status,
          created_at,
          updated_at
        `)
        .eq('parent_task_id', task.id)
        .eq('type', 'WORK_QUEST')
        .order('created_at', { ascending: true });

      if (subtasksError) {
        throw subtasksError;
      }

      workQuests.push({
        id: task.id,
        title: task.title,
        description: task.description || undefined,
        status: task.status as 'TODO' | 'IN_PROGRESS' | 'DONE',
        created_at: task.created_at,
        updated_at: task.updated_at,
        tasks: (subtasks || []).map(subtask => ({
          id: subtask.id,
          parent_task_id: subtask.parent_task_id,
          title: subtask.title,
          description: subtask.description || undefined,
          status: subtask.status as 'TODO' | 'IN_PROGRESS' | 'DONE',
          created_at: subtask.created_at,
          updated_at: subtask.updated_at,
        }))
      });
    }

    return workQuests;
  } catch (error) {
    console.error(error, 'memuat work quests');
    return [];
  }
}

export async function createWorkQuest(formData: WorkQuestFormData): Promise<WorkQuest> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Create main task
    const { data: mainTask, error: mainTaskError } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        title: formData.title,
        description: null,
        type: 'WORK_QUEST',
        status: 'TODO',
      })
      .select()
      .single();

    if (mainTaskError) {
      throw mainTaskError;
    }

    // Create subtasks if any
    if (formData.subtasks && formData.subtasks.length > 0) {
      const subtasksToInsert = formData.subtasks.map(subtask => ({
        user_id: user.id,
        parent_task_id: mainTask.id,
        title: subtask.title,
        description: subtask.description || null,
        type: 'WORK_QUEST',
        status: 'TODO' as const,
      }));

      const { error: subtasksError } = await supabase
        .from('tasks')
        .insert(subtasksToInsert);

      if (subtasksError) {
        throw subtasksError;
      }
    }

    revalidatePath('/work-quests');
    revalidatePath('/execution/daily-sync');

    // Return the created work quest with subtasks
    const createdWorkQuest = await getWorkQuestById(mainTask.id);
    if (!createdWorkQuest) {
      throw new Error('Failed to retrieve created work quest');
    }

    return createdWorkQuest;
  } catch (error) {
    console.error(error, 'membuat work quest');
    throw error;
  }
}

export async function updateWorkQuest(id: string, formData: WorkQuestFormData): Promise<WorkQuest> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Update main task
    const { error: mainTaskError } = await supabase
      .from('tasks')
      .update({
        title: formData.title,
        description: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id);

    if (mainTaskError) {
      throw mainTaskError;
    }

    // Delete existing subtasks
    const { error: deleteSubtasksError } = await supabase
      .from('tasks')
      .delete()
      .eq('parent_task_id', id)
      .eq('user_id', user.id);

    if (deleteSubtasksError) {
      throw deleteSubtasksError;
    }

    // Create new subtasks
    if (formData.subtasks && formData.subtasks.length > 0) {
      const subtasksToInsert = formData.subtasks.map(subtask => ({
        user_id: user.id,
        parent_task_id: id,
        title: subtask.title,
        description: subtask.description || null,
        type: 'WORK_QUEST',
        status: 'TODO' as const,
      }));

      const { error: subtasksError } = await supabase
        .from('tasks')
        .insert(subtasksToInsert);

      if (subtasksError) {
        throw subtasksError;
      }
    }

    revalidatePath('/work-quests');
    revalidatePath('/execution/daily-sync');

    // Return the updated work quest
    const updatedWorkQuest = await getWorkQuestById(id);
    if (!updatedWorkQuest) {
      throw new Error('Failed to retrieve updated work quest');
    }

    return updatedWorkQuest;
  } catch (error) {
    console.error(error, 'memperbarui work quest');
    throw error;
  }
}

export async function deleteWorkQuest(id: string): Promise<void> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Delete subtasks first (cascade should handle this, but being explicit)
    const { error: deleteSubtasksError } = await supabase
      .from('tasks')
      .delete()
      .eq('parent_task_id', id)
      .eq('user_id', user.id);

    if (deleteSubtasksError) {
      throw deleteSubtasksError;
    }

    // Delete main task
    const { error: deleteMainTaskError } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (deleteMainTaskError) {
      throw deleteMainTaskError;
    }

    revalidatePath('/work-quests');
    revalidatePath('/execution/daily-sync');
  } catch (error) {
    console.error(error, 'menghapus work quest');
    throw error;
  }
}

// Project Management Functions
export async function getWorkQuestProjects(): Promise<WorkQuestProject[]> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get main work quest projects (parent_task_id is null)
    const { data: projects, error: projectsError } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        description,
        status,
        created_at,
        updated_at
      `)
      .eq('user_id', user.id)
      .eq('type', 'WORK_QUEST')
      .is('parent_task_id', null)
      .order('created_at', { ascending: false });

    if (projectsError) {
      throw projectsError;
    }

    // Get tasks for each project
    const workQuestProjects: WorkQuestProject[] = [];
    
    for (const project of projects || []) {
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          id,
          parent_task_id,
          title,
          description,
          status,
          created_at,
          updated_at
        `)
        .eq('parent_task_id', project.id)
        .eq('type', 'WORK_QUEST')
        .order('created_at', { ascending: true });

      if (tasksError) {
        throw tasksError;
      }

      workQuestProjects.push({
        id: project.id,
        title: project.title,
        description: project.description || undefined,
        status: project.status as 'TODO' | 'IN_PROGRESS' | 'DONE',
        created_at: project.created_at,
        updated_at: project.updated_at,
        tasks: (tasks || []).map(task => ({
          id: task.id,
          parent_task_id: task.parent_task_id,
          title: task.title,
          description: task.description || undefined,
          status: task.status as 'TODO' | 'IN_PROGRESS' | 'DONE',
          created_at: task.created_at,
          updated_at: task.updated_at,
        }))
      });
    }

    return workQuestProjects;
  } catch (error) {
    console.error(error, 'memuat work quest projects');
    return [];
  }
}

export async function createWorkQuestProject(formData: WorkQuestProjectFormData): Promise<WorkQuestProject> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Create main project task
    const { data: project, error: projectError } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        title: formData.title,
        description: null, // No description for projects
        type: 'WORK_QUEST',
        status: 'TODO',
        parent_task_id: null, // This is a project, not a task
      })
      .select()
      .single();

    if (projectError) {
      throw projectError;
    }

    revalidatePath('/work-quests');
    revalidatePath('/execution/daily-sync');

    // Return the created project
    const createdProject = await getWorkQuestProjectById(project.id);
    if (!createdProject) {
      throw new Error('Failed to retrieve created project');
    }

    return createdProject;
  } catch (error) {
    console.error(error, 'membuat work quest project');
    throw error;
  }
}

export async function updateWorkQuestProject(id: string, formData: WorkQuestProjectFormData): Promise<WorkQuestProject> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Update project
    const { error: projectError } = await supabase
      .from('tasks')
      .update({
        title: formData.title,
        description: null, // No description for projects
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .eq('type', 'WORK_QUEST')
      .is('parent_task_id', null);

    if (projectError) {
      throw projectError;
    }

    revalidatePath('/work-quests');
    revalidatePath('/execution/daily-sync');

    // Return the updated project
    const updatedProject = await getWorkQuestProjectById(id);
    if (!updatedProject) {
      throw new Error('Failed to retrieve updated project');
    }

    return updatedProject;
  } catch (error) {
    console.error(error, 'memperbarui work quest project');
    throw error;
  }
}

export async function deleteWorkQuestProject(id: string): Promise<void> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Delete tasks first (cascade should handle this, but being explicit)
    const { error: deleteTasksError } = await supabase
      .from('tasks')
      .delete()
      .eq('parent_task_id', id)
      .eq('user_id', user.id);

    if (deleteTasksError) {
      throw deleteTasksError;
    }

    // Delete project
    const { error: deleteProjectError } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (deleteProjectError) {
      throw deleteProjectError;
    }

    revalidatePath('/work-quests');
    revalidatePath('/execution/daily-sync');
  } catch (error) {
    console.error(error, 'menghapus work quest project');
    throw error;
  }
}

export async function getWorkQuestProjectById(id: string): Promise<WorkQuestProject | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get main project
    const { data: project, error: projectError } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        description,
        status,
        created_at,
        updated_at
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .eq('type', 'WORK_QUEST')
      .is('parent_task_id', null)
      .single();

    if (projectError) {
      throw projectError;
    }

    if (!project) {
      return null;
    }

    // Get tasks for this project
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select(`
        id,
        parent_task_id,
        title,
        description,
        status,
        created_at,
        updated_at
      `)
      .eq('parent_task_id', id)
      .eq('type', 'WORK_QUEST')
      .order('created_at', { ascending: true });

    if (tasksError) {
      throw tasksError;
    }

    return {
      id: project.id,
      title: project.title,
      description: project.description || undefined,
      status: project.status as 'TODO' | 'IN_PROGRESS' | 'DONE',
      created_at: project.created_at,
      updated_at: project.updated_at,
      tasks: (tasks || []).map(task => ({
        id: task.id,
        parent_task_id: task.parent_task_id,
        title: task.title,
        description: task.description || undefined,
        status: task.status as 'TODO' | 'IN_PROGRESS' | 'DONE',
        created_at: task.created_at,
        updated_at: task.updated_at,
      }))
    };
  } catch (error) {
    console.error(error, 'memuat work quest project');
    return null;
  }
}

// Task Management Functions
export async function createWorkQuestTask(projectId: string, formData: WorkQuestTaskFormData): Promise<WorkQuestTask> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Create task under project
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        parent_task_id: projectId,
        title: formData.title,
        description: null,
        type: 'WORK_QUEST',
        status: 'TODO',
      })
      .select()
      .single();

    if (taskError) {
      throw taskError;
    }

    revalidatePath('/work-quests');
    revalidatePath('/execution/daily-sync');

    return {
      id: task.id,
      parent_task_id: task.parent_task_id,
      title: task.title,
      description: task.description || undefined,
      status: task.status as 'TODO' | 'IN_PROGRESS' | 'DONE',
      created_at: task.created_at,
      updated_at: task.updated_at,
    };
  } catch (error) {
    console.error(error, 'membuat work quest task');
    throw error;
  }
}

export async function updateWorkQuestTask(taskId: string, formData: WorkQuestTaskFormData): Promise<WorkQuestTask> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Update task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .update({
        title: formData.title,
        description: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .eq('user_id', user.id)
      .eq('type', 'WORK_QUEST')
      .select()
      .single();

    if (taskError) {
      throw taskError;
    }

    revalidatePath('/work-quests');
    revalidatePath('/execution/daily-sync');

    return {
      id: task.id,
      parent_task_id: task.parent_task_id,
      title: task.title,
      description: task.description || undefined,
      status: task.status as 'TODO' | 'IN_PROGRESS' | 'DONE',
      created_at: task.created_at,
      updated_at: task.updated_at,
    };
  } catch (error) {
    console.error(error, 'memperbarui work quest task');
    throw error;
  }
}

export async function deleteWorkQuestTask(taskId: string): Promise<void> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Delete task
    const { error: deleteTaskError } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', user.id);

    if (deleteTaskError) {
      throw deleteTaskError;
    }

    revalidatePath('/work-quests');
    revalidatePath('/execution/daily-sync');
  } catch (error) {
    console.error(error, 'menghapus work quest task');
    throw error;
  }
}

export async function toggleWorkQuestProjectStatus(projectId: string, status: 'TODO' | 'DONE'): Promise<void> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Update project status
    const { error: updateError } = await supabase
      .from('tasks')
      .update({
        status: status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)
      .eq('user_id', user.id)
      .eq('type', 'WORK_QUEST')
      .is('parent_task_id', null);

    if (updateError) {
      throw updateError;
    }

    revalidatePath('/work-quests');
    revalidatePath('/execution/daily-sync');
  } catch (error) {
    console.error(error, 'mengubah status work quest project');
    throw error;
  }
}

export async function toggleWorkQuestTaskStatus(taskId: string, status: 'TODO' | 'DONE'): Promise<void> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Update task status
    const { error: updateError } = await supabase
      .from('tasks')
      .update({
        status: status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .eq('user_id', user.id)
      .eq('type', 'WORK_QUEST');

    if (updateError) {
      throw updateError;
    }

    revalidatePath('/work-quests');
    revalidatePath('/execution/daily-sync');
  } catch (error) {
    console.error(error, 'mengubah status work quest task');
    throw error;
  }
}

export async function getWorkQuestById(id: string): Promise<WorkQuest | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get main task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        description,
        status,
        created_at,
        updated_at
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .eq('type', 'WORK_QUEST')
      .is('parent_task_id', null)
      .single();

    if (taskError) {
      throw taskError;
    }

    if (!task) {
      return null;
    }

    // Get subtasks
    const { data: subtasks, error: subtasksError } = await supabase
      .from('tasks')
      .select(`
        id,
        parent_task_id,
        title,
        description,
        status,
        created_at,
        updated_at
      `)
      .eq('parent_task_id', id)
      .eq('type', 'WORK_QUEST')
      .order('created_at', { ascending: true });

    if (subtasksError) {
      throw subtasksError;
    }

    return {
      id: task.id,
      title: task.title,
      description: task.description || undefined,
      status: task.status as 'TODO' | 'IN_PROGRESS' | 'DONE',
      created_at: task.created_at,
      updated_at: task.updated_at,
      tasks: (subtasks || []).map(subtask => ({
        id: subtask.id,
        parent_task_id: subtask.parent_task_id,
        title: subtask.title,
        description: subtask.description || undefined,
        status: subtask.status as 'TODO' | 'IN_PROGRESS' | 'DONE',
        created_at: subtask.created_at,
        updated_at: subtask.updated_at,
      }))
    };
  } catch (error) {
    console.error(error, 'memuat work quest');
    return null;
  }
}
