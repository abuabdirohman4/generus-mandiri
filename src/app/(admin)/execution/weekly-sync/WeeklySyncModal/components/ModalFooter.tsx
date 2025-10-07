import React from 'react';
import { FaCheck, FaTimes, FaExpand, FaCompress } from 'react-icons/fa';

import Button from '@/components/ui/button/Button';
import type { ModalFooterProps } from '../types';

export const ModalFooter: React.FC<ModalFooterProps> = ({
  selectedItems,
  handleSelectAll,
  handleClearAll,
  handleExpandAll,
  handleCollapseAll,
  onClose,
  handleSave,
  loading,
  hierarchicalData
}) => {
  return (
    <div className="sticky bottom-0 left-0 right-0 bg-white dark:bg-gray-900 pt-4 mt-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between z-10">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {selectedItems.length} item dipilih
        </div>
        <div className="flex gap-2 flex-wrap bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
          <Button
            size="sm"
            variant="primary"
            onClick={() => handleSelectAll(hierarchicalData)}
            className="text-xs flex items-center gap-1 hover:bg-blue-600 hover:text-white transition-colors"
            aria-label="Pilih semua item"
          >
            <FaCheck className="w-3 h-3" /> Select All
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleClearAll}
            className="text-xs flex items-center gap-1 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Kosongkan semua pilihan"
          >
            <FaTimes className="w-3 h-3" /> Clear All
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExpandAll}
            className="text-xs flex items-center gap-1 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Expand semua quest dan milestone"
          >
            <FaExpand className="w-3 h-3" /> Expand All
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCollapseAll}
            className="text-xs flex items-center gap-1 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Collapse semua quest dan milestone"
          >
            <FaCompress className="w-3 h-3" /> Collapse All
          </Button>
        </div>
      </div>
      <div className="flex space-x-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onClose}
          disabled={loading}
        >
          Batal
        </Button>
        <Button
          size="sm"
          variant="primary"
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? 'Menyimpan...' : 'Simpan Fokus'}
        </Button>
      </div>
    </div>
  );
};
