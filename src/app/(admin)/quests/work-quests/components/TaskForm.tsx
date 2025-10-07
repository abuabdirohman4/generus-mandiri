"use client";
import React, { useState, useEffect, useRef } from "react";
import { WorkQuestTaskFormProps } from "../types";
import Button from "@/components/ui/button/Button";

const TaskForm: React.FC<WorkQuestTaskFormProps> = ({
  projectId,
  initialData,
  onSubmit,
  onCancel,
  isLoading
}) => {
  const [formData, setFormData] = useState({
    title: "",
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title,
      });
    }
    // Auto-focus input when form opens
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [initialData]);

  // Handle click outside to cancel
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (formRef.current && !formRef.current.contains(event.target as Node)) {
        onCancel();
      }
    };

    // Add event listener when component mounts
    document.addEventListener('mousedown', handleClickOutside);

    // Cleanup event listener when component unmounts
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onCancel]);

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

    // Clear form and focus input for next task
    setFormData({ title: "" });
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e as any);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex items-center space-x-3">
      {/* Task Title Input */}
      <div className="flex-1">
        <input
          ref={inputRef}
          type="text"
          name="title"
          value={formData.title}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
          placeholder="Masukkan task..."
          required
        />
      </div>

      {/* Form Actions */}
      <div className="flex items-center space-x-2">
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={!formData.title.trim()}
          loading={isLoading}
          loadingText=""
        >
          +
        </Button>
      </div>
    </form>
  );
};

export default TaskForm;
