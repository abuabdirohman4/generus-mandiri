'use client';

import { useState, useEffect } from 'react';
import { CloseIcon } from '@/lib/icons';
import { saveDayMaterial, getDayMaterial } from '../actions';
import { toast } from 'sonner';
import Button from '@/components/ui/button/Button';
import { getMonthName, Month } from '../types';
import Modal from '@/components/ui/modal';

interface MaterialInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  classMasterId: string;
  semester: number;
  month: number;
  week: number;
  dayOfWeek: number;
  dayName: string;
}

export function MaterialInputModal({
  isOpen,
  onClose,
  classMasterId,
  semester,
  month,
  week,
  dayOfWeek,
  dayName,
}: MaterialInputModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  // Load existing data
  useEffect(() => {
    if (isOpen && classMasterId) {
      loadExistingData();
    }
  }, [isOpen, classMasterId, semester, month, week, dayOfWeek]);

  const loadExistingData = async () => {
    try {
      setLoadingData(true);
      const data = await getDayMaterial(classMasterId, semester, month, week, dayOfWeek);
      
      if (data && data.content) {
        setTitle(data.content.title || '');
        setContent(data.content.content || '');
      } else {
        setTitle('');
        setContent('');
      }
    } catch (error) {
      console.error('Error loading material:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Judul harus diisi');
      return;
    }

    if (!content.trim()) {
      toast.error('Konten harus diisi');
      return;
    }

    try {
      setLoading(true);
      await saveDayMaterial({
        class_master_id: classMasterId,
        semester,
        month,
        week,
        day_of_week: dayOfWeek,
        title: title.trim(),
        content: content.trim(),
      });

      toast.success('Materi berhasil disimpan');
      onClose();
    } catch (error) {
      console.error('Error saving material:', error);
      toast.error('Gagal menyimpan materi');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[600px] m-4">
      <div className="w-full max-h-[90vh] flex flex-col text-left">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">Input Materi</h2>
            <p className="text-sm text-gray-600 mt-1">
              {dayName} - Minggu {week} - {getMonthName(month as Month)} - Semester {semester}
            </p>
          </div>
        </div>
        {/* Modal */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)] grow">
          {loadingData ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Judul Materi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Baca Al-Qur'an"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Konten Materi <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Masukkan konten materi di sini..."
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Gunakan enter untuk baris baru
                </p>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end space-x-3 mt-3">
            <Button
              onClick={onClose}
              disabled={loading}
              variant="outline"
            >
              Batal
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading || loadingData}
              variant="primary"
              loading={loading}
              loadingText="Menyimpan..."
            >
              Simpan
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
