"use client";
import React from "react";
import { WorkQuestListProps } from "../types";

const WorkQuestList: React.FC<WorkQuestListProps> = ({
  workQuests,
  onEdit,
  onDelete
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DONE':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'TODO':
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'DONE':
        return 'Selesai';
      case 'TODO':
      default:
        return 'Belum Selesai';
    }
  };

  if (workQuests.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500 dark:text-gray-400 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          Belum ada Work Quest
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Mulai buat Work Quest pertama Anda untuk mengelola task pekerjaan
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {workQuests.map((quest) => (
        <div
          key={quest.id}
          className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          {/* Main Task Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                {quest.title}
              </h3>
              {quest.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {quest.description}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(quest.status)}`}>
                {getStatusText(quest.status)}
              </span>
              <div className="flex space-x-1">
                <button
                  onClick={() => onEdit(quest)}
                  className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                  title="Edit"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => onDelete(quest.id)}
                  className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                  title="Hapus"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Tasks */}
          {quest.tasks && quest.tasks.length > 0 && (
            <div className="mt-3">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tasks ({quest.tasks.length})
              </h4>
              <div className="space-y-2">
                {quest.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-md p-3"
                  >
                    <div className="flex-1">
                      <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {task.title}
                      </h5>
                      {task.description && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {task.description}
                        </p>
                      )}
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                      {getStatusText(task.status)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default WorkQuestList;
