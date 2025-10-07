import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import SubtaskInput from './SubtaskInput';

interface Subtask {
  id: string;
  title: string;
  status: 'TODO' | 'DONE';
  display_order: number;
}

interface SubtaskItemProps {
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

const HamburgerIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="cursor-grab text-gray-400 hover:text-gray-600">
    <rect x="4" y="6" width="12" height="1.5" rx="0.75" fill="currentColor" />
    <rect x="4" y="9.25" width="12" height="1.5" rx="0.75" fill="currentColor" />
    <rect x="4" y="12.5" width="12" height="1.5" rx="0.75" fill="currentColor" />
  </svg>
);

export default function SubtaskItem({ 
  subtask, 
  idx, 
  handleSubtaskEnterWithOverride, 
  ...props 
}: SubtaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: subtask.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
    zIndex: isDragging ? 20 : 'auto',
    background: 'inherit',
  };
  
  return (
    <div ref={setNodeRef} style={style} className={`flex items-center gap-2 mb-1 bg-white dark:bg-gray-900 w-full`}>
      <span {...attributes} {...listeners} className="flex items-center cursor-grab select-none">
        <HamburgerIcon />
      </span>
      <SubtaskInput
        subtask={subtask}
        idx={idx}
        {...props}
        handleSubtaskEnterWithOverride={handleSubtaskEnterWithOverride}
      />
    </div>
  );
}
