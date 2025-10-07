import React from 'react';

import type { ModalHeaderProps } from '../types';

export const ModalHeader: React.FC<ModalHeaderProps> = ({ onClose }) => {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        Pilih Fokus Mingguan
      </h3>
      <button
        onClick={onClose}
        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
      >
        ✕
      </button>
    </div>
  );
};
