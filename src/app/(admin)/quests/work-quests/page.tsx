"use client";
import React, { useState } from "react";
import { useWorkQuestProjects } from "./hooks/useWorkQuests";
import { ProjectForm, ProjectList, WorkQuestModal } from "./components";
import { WorkQuestProject, WorkQuestProjectFormData } from "./types";
import { toast } from "sonner";
import Button from "@/components/ui/button/Button";

export default function WorkQuestsPage() {
  const {
    projects,
    isLoading,
    error,
    createProject,
    updateProject,
    deleteProject,
    createTask,
    updateTask,
    deleteTask,
    toggleProjectStatus,
    toggleTaskStatus,
    mutate
  } = useWorkQuestProjects();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<WorkQuestProject | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isUpdatingProject, setIsUpdatingProject] = useState(false);

  const handleCreateProject = async (formData: WorkQuestProjectFormData) => {
    try {
      setIsCreatingProject(true);
      await createProject(formData);
      toast.success("Project berhasil dibuat!");
      setIsFormOpen(false);
    } catch (error) {
      console.error("Failed to create project:", error);
      toast.error("Gagal membuat Project");
    } finally {
      setIsCreatingProject(false);
    }
  };

  const handleUpdateProject = async (id: string, formData: WorkQuestProjectFormData) => {
    try {
      setIsUpdatingProject(true);
      await updateProject(id, formData);
      toast.success("Project berhasil diperbarui!");
      setEditingProject(null);
      setIsModalOpen(false);
    } catch (error) {
      console.error("Failed to update project:", error);
      toast.error("Gagal memperbarui Project");
    } finally {
      setIsUpdatingProject(false);
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      await deleteProject(id);
      toast.success("Project berhasil dihapus!");
    } catch (error) {
      console.error("Failed to delete project:", error);
      toast.error("Gagal menghapus Project");
    }
  };

  const handleEditProject = (project: WorkQuestProject) => {
    setEditingProject(project);
    setIsModalOpen(true);
  };

  const handleAddTask = async (projectId: string, formData: any) => {
    try {
      await createTask(projectId, formData);
      toast.success("Task berhasil ditambahkan!");
    } catch (error) {
      console.error("Failed to create task:", error);
      toast.error("Gagal menambahkan Task");
    }
  };

  const handleEditTask = async (projectId: string, task: any) => {
    try {
      await updateTask(task.id, {
        title: task.title,
        description: task.description
      });
      toast.success("Task berhasil diperbarui!");
    } catch (error) {
      console.error("Failed to update task:", error);
      toast.error("Gagal memperbarui Task");
    }
  };

  const handleDeleteTask = async (projectId: string, taskId: string) => {
    try {
      await deleteTask(taskId);
      toast.success("Task berhasil dihapus!");
    } catch (error) {
      console.error("Failed to delete task:", error);
      toast.error("Gagal menghapus Task");
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProject(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <div className="text-red-500 mb-4">Error: {error}</div>
        <button 
          onClick={() => mutate()}
          className="btn btn-primary"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Work <span className="text-brand-600">Quests</span>
            </h1>
          </div>
          <Button
            onClick={() => setIsFormOpen(true)}
            className="btn btn-primary"
            size="md"
            variant="primary"
          >
            Add Project
          </Button>
        </div>
      </div>

      {/* Add Project Form */}
      {isFormOpen && (
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <ProjectForm
            initialData={null}
            onSubmit={handleCreateProject}
            onCancel={() => setIsFormOpen(false)}
            isLoading={isCreatingProject}
          />
        </div>
      )}

      {/* Projects List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Daftar Projects
        </h2>
        
        <ProjectList
          projects={projects}
          onEditProject={handleEditProject}
          onDeleteProject={handleDeleteProject}
          onAddTask={handleAddTask}
          onEditTask={handleEditTask}
          onDeleteTask={handleDeleteTask}
          onToggleProjectStatus={toggleProjectStatus}
          onToggleTaskStatus={toggleTaskStatus}
        />
      </div>

      {/* Edit Modal */}
      <WorkQuestModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        workQuest={editingProject}
        onSave={(data: WorkQuestProjectFormData) => editingProject && handleUpdateProject(editingProject.id, data)}
      />
    </div>
  );
}
