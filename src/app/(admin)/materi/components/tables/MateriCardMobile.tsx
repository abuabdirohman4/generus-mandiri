'use client';

import { useState } from 'react';
import { MaterialItem, MaterialType } from '../../types';

interface MateriCardMobileProps {
    item: MaterialItem;
    types: MaterialType[];
    isAdmin?: boolean;
    onEdit?: (item: MaterialItem) => void;
    onDelete?: (item: MaterialItem) => void;
}

export default function MateriCardMobile({ item, types, isAdmin, onEdit, onDelete }: MateriCardMobileProps) {
    const [showMenu, setShowMenu] = useState(false);
    const type = types.find(t => t.id === item.material_type_id);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border shadow-sm relative">
            <div className="flex items-start justify-between gap-3">
                <h3 className="font-medium text-gray-900 dark:text-white flex-1">
                    {item.name}
                </h3>

                {/* Three-dot menu for admin */}
                {isAdmin && (
                    <div className="relative">
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                            </svg>
                        </button>

                        {/* Dropdown menu */}
                        {showMenu && (
                            <>
                                {/* Backdrop to close menu */}
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setShowMenu(false)}
                                />

                                {/* Menu */}
                                <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
                                    <button
                                        onClick={() => {
                                            setShowMenu(false);
                                            onEdit?.(item);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 rounded-t-lg"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowMenu(false);
                                            onDelete?.(item);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 rounded-b-lg"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        Hapus
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
                {/* <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-xs whitespace-nowrap">
                    {type?.name || '-'}
                </span> */}
            </div>
            {/* {item.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {item.description}
                </p>
            )} */}
        </div>
    );
}
