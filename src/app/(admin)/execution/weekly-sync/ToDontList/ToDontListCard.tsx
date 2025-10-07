"use client";

import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import React, { useEffect, useState, useRef, forwardRef } from "react";

import ComponentCard from "@/components/common/ComponentCard";
import { toast } from 'sonner';

import { addWeeklyRule, updateWeeklyRule, deleteWeeklyRule, updateWeeklyRuleOrder } from "../actions/weeklyRulesActions";
import type { ToDontListCardProps, Rule } from "./types";

// Custom hook for rule editing management
function useRuleEditing() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [focusRuleId, setFocusRuleId] = useState<string | null>(null);
  const [focusRuleIdAfterInsert, setFocusRuleIdAfterInsert] = useState<string | null>(null);

  return {
    editingId,
    setEditingId,
    editingText,
    setEditingText,
    focusRuleId,
    setFocusRuleId,
    focusRuleIdAfterInsert,
    setFocusRuleIdAfterInsert
  };
}

// Custom hook for new rule management
function useNewRuleManagement(year: number, quarter: number, weekNumber: number, rules: Rule[], onRefresh: () => void) {
  const [newRule, setNewRule] = useState("");
  const [newRuleLoading, setNewRuleLoading] = useState(false);
  const [loadingInsertAt, setLoadingInsertAt] = useState<number | null>(null);

  const handleAddRule = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newRule.trim()) return;
    setNewRuleLoading(true);
    const formData = new FormData();
    formData.append("rule_text", newRule);
    formData.append("year", String(year));
    formData.append("quarter", String(quarter));
    formData.append("week_number", String(weekNumber));
    const res = await addWeeklyRule(formData);
    if (res.success) {
      setNewRule("");
      // FIXED: Always refresh after successful operation
      onRefresh();
    } else {
      toast.error(`Gagal ${res.message}`);
    }
    setNewRuleLoading(false);
  };

  const handleBulkPaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text');
    const lines = pastedText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length <= 1) return;
    e.preventDefault();
    setNewRuleLoading(true);
    for (const line of lines) {
      const formData = new FormData();
      formData.append("rule_text", line);
      formData.append("year", String(year));
      formData.append("quarter", String(quarter));
      formData.append("week_number", String(weekNumber));
      await addWeeklyRule(formData);
    }
    setNewRule("");
    // FIXED: Always refresh after bulk operations
    onRefresh();
    setNewRuleLoading(false);
  };

  const handleAddEmptyRuleAt = async (idx: number) => {
    setLoadingInsertAt(idx + 1);
    const newOrder = (rules[rules.length - 1]?.display_order ?? 0) + 1;
    const formData = new FormData();
    formData.append("rule_text", "");
    formData.append("year", String(year));
    formData.append("quarter", String(quarter));
    formData.append("week_number", String(weekNumber));
    formData.append("display_order", String(newOrder));
    const res = await addWeeklyRule(formData);
    if (res.success) {
      // FIXED: Always refresh after successful operation
      onRefresh();
    } else {
      toast.error(`Gagal menambah aturan ${res.message}`);
    }
    setLoadingInsertAt(null);
  };

  return {
    newRule,
    setNewRule,
    newRuleLoading,
    loadingInsertAt,
    handleAddRule,
    handleBulkPaste,
    handleAddEmptyRuleAt
  };
}

// Custom hook for rule operations
function useRuleOperations(rules: Rule[], onRefresh: () => void) {
  const handleSaveEdit = async (id: string, editingId: string | null, editingText: string, setEditingId: (id: string | null) => void, setEditingText: (text: string) => void) => {
    if (editingId !== id) return;
    const rule = rules.find(r => r.id === id);
    if (!rule || editingText.trim() === rule.rule_text) {
      setEditingId(null);
      setEditingText("");
      return;
    }
    const res = await updateWeeklyRule(id, editingText.trim());
    if (res.success) {
      // FIXED: Always refresh after successful update
      onRefresh();
    } else {
      toast.error(`Gagal ${res.message}`);
    }
    setEditingId(null);
    setEditingText("");
  };

  const handleDelete = async (id: string) => {
    const res = await deleteWeeklyRule(id);
    if (res.success) {
      // FIXED: Always refresh after successful deletion
      onRefresh();
    } else {
      toast.error(`Gagal ${res.message}`);
      // Still refresh even on error to ensure UI consistency
      onRefresh();
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = rules.findIndex(r => r.id === active.id);
    const newIndex = rules.findIndex(r => r.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const newRules = arrayMove(rules, oldIndex, newIndex).map((r, idx) => ({ ...r, display_order: idx + 1 }));
    const res = await updateWeeklyRuleOrder(newRules.map(r => ({ id: r.id, display_order: r.display_order })));
    if (res.success) {
      // FIXED: Always refresh after successful reorder
      onRefresh();
    } else {
      toast.error(`Gagal update urutan ${res.message}`);
      // Still refresh even on error to ensure UI consistency
      onRefresh();
    }
  };

  return {
    handleSaveEdit,
    handleDelete,
    handleDragEnd
  };
}

// Component for sortable rule item
const SortableRuleItem = forwardRef<HTMLInputElement, {
  rule: Rule;
  editingId: string | null;
  editingText: string;
  setEditingId: (id: string | null) => void;
  setEditingText: (text: string) => void;
  handleSaveEdit: (id: string) => void;
  handleDelete: (id: string) => void;
  setFocusRuleId: (id: string | null) => void;
  focusRuleId: string | null;
  focusInputAbove: (idx: number) => void;
  isLastItem: boolean;
  handleAddEmptyRuleAt: () => void;
  handleBulkPasteLast: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  focusRuleIdAfterInsert: string | null;
  setFocusRuleIdAfterInsert: (id: string | null) => void;
  idx: number;
  inputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
}>(
  ({ rule, editingId, editingText, setEditingId, setEditingText, handleSaveEdit, handleDelete, setFocusRuleId, focusRuleId, focusInputAbove, isLastItem, handleAddEmptyRuleAt, handleBulkPasteLast, focusRuleIdAfterInsert, setFocusRuleIdAfterInsert, idx, inputRefs }, ref) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: rule.id });
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.7 : 1,
      zIndex: isDragging ? 20 : 'auto',
      background: 'inherit',
    };
    useEffect(() => {
      if ((focusRuleId === rule.id || focusRuleIdAfterInsert === rule.id) && ref && typeof ref !== 'function' && ref.current) {
        ref.current.focus();
        if (focusRuleIdAfterInsert === rule.id) setFocusRuleIdAfterInsert(null);
      }
    }, [focusRuleId, focusRuleIdAfterInsert, rule.id, ref, setFocusRuleIdAfterInsert]);
    return (
      <div ref={setNodeRef} style={style} className="flex items-center py-2 px-4 group w-full">
        <span {...attributes} {...listeners} className="flex items-center cursor-grab select-none mr-2 text-gray-400 hover:text-gray-600">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="4" y="6" width="12" height="1.5" rx="0.75" fill="currentColor" /><rect x="4" y="9.25" width="12" height="1.5" rx="0.75" fill="currentColor" /><rect x="4" y="12.5" width="12" height="1.5" rx="0.75" fill="currentColor" /></svg>
        </span>
        <span className="w-6 mr-2 select-none text-right">{idx + 1}.</span>
        <input
          ref={ref}
          className="flex-1 border rounded px-2 py-1 mr-2 dark:bg-gray-800"
          value={editingId === rule.id ? editingText : rule.rule_text}
          onChange={e => {
            setEditingId(rule.id);
            setEditingText(e.target.value);
          }}
          onFocus={() => setFocusRuleId(rule.id)}
          onBlur={() => {
            if (editingId === rule.id) handleSaveEdit(rule.id);
          }}
          onKeyDown={e => {
            if (e.key === "Enter") handleAddEmptyRuleAt();
            if (e.key === "Enter") handleSaveEdit(rule.id);
            if (e.key === "Escape") setEditingId(null);
            if ((e.key === "Backspace" || e.key === "Delete") && (editingId === rule.id ? editingText : rule.rule_text).length === 0) {
              e.preventDefault();
              handleDelete(rule.id);
              focusInputAbove(rule.display_order - 1);
            }
            if (e.key === "ArrowUp" && idx > 0) {
              e.preventDefault();
              inputRefs.current[idx - 1]?.focus();
            }
            if (e.key === "ArrowDown" && inputRefs.current[idx + 1]) {
              e.preventDefault();
              inputRefs.current[idx + 1]?.focus();
            }
          }}
          onPaste={isLastItem ? handleBulkPasteLast : undefined}
        />
      </div>
    );
  }
);
SortableRuleItem.displayName = "SortableRuleItem";

// Component for empty state input
function EmptyStateInput({ 
  newRule, 
  setNewRule, 
  handleAddRule, 
  handleBulkPaste, 
  newRuleLoading, 
  inputRefs 
}: {
  newRule: string;
  setNewRule: (value: string) => void;
  handleAddRule: (e?: React.FormEvent) => void;
  handleBulkPaste: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  newRuleLoading: boolean;
  inputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
}) {
  return (
    <div className="flex items-center py-2 group w-full">
      <span className="w-6 mr-1" />
      <input
        ref={el => { inputRefs.current[0] = el; }}
        className="flex-1 border rounded px-2 py-1 mr-2 dark:bg-gray-800"
        value={newRule}
        onChange={e => setNewRule(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter") {
            handleAddRule();
            setNewRule("");
          }
        }}
        onPaste={handleBulkPaste}
        placeholder="Masukkan aturan..."
        disabled={newRuleLoading}
        // autoFocus
      />
    </div>
  );
}

// Component for loading skeleton
function LoadingSkeleton() {
  return (
    <div className="flex items-center py-2 group w-full animate-pulse">
      <span className="w-6 mr-2" />
      <div className="flex-1 h-8 bg-gray-200 dark:bg-gray-700 rounded" />
    </div>
  );
}

const ToDontListCard: React.FC<ToDontListCardProps> = ({ year, quarter, weekNumber, rules, loading, onRefresh }) => {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  const {
    editingId,
    setEditingId,
    editingText,
    setEditingText,
    focusRuleId,
    setFocusRuleId,
    focusRuleIdAfterInsert,
    setFocusRuleIdAfterInsert
  } = useRuleEditing();
  
  const {
    newRule,
    setNewRule,
    newRuleLoading,
    loadingInsertAt,
    handleAddRule,
    handleBulkPaste,
    handleAddEmptyRuleAt
  } = useNewRuleManagement(year, quarter, weekNumber, rules, onRefresh);
  
  const {
    handleSaveEdit,
    handleDelete,
    handleDragEnd
  } = useRuleOperations(rules, onRefresh);

  // Fokus ke input atas setelah hapus
  const focusInputAbove = (idx: number) => {
    setTimeout(() => {
      if (inputRefs.current[idx - 1]) inputRefs.current[idx - 1]?.focus();
    }, 100);
  };

  // Bulk paste handler untuk input terakhir
  const handleBulkPasteLast = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text');
    const lines = pastedText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length <= 1) return;
    e.preventDefault();
    for (const line of lines) {
      const formData = new FormData();
      formData.append("rule_text", line);
      formData.append("year", String(year));
      formData.append("quarter", String(quarter));
      formData.append("week_number", String(weekNumber));
      await addWeeklyRule(formData);
    }
    onRefresh();
  };

  return (
    <ComponentCard title="To Don't List" classNameTitle='text-center text-xl !font-extrabold' classNameHeader="pt-8 pb-0" className="my-6">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={rules.map(r => r.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-1">
            {loading ? (
              <LoadingSkeleton />
            ) : rules.length === 0 ? (
              <EmptyStateInput
                newRule={newRule}
                setNewRule={setNewRule}
                handleAddRule={handleAddRule}
                handleBulkPaste={handleBulkPaste}
                newRuleLoading={newRuleLoading}
                inputRefs={inputRefs}
              />
            ) : (
              rules.map((rule, idx) => (
                <React.Fragment key={rule.id}>
                  <SortableRuleItem
                    rule={rule}
                    editingId={editingId}
                    editingText={editingText}
                    setEditingId={setEditingId}
                    setEditingText={setEditingText}
                    handleSaveEdit={(id) => handleSaveEdit(id, editingId, editingText, setEditingId, setEditingText)}
                    handleDelete={handleDelete}
                    setFocusRuleId={setFocusRuleId}
                    focusRuleId={focusRuleId}
                    focusInputAbove={focusInputAbove}
                    ref={el => { inputRefs.current[idx] = el; }}
                    isLastItem={idx === rules.length - 1}
                    handleAddEmptyRuleAt={() => handleAddEmptyRuleAt(idx)}
                    handleBulkPasteLast={handleBulkPasteLast}
                    focusRuleIdAfterInsert={focusRuleIdAfterInsert}
                    setFocusRuleIdAfterInsert={setFocusRuleIdAfterInsert}
                    idx={idx}
                    inputRefs={inputRefs}
                  />
                  {loadingInsertAt === idx + 1 && (
                    <LoadingSkeleton key={`skeleton-${idx + 1}`} />
                  )}
                </React.Fragment>
              ))
            )}
            {newRuleLoading ? <LoadingSkeleton /> : null}
          </div>
        </SortableContext>
      </DndContext>
    </ComponentCard>
  );
};

export default ToDontListCard; 