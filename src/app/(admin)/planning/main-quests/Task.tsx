import React, { useEffect } from 'react';
import { useTasks } from './hooks/useMainQuestsSWR';
import TaskItem from './Task/components/TaskItem';
import { TaskItemSkeleton } from '@/components/ui/skeleton';
import { addTask, updateTask } from './actions/taskActions';

interface Task {
  id: string;
  title: string;
  status: 'TODO' | 'DONE';
  parent_task_id?: string | null;
  display_order?: number;
}

interface TaskProps {
  milestone: { id: string; title: string };
  milestoneNumber: number;
  onOpenSubtask?: (task: Task) => void;
  activeSubTask: Task | null;
  showCompletedTasks: boolean;
}

export default function Task({ milestone, milestoneNumber, onOpenSubtask, activeSubTask, showCompletedTasks }: TaskProps) {
  const {
    tasks,
    isLoading: loadingTasks,
    error: tasksError,
    mutate: refetchTasks,
  } = useTasks(milestone.id);

  // For now, keep the old state management for task editing
  // TODO: Migrate task editing to use SWR and RPC
  const [newTaskInputs, setNewTaskInputs] = React.useState(['', '', '']);
  const [newTaskLoading, setNewTaskLoading] = React.useState([false, false, false]);
  const [activeTaskIdx, setActiveTaskIdx] = React.useState(0);

  // Task action functions
  const handleSaveTask = async (idx: number) => {
    const val = newTaskInputs[idx];
    if (!val.trim()) return;

    setNewTaskLoading(l => l.map((v, i) => i === idx ? true : v));
    try {
      const formData = new FormData();
      formData.append('milestone_id', milestone.id);
      formData.append('title', val.trim());
      formData.append('display_order', String(idx + 1));
      
      await addTask(formData);
      
      refetchTasks();
      setNewTaskInputs(inputs => inputs.map((v, i) => i === idx ? '' : v));
    } catch (error) {
      console.error('Failed to save task:', error);
    } finally {
      setNewTaskLoading(l => l.map((v, i) => i === idx ? false : v));
    }
  };

  const handleTaskEdit = async (taskId: string, newTitle: string) => {
    try {
      await updateTask(taskId, newTitle);
      refetchTasks();
    } catch (error) {
      console.error('Failed to update task:', error);
      throw error;
    }
  };

  const handleNavigateUp = (currentIdx: number) => {
    if (currentIdx > 0) {
      setActiveTaskIdx(currentIdx - 1);
    }
  };

  const handleNavigateDown = (currentIdx: number) => {
    if (currentIdx < 2) {
      setActiveTaskIdx(currentIdx + 1);
    }
  };

  // Filter tasks based on showCompletedTasks state
  const filteredTasks = showCompletedTasks 
    ? tasks 
    : tasks.filter((task: any) => task.status !== 'DONE');

  if (loadingTasks) {
    return (
      <div className="rounded-lg mb-2">
        <label className="block mb-2 font-semibold">Langkah selanjutnya untuk mecapai Milestone {milestoneNumber} :</label>
        <div className="space-y-2 mb-2">
          {Array.from({ length: 3 }).map((_, idx) => (
            <TaskItemSkeleton
              key={`loading-task-${milestone.id}-${idx}`}
              orderNumber={idx + 1}
              showButton={true}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg mb-2">
      <label className="block mb-2 font-semibold">Langkah selanjutnya untuk mecapai Milestone {milestoneNumber} :</label>
      <div className="space-y-2 mb-2">
        {Array.from({ length: 3 }).map((_, idx) => {
            const task = filteredTasks.find((t: any) => t.display_order === idx + 1);
            if (task) {
              return (
                <TaskItem
                  key={task.id}
                  task={task}
                  onOpenSubtask={onOpenSubtask ? () => onOpenSubtask(task) : undefined}
                  active={activeSubTask?.id === task.id}
                  orderNumber={idx + 1}
                  onNavigateUp={() => handleNavigateUp(idx)}
                  onNavigateDown={() => handleNavigateDown(idx)}
                  canNavigateUp={idx > 0}
                  canNavigateDown={idx < 2}
                  onEdit={handleTaskEdit}
                  onClearActiveTaskIdx={() => setActiveTaskIdx(-1)}
                  onTaskUpdate={refetchTasks}
                />
              );
            } else {
              // Render empty input slot for new task
              return (
                <div
                  key={`empty-task-${milestone.id}-${idx}`}
                  className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-lg mb-3 pl-2 pr-4 py-2 shadow-sm border border-gray-200 dark:border-gray-700 hover:border-gray-300 transition group"
                >
                  <div className='flex gap-2 w-full items-center mr-2'>
                    <span className="font-medium text-lg w-6 text-center select-none">{idx + 1}.</span>
                    <input
                      className="border rounded px-2 py-1 text-sm w-full bg-white dark:bg-gray-900 font-medium focus:outline-none transition-all"
                      value={newTaskInputs[idx]}
                      onChange={(e) => {
                        const newInputs = [...newTaskInputs];
                        newInputs[idx] = e.target.value;
                        setNewTaskInputs(newInputs);
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSaveTask(idx);
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          if (idx > 0) {
                            handleNavigateUp(idx);
                          }
                        } else if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          if (idx < 2) {
                            handleNavigateDown(idx);
                          }
                        }
                      }}
                      placeholder={`Masukkan langkah ${idx + 1} untuk milestone ini...`}
                      data-task-idx={idx}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveTask(idx);
                      }}
                      disabled={!newTaskInputs[idx].trim() || newTaskLoading[idx]}
                      className="px-3 py-1.5 text-xs bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-1 w-16 justify-center"
                      title="Klik untuk menyimpan atau tekan Enter"
                    >
                      {newTaskLoading[idx] ? (
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
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Add
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            }
          })
        }
      </div>
    </div>
  );
}
