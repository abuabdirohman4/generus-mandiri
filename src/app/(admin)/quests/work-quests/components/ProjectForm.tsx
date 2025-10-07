"use client";
import React, { useState, useEffect } from "react";
import { WorkQuestProjectFormProps } from "../types";
import Button from "@/components/ui/button/Button";

const ProjectForm: React.FC<WorkQuestProjectFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isLoading
}) => {
  const [formData, setFormData] = useState({
    title: "",
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title,
      });
    }
  }, [initialData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      return;
    }

    await onSubmit({
      title: formData.title.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center space-x-3">
      {/* Project Title Input */}
      <div className="flex-1">
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleInputChange}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary focus:border-primary dark:bg-gray-700 dark:text-white text-sm"
          placeholder="Masukkan judul project..."
          required
        />
      </div>

      {/* Form Actions */}
      <div className="flex items-center space-x-2">
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
          {initialData ? "Perbarui" : "Tambah"}
        </Button>
      </div>
    </form>
  );
};

export default ProjectForm;
