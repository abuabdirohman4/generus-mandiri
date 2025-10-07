import React from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import InputField from '@/components/form/input/InputField';
import SubtaskItem from './SubtaskItem';

interface Subtask {
  id: string;
  title: string;
  status: 'TODO' | 'DONE';
  display_order: number;
}

interface SubtaskListProps {
  subtasks: Subtask[];
  loadingSubtasks: boolean;
  newSubtaskTitle: string;
  setNewSubtaskTitle: (title: string) => void;
  newSubtaskLoading: boolean;
  handleBulkPasteEmpty: (e: React.ClipboardEvent) => void;
  handleSubtaskEnter: (idx: number, title?: string) => void;
  handleSubtaskEnterWithOverride: (idx: number, title: string, subtasksOverride: Subtask[]) => Promise<number>;
  handleCheck: (subtask: Subtask) => void;
  focusSubtaskId: string | null;
  setFocusSubtaskId: (id: string | null) => void;
  draftTitles: Record<string, string>;
  handleDraftTitleChange: (id: string, val: string, immediate?: boolean) => void;
  handleDeleteSubtask: (id: string, idx: number) => Promise<void>;
  handleDragEnd: (event: DragEndEvent) => void;
}

export default function SubtaskList({
  subtasks,
  loadingSubtasks,
  newSubtaskTitle,
  setNewSubtaskTitle,
  newSubtaskLoading,
  handleBulkPasteEmpty,
  handleSubtaskEnter,
  handleSubtaskEnterWithOverride,
  handleCheck,
  focusSubtaskId,
  setFocusSubtaskId,
  draftTitles,
  handleDraftTitleChange,
  handleDeleteSubtask,
  handleDragEnd
}: SubtaskListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  return (
    <div className="mb-4">
      <div className="font-semibold mb-2">List quest untuk langkah ini:</div>
      {loadingSubtasks ? (
        <p className="text-gray-400 text-sm">Memuat sub-tugas...</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={subtasks.map(st => st.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-2 mt-2">
              {subtasks.map((subtask, idx) => (
                <SubtaskItem
                  key={subtask.id}
                  subtask={subtask}
                  idx={idx}
                  setEditSubtaskId={() => {}}
                  setFocusSubtaskId={setFocusSubtaskId}
                  handleSubtaskEnter={handleSubtaskEnter}
                  handleSubtaskEnterWithOverride={handleSubtaskEnterWithOverride}
                  handleCheck={handleCheck}
                  shouldFocus={focusSubtaskId === subtask.id}
                  clearFocusSubtaskId={() => setFocusSubtaskId(null)}
                  draftTitle={draftTitles[subtask.id] ?? subtask.title ?? ''}
                  onDraftTitleChange={(val: string, immediate?: boolean) => handleDraftTitleChange(subtask.id, val, immediate)}
                  subtaskIds={subtasks.map(st => st.id)}
                  handleDeleteSubtask={handleDeleteSubtask}
                />
              ))}
              {subtasks.length === 0 && (
                <InputField
                  key="input-0"
                  name="title-0"
                  placeholder="Tambah sub-tugas baru..."
                  className="flex-1"
                  value={newSubtaskTitle}
                  onChange={e => setNewSubtaskTitle(e.target.value)}
                  onPaste={handleBulkPasteEmpty}
                  disabled={newSubtaskLoading}
                />
              )}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
