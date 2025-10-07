"use client";
import useSWR from "swr";
import { 
  getWorkQuests, 
  createWorkQuest, 
  updateWorkQuest, 
  deleteWorkQuest,
  getWorkQuestProjects,
  createWorkQuestProject,
  updateWorkQuestProject,
  deleteWorkQuestProject,
  createWorkQuestTask,
  updateWorkQuestTask,
  deleteWorkQuestTask,
  toggleWorkQuestProjectStatus,
  toggleWorkQuestTaskStatus
} from "../actions/workQuestActions";
import { 
  WorkQuest, 
  WorkQuestFormData,
  WorkQuestProject,
  WorkQuestProjectFormData,
  WorkQuestTask,
  WorkQuestTaskFormData
} from "../types";

export function useWorkQuests() {
  const { 
    data: workQuests = [], 
    error, 
    isLoading,
    mutate 
  } = useSWR(
    'work-quests',
    () => getWorkQuests(),
    {
      revalidateOnFocus: false,
      dedupingInterval: 2 * 60 * 1000, // 2 minutes
      errorRetryCount: 3,
    }
  );

  const createWorkQuestAction = async (formData: WorkQuestFormData) => {
    try {
      const newWorkQuest = await createWorkQuest(formData);
      // Optimistic update
      mutate((currentData) => [newWorkQuest, ...(currentData || [])], false);
      return newWorkQuest;
    } catch (error) {
      console.error("Failed to create work quest:", error);
      throw error;
    }
  };

  const updateWorkQuestAction = async (id: string, formData: WorkQuestFormData) => {
    try {
      const updatedWorkQuest = await updateWorkQuest(id, formData);
      // Optimistic update
      mutate((currentData) => 
        (currentData || []).map(quest => 
          quest.id === id ? updatedWorkQuest : quest
        ), 
        false
      );
      return updatedWorkQuest;
    } catch (error) {
      console.error("Failed to update work quest:", error);
      throw error;
    }
  };

  const deleteWorkQuestAction = async (id: string) => {
    try {
      await deleteWorkQuest(id);
      // Optimistic update
      mutate((currentData) => 
        (currentData || []).filter(quest => quest.id !== id), 
        false
      );
    } catch (error) {
      console.error("Failed to delete work quest:", error);
      throw error;
    }
  };

  return {
    workQuests,
    error: error?.message,
    isLoading,
    createWorkQuest: createWorkQuestAction,
    updateWorkQuest: updateWorkQuestAction,
    deleteWorkQuest: deleteWorkQuestAction,
    mutate,
  };
}

export function useWorkQuestProjects() {
  const { 
    data: projects = [], 
    error, 
    isLoading,
    mutate 
  } = useSWR(
    'work-quest-projects',
    () => getWorkQuestProjects(),
    {
      revalidateOnFocus: false,
      dedupingInterval: 2 * 60 * 1000, // 2 minutes
      errorRetryCount: 3,
    }
  );

  const createProject = async (formData: WorkQuestProjectFormData) => {
    try {
      const newProject = await createWorkQuestProject(formData);
      // Optimistic update
      mutate((currentData) => [newProject, ...(currentData || [])], false);
      return newProject;
    } catch (error) {
      console.error("Failed to create project:", error);
      throw error;
    }
  };

  const updateProject = async (id: string, formData: WorkQuestProjectFormData) => {
    try {
      const updatedProject = await updateWorkQuestProject(id, formData);
      // Optimistic update
      mutate((currentData) => 
        (currentData || []).map(project => 
          project.id === id ? updatedProject : project
        ), 
        false
      );
      return updatedProject;
    } catch (error) {
      console.error("Failed to update project:", error);
      throw error;
    }
  };

  const deleteProject = async (id: string) => {
    try {
      await deleteWorkQuestProject(id);
      // Optimistic update
      mutate((currentData) => 
        (currentData || []).filter(project => project.id !== id), 
        false
      );
    } catch (error) {
      console.error("Failed to delete project:", error);
      throw error;
    }
  };

  const createTask = async (projectId: string, formData: WorkQuestTaskFormData) => {
    try {
      const newTask = await createWorkQuestTask(projectId, formData);
      // Optimistic update
      mutate((currentData) => 
        (currentData || []).map(project => 
          project.id === projectId 
            ? { ...project, tasks: [...project.tasks, newTask] }
            : project
        ), 
        false
      );
      return newTask;
    } catch (error) {
      console.error("Failed to create task:", error);
      throw error;
    }
  };

  const updateTask = async (taskId: string, formData: WorkQuestTaskFormData) => {
    try {
      const updatedTask = await updateWorkQuestTask(taskId, formData);
      // Optimistic update
      mutate((currentData) => 
        (currentData || []).map(project => ({
          ...project,
          tasks: project.tasks.map(task => 
            task.id === taskId ? updatedTask : task
          )
        })), 
        false
      );
      return updatedTask;
    } catch (error) {
      console.error("Failed to update task:", error);
      throw error;
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      await deleteWorkQuestTask(taskId);
      // Optimistic update
      mutate((currentData) => 
        (currentData || []).map(project => ({
          ...project,
          tasks: project.tasks.filter(task => task.id !== taskId)
        })), 
        false
      );
    } catch (error) {
      console.error("Failed to delete task:", error);
      throw error;
    }
  };

  const toggleProjectStatus = async (projectId: string, status: 'TODO' | 'DONE') => {
    try {
      await toggleWorkQuestProjectStatus(projectId, status);
      // Optimistic update
      mutate((currentData) => 
        (currentData || []).map(project => 
          project.id === projectId 
            ? { ...project, status }
            : project
        ), 
        false
      );
    } catch (error) {
      console.error("Failed to toggle project status:", error);
      throw error;
    }
  };

  const toggleTaskStatus = async (taskId: string, status: 'TODO' | 'DONE') => {
    try {
      await toggleWorkQuestTaskStatus(taskId, status);
      // Optimistic update
      mutate((currentData) => 
        (currentData || []).map(project => ({
          ...project,
          tasks: project.tasks.map(task => 
            task.id === taskId ? { ...task, status } : task
          )
        })), 
        false
      );
    } catch (error) {
      console.error("Failed to toggle task status:", error);
      throw error;
    }
  };

  return {
    projects,
    error: error?.message,
    isLoading,
    createProject,
    updateProject,
    deleteProject,
    createTask,
    updateTask,
    deleteTask,
    toggleProjectStatus,
    toggleTaskStatus,
    mutate,
  };
}
