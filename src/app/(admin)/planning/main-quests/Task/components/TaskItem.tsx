import React, { useState, useRef } from 'react';
import { updateTaskStatus } from '../../actions/taskActions';
import Checkbox from '@/components/form/input/Checkbox';
import { toast } from 'sonner';

interface Task {
  id: string;
  title: string;
  status: 'TODO' | 'DONE';
  parent_task_id?: string | null;
  display_order?: number;
}

interface TaskItemProps {
  task: Task;
  onOpenSubtask?: () => void;
  orderNumber?: number;
  active?: boolean;
  onNavigateUp?: () => void;
  onNavigateDown?: () => void;
  canNavigateUp?: boolean;
  canNavigateDown?: boolean;
  onEdit: (taskId: string, newTitle: string) => void;
  onClearActiveTaskIdx?: () => void;
  onTaskUpdate?: () => void; // Optional callback for SWR refresh
}

export default function TaskItem({ 
  task, 
  onOpenSubtask, 
  orderNumber, 
  active, 
  onNavigateUp, 
  onNavigateDown, 
  canNavigateUp = true, 
  canNavigateDown = true,
  onEdit,
  onClearActiveTaskIdx,
  onTaskUpdate
}: TaskItemProps) {
  const [editValue, setEditValue] = useState(task.title);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [optimisticStatus, setOptimisticStatus] = useState<'TODO' | 'DONE' | null>(null);
  const editInputRef = useRef<HTMLInputElement | null>(null);

  const hasContent = task.title.trim().length > 0;
  
  // Use optimistic status if available, otherwise use task status
  const isCompleted = (optimisticStatus || task.status) === 'DONE';

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setEditValue(newValue);
    setHasChanges(newValue.trim() !== task.title);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (editValue.trim() === task.title) {
      setHasChanges(false);
      setIsEditing(false);
      return; // No changes
    }
    
    setIsSaving(true);
    try {
      await onEdit(task.id, editValue.trim());
      setHasChanges(false);
      setIsEditing(false);
    } catch (error) {
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusTask = async () => {
    const newStatus = task.status === 'DONE' ? 'TODO' : 'DONE';
    
    // Optimistic update - update UI immediately
    setOptimisticStatus(newStatus);
    
    try {
      const res = await updateTaskStatus(task.id, newStatus);
      if (res) {
        onTaskUpdate?.();
        toast.success(`Task ${newStatus === 'DONE' ? 'selesai' : 'dibuka kembali'}`);
      } else {
        toast.error('Gagal update status');
      }
    } catch (error) {
      // Revert optimistic update on error
      console.error('Failed to toggle task status:', error);
    }
  };

  const handleInputFocus = () => {
    setIsEditing(true);
    onOpenSubtask?.();
  };

  const handleInputBlur = () => {
    if (hasChanges) {
      handleSave();
    } else {
      setIsEditing(false);
    }
  };

  const handleTextClick = () => {
    if (hasContent) {
      setIsEditing(true);
      // Focus the input after a short delay to ensure it's rendered
      setTimeout(() => {
        editInputRef.current?.focus();
      }, 0);
    }
  };

  return (
    <div 
      className={`flex items-center justify-between bg-white dark:bg-gray-900 rounded-lg mb-3 px-2 py-2 shadow-sm border transition group hover:shadow-md cursor-pointer ${
        active ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/10' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
      }`}
      onClick={() => {
        onClearActiveTaskIdx?.();
        onOpenSubtask?.();
      }}
    >
      <div className='flex gap-2 w-full items-center mr-2'>
        {orderNumber ? <span className={`font-medium text-lg w-6 text-center select-none ${task.status === 'DONE' ? 'line-through text-gray-400' : ''}`}>{orderNumber}.</span> : null}
        
        {hasContent && !isEditing ? (
          <div className="flex items-center justify-between w-full gap-2">
            <span 
              className={`border rounded px-2 py-1 text-sm flex-1 bg-white dark:bg-gray-900 font-medium cursor-text focus:outline-none transition-all ${task.status === 'DONE' ? 'line-through text-gray-400' : ''}`}
              onClick={handleTextClick}
            >
              {task.title}
            </span>
            <Checkbox checked={isCompleted} onChange={handleStatusTask} />
          </div>
        ) : (
          <div className="flex items-center w-full gap-2">
            <input
              className="border rounded px-2 py-1 text-sm flex-1 bg-white dark:bg-gray-900 font-medium focus:outline-none transition-all"
              value={editValue}
              onChange={handleEditChange}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSave();
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  if (canNavigateUp && onNavigateUp) {
                    onNavigateUp();
                  }
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  if (canNavigateDown && onNavigateDown) {
                    onNavigateDown();
                  }
                }
              }}
              onBlur={handleInputBlur}
              onClick={e => {
                e.stopPropagation();
                onOpenSubtask?.();
              }}
              onFocus={handleInputFocus}
              ref={editInputRef}
              data-task-idx={orderNumber ? orderNumber - 1 : 0}
              placeholder=""
            />
            {isEditing && (
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSave();
                  }}
                  disabled={!hasChanges || isSaving}
                  className="px-3 py-1.5 text-xs bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-1 w-16 justify-center"
                  title="Klik untuk menyimpan atau tekan Enter"
                >
                  {isSaving ? (
                    <>
                      <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                      </svg>
                      Editing...
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
