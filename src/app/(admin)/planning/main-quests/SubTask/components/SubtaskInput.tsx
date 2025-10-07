import React, { useEffect, useRef } from 'react';
import Checkbox from '@/components/form/input/Checkbox';

interface Subtask {
  id: string;
  title: string;
  status: 'TODO' | 'DONE';
  display_order: number;
}

interface SubtaskInputProps {
  subtask: Subtask;
  idx: number;
  setEditSubtaskId: (id: string) => void;
  setFocusSubtaskId: (id: string | null) => void;
  handleSubtaskEnter: (idx: number, title?: string) => void;
  handleSubtaskEnterWithOverride?: (idx: number, title: string, subtasksOverride: Subtask[]) => Promise<number>;
  handleCheck: (subtask: Subtask) => void;
  shouldFocus: boolean;
  clearFocusSubtaskId: () => void;
  draftTitle: string;
  onDraftTitleChange: (val: string, immediate?: boolean) => void;
  subtaskIds: string[];
  handleDeleteSubtask: (id: string, idx: number) => void;
}

export default function SubtaskInput({ 
  subtask, 
  idx, 
  setEditSubtaskId, 
  setFocusSubtaskId, 
  handleSubtaskEnter, 
  handleSubtaskEnterWithOverride, 
  handleCheck, 
  shouldFocus, 
  clearFocusSubtaskId, 
  draftTitle, 
  onDraftTitleChange, 
  subtaskIds, 
  handleDeleteSubtask 
}: SubtaskInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  
  useEffect(() => {
    if (shouldFocus && inputRef.current) {
      // 🔧 FIX: Add small delay to prevent focus glitch during rapid changes
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [shouldFocus]);

  const handlePaste = async (e: React.ClipboardEvent) => {
    const pastedText = e.clipboardData.getData('text');
    const lines = pastedText.split('\n').filter(line => line.trim());
    
    if (lines.length <= 1) return;
    
    e.preventDefault();
    
    const firstLine = lines[0];
    const remainingLines = lines.slice(1);
    
    const newTitle = draftTitle + firstLine;
    onDraftTitleChange(newTitle, true);
    
    const localSubtasks = subtaskIds.map((id) => ({
      id,
      title: '',
      status: 'TODO' as const,
      display_order: 0,
    }));
    if (handleSubtaskEnterWithOverride) {
      for (let i = 0; i < remainingLines.length; i++) {
        const idx = localSubtasks.length - 1;
        const newOrder = await handleSubtaskEnterWithOverride(idx, remainingLines[i], localSubtasks);
        localSubtasks.push({
          id: `dummy-paste-${i}`,
          title: remainingLines[i],
          status: 'TODO' as const,
          display_order: newOrder,
        });
      }
    } else {
      for (let i = 0; i < remainingLines.length; i++) {
        handleSubtaskEnter(idx, remainingLines[i]);
      }
    }
  };

  return (
    <div className="flex items-center gap-2 w-full">
      <input
        className={`border rounded px-2 py-1 text-sm flex-1 w-full focus:outline-none focus:ring-0 ${subtask.status === 'DONE' ? 'line-through text-gray-400' : ''}`}
        value={draftTitle}
        onChange={e => onDraftTitleChange(e.target.value, false)}
        onPaste={(e) => handlePaste(e)}
        onFocus={() => {
          setEditSubtaskId(subtask.id);
          setFocusSubtaskId(subtask.id);
        }}
        onBlur={e => {
          const next = e.relatedTarget as HTMLElement | null;
          // 🔧 FIX: Only save if there are actual changes, not on every focus change
          if (e.target.value.trim() !== (subtask.title || '').trim()) {
            onDraftTitleChange(e.target.value, true);
          }
          if (!next || next.tagName !== 'INPUT') {
            clearFocusSubtaskId();
          }
        }}
        onKeyDown={e => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleCheck(subtask);
          } else if (e.key === 'Enter') {
            e.preventDefault();
            onDraftTitleChange(e.currentTarget.value, true);
            // 🔧 FIX: Insert new subtask after current subtask (idx + 1)
            handleSubtaskEnter(idx + 1, '');
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (idx > 0) {
              setFocusSubtaskId(subtaskIds[idx - 1]);
            }
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (idx < subtaskIds.length - 1) {
              setFocusSubtaskId(subtaskIds[idx + 1]);
            }
          } else if ((e.key === 'Backspace' || e.key === 'Delete') && draftTitle === '') {
            e.preventDefault();
            handleDeleteSubtask(subtask.id, idx);
          }
        }}
        ref={inputRef}
      />
      <Checkbox checked={subtask.status === 'DONE'} onChange={() => handleCheck(subtask)} />
    </div>
  );
}
