import React, { useState, useEffect, useRef } from 'react';
import Checkbox from '@/components/form/input/Checkbox';

interface Milestone {
  id: string;
  title: string;
  display_order: number;
  status?: 'TODO' | 'DONE';
}

interface MilestoneItemProps {
  milestone: Milestone | null;
  idx: number;
  activeMilestoneIdx: number;
  newMilestoneInputs: string[];
  setNewMilestoneInputs: React.Dispatch<React.SetStateAction<string[]>>;
  newMilestoneLoading: boolean[];
  milestoneLoading: Record<string, boolean>;
  milestoneChanges: Record<string, boolean>;
  setActiveMilestoneIdx: (idx: number) => void;
  handleSaveNewMilestone: (idx: number) => void;
  handleSaveMilestone: (id: string, val: string) => void;
  handleMilestoneChange: (id: string, newTitle: string) => void;
  onStatusToggle?: (id: string, currentStatus: 'TODO' | 'DONE') => void;
  onClearActiveMilestoneIdx?: () => void;
}

export default function MilestoneItem({
  milestone,
  idx,
  activeMilestoneIdx,
  newMilestoneInputs,
  setNewMilestoneInputs,
  newMilestoneLoading,
  milestoneLoading,
  milestoneChanges,
  setActiveMilestoneIdx,
  handleSaveNewMilestone,
  handleSaveMilestone,
  handleMilestoneChange,
  onStatusToggle,
  onClearActiveMilestoneIdx,
}: MilestoneItemProps) {
  const [editValue, setEditValue] = useState(milestone ? milestone.title : newMilestoneInputs[idx]);
  const [hasChanges, setHasChanges] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [optimisticStatus, setOptimisticStatus] = useState<'TODO' | 'DONE' | null>(null);
  
  const isActive = activeMilestoneIdx === idx;
  const isLoading = milestone ? milestoneLoading[milestone.id] : newMilestoneLoading[idx];
  const canSave = hasChanges && !isLoading;
  const editInputRef = useRef<HTMLInputElement | null>(null);
  
  // Check if milestone has content (like TaskItem)
  const hasContent = milestone ? milestone.title.trim().length > 0 : false;

  // Sync editValue with props changes
  useEffect(() => {
    if (milestone) {
      setEditValue(milestone.title);
    } else {
      setEditValue(newMilestoneInputs[idx]);
    }
  }, [milestone, newMilestoneInputs, idx]);

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setEditValue(newValue);
    setHasChanges(newValue.trim() !== (milestone ? milestone.title : ''));
    setIsEditing(true);
    
    // Sync editValue to newMilestoneInputs for new milestones
    if (!milestone) {
      setNewMilestoneInputs(inputs => inputs.map((v, i) => i === idx ? newValue : v));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (canSave) {
        handleSave();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (idx > 0) {
        setActiveMilestoneIdx(idx - 1);
        setTimeout(() => {
          const prevInput = document.querySelector(`input[data-milestone-idx="${idx - 1}"]`) as HTMLInputElement;
          prevInput?.focus();
        }, 0);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (idx < 2) {
        setActiveMilestoneIdx(idx + 1);
        setTimeout(() => {
          const nextInput = document.querySelector(`input[data-milestone-idx="${idx + 1}"]`) as HTMLInputElement;
          nextInput?.focus();
        }, 0);
      }
    }
  };

  const handleSave = async () => {
    if (milestone) {
      if (editValue.trim() === milestone.title.trim()) {
        setHasChanges(false);
        setIsEditing(false);
        return; // No changes
      }
      await handleSaveMilestone(milestone.id, editValue);
      setHasChanges(false);
      setIsEditing(false);
      } else {
        if (!editValue.trim()) {
          setHasChanges(false);
          setIsEditing(false);
          return; // No changes
        }
        await handleSaveNewMilestone(idx);
        setHasChanges(false);
        setIsEditing(false);
      }
  };

  const handleFocus = () => {
    setActiveMilestoneIdx(idx);
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
      setTimeout(() => {
        editInputRef.current?.focus();
      }, 0);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (canSave) {
      handleSave();
    }
  };

  const handleStatusToggle = async () => {
    if (!milestone || !onStatusToggle) return;
    
    const currentStatus = optimisticStatus || milestone.status || 'TODO';
    const newStatus = currentStatus === 'DONE' ? 'TODO' : 'DONE';
    
    // Optimistic update
    setOptimisticStatus(newStatus);
    
    try {
      await onStatusToggle(milestone.id, currentStatus);
    } catch (error) {
      // Revert on error
      setOptimisticStatus(currentStatus);
      console.error('Failed to toggle milestone status:', error);
    }
  };

  return (
    <div
      className={`w-full rounded-lg border px-4 py-3 transition-all duration-150 shadow-sm mb-0 bg-white dark:bg-gray-900 flex items-center cursor-pointer gap-2 group hover:shadow-md ${
        isActive 
          ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/10' 
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
      }`}
      onClick={() => {
        onClearActiveMilestoneIdx?.();
        setActiveMilestoneIdx(idx);
      }}
    >
      <span className="font-bold text-lg w-6 text-center select-none">{idx + 1}.</span>
      
      <div className="flex gap-2 w-full">
        {milestone ? (
          hasContent && !isEditing ? (
            <div className="flex items-center justify-between w-full gap-2">
              <span 
                className={`border rounded px-2 py-1 text-sm flex-1 bg-white dark:bg-gray-900 font-medium cursor-text focus:outline-none transition-all ${
                  (optimisticStatus || milestone.status) === 'DONE' ? 'line-through text-gray-400' : ''
                }`}
                onClick={handleTextClick}
              >
                {milestone.title}
              </span>
              <Checkbox 
                checked={(optimisticStatus || milestone.status) === 'DONE'} 
                onChange={handleStatusToggle} 
              />
            </div>
          ) : (
            <div className="flex items-center w-full gap-2">
              <input
                className={`border rounded px-2 py-2 text-sm flex-1 bg-white dark:bg-gray-900 font-semibold focus:outline-none transition-all ${
                  (optimisticStatus || milestone.status) === 'DONE' ? 'line-through text-gray-400' : ''
                }`}
                value={editValue}
                onChange={handleEditChange}
                onKeyDown={handleKeyDown}
                onBlur={handleInputBlur}
                onClick={e => e.stopPropagation()}
                onFocus={handleFocus}
                ref={editInputRef}
                data-milestone-idx={idx}
                disabled={isLoading}
              />
              {isEditing && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleClick}
                    disabled={!hasChanges || isLoading}
                    className="px-3 py-1.5 text-xs bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-1 w-16 justify-center"
                    title="Klik untuk menyimpan atau tekan Enter"
                  >
                    {isLoading ? (
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
          )
        ) : (
          <>
            <input
              className="border rounded px-2 py-2 text-sm flex-1 bg-white dark:bg-gray-900 font-semibold focus:outline-none transition-all"
              value={editValue}
              onChange={handleEditChange}
              onKeyDown={handleKeyDown}
              onBlur={handleInputBlur}
              onClick={e => e.stopPropagation()}
              onFocus={handleFocus}
              ref={editInputRef}
              data-milestone-idx={idx}
              placeholder={`Tambah milestone ${idx + 1}...`}
              disabled={isLoading}
            />
            <button
              onClick={handleClick}
              disabled={!canSave}
              className="px-3 py-1.5 text-xs bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-1 w-16 justify-center"
              title="Klik untuk menyimpan atau tekan Enter"
            >
              {isLoading ? (
                <>
                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
