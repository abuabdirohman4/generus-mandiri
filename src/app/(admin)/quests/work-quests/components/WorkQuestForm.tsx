"use client";
import React, { useState, useEffect } from "react";
import { WorkQuestFormProps, WorkQuestSubtaskFormData } from "../types";
import Button from "@/components/ui/button/Button";

const WorkQuestForm: React.FC<WorkQuestFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isLoading
}) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
  });

  const [subtasks, setSubtasks] = useState<WorkQuestSubtaskFormData[]>([]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title,
        description: initialData.description || "",
      });
      setSubtasks(
        (initialData.tasks || []).map((task: any) => ({
          title: task.title,
          description: task.description || "",
        }))
      );
    }
  }, [initialData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubtaskChange = (index: number, field: keyof WorkQuestSubtaskFormData, value: string | number) => {
    setSubtasks(prev => prev.map((subtask, i) => 
      i === index ? { ...subtask, [field]: value } : subtask
    ));
  };

  const addSubtask = () => {
    setSubtasks(prev => [...prev, {
      title: "",
      description: "",
    }]);
  };

  const removeSubtask = (index: number) => {
    setSubtasks(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      return;
    }

    onSubmit({
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      subtasks: subtasks.filter(subtask => subtask.title.trim()),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Main Task Fields */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Judul Task *
        </label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-primary focus:border-primary dark:bg-gray-700 dark:text-white"
          placeholder="Masukkan judul task"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Deskripsi
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-primary focus:border-primary dark:bg-gray-700 dark:text-white"
          placeholder="Masukkan deskripsi task (opsional)"
        />
      </div>


      {/* Subtasks Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Subtasks
          </label>
          <button
            type="button"
            onClick={addSubtask}
            className="text-sm text-primary hover:text-primary/80 font-medium"
          >
            + Tambah Subtask
          </button>
        </div>

        <div className="space-y-3">
          {subtasks.map((subtask, index) => (
            <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-md p-3">
              <div className="flex items-start justify-between mb-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Subtask {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeSubtask(index)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  Hapus
                </button>
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  value={subtask.title}
                  onChange={(e) => handleSubtaskChange(index, 'title', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-primary focus:border-primary dark:bg-gray-700 dark:text-white"
                  placeholder="Judul subtask"
                />

                <textarea
                  value={subtask.description}
                  onChange={(e) => handleSubtaskChange(index, 'description', e.target.value)}
                  rows={2}
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-primary focus:border-primary dark:bg-gray-700 dark:text-white"
                  placeholder="Deskripsi subtask (opsional)"
                />

              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isLoading}
        >
          Batal
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={!formData.title.trim()}
          loading={isLoading}
          loadingText="Saving..."
        >
          {initialData ? "Perbarui" : "Simpan"}
        </Button>
      </div>
    </form>
  );
};

export default WorkQuestForm;
