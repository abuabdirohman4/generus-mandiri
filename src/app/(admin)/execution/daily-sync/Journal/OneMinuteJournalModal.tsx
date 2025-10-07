'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import Spinner from '@/components/ui/spinner/Spinner';
import Button from '@/components/ui/button/Button';
import Tooltip from '@/components/ui/tooltip/Tooltip';

interface OneMinuteJournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (whatDone: string, whatThink: string) => Promise<void>;
  taskTitle?: string;
  duration: number;
  isRetrying?: boolean;
  retryCount?: number;
}

const OneMinuteJournalModal: React.FC<OneMinuteJournalModalProps> = ({
  isOpen,
  onClose,
  onSave,
  taskTitle,
  duration,
  isRetrying = false,
  retryCount = 0
}) => {
  const [whatDone, setWhatDone] = useState('');
  const [whatThink, setWhatThink] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // ✅ FIX: Use refs to get latest values
  const whatDoneRef = useRef('');
  const whatThinkRef = useRef('');

  // Update refs when state changes
  useEffect(() => {
    whatThinkRef.current = whatThink; // Update ref
  }, [whatThink]);

  useEffect(() => {
    whatDoneRef.current = whatDone; // Update ref
  }, [whatDone]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setWhatDone('');
      setWhatThink('');
      setIsSaving(false);
    }
  }, [isOpen]); // ✅ FIX: Only reset when modal opens, not when taskTitle or duration changes

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Cmd+Enter (Mac) or Ctrl+Enter (Windows/Linux)
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        if (!isSaving && whatDone.trim()) {
          handleSave();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isSaving, whatDone]);

  const handleSave = useCallback(async () => {
    // ✅ FIX: Get latest values from refs
    const currentWhatDone = whatDoneRef.current;
    const currentWhatThink = whatThinkRef.current;

    if (!currentWhatDone.trim()) {
      toast.error('Silakan isi apa yang telah Anda selesaikan');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(currentWhatDone.trim(), currentWhatThink.trim());
      toast.success('Jurnal berhasil disimpan!');
      onClose();
    } catch (error) {
      console.error('Error saving journal:', error);
      
      // ✅ IMPROVED: Better error handling with more specific messages
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      if (isMobile) {
        // More specific error messages for mobile
        if (errorMessage.includes('No activity log found') || errorMessage.includes('PGRST116')) {
          toast.error('Sesi timer tidak ditemukan. Silakan coba lagi.');
        } else if (errorMessage.includes('User not authenticated')) {
          toast.error('Sesi login telah berakhir. Silakan login ulang.');
        } else if (errorMessage.includes('Database error')) {
          toast.error('Terjadi kesalahan database. Silakan coba lagi.');
        } else if (errorMessage.includes('Failed to create activity log')) {
          toast.error('Gagal membuat log aktivitas. Silakan coba lagi.');
        } else {
          toast.error('Gagal menyimpan jurnal. Periksa koneksi internet Anda.');
        }
      } else {
        // Desktop error messages
        if (errorMessage.includes('No activity log found') || errorMessage.includes('PGRST116')) {
          toast.error('Sesi timer tidak ditemukan. Silakan coba lagi.');
        } else if (errorMessage.includes('User not authenticated')) {
          toast.error('Sesi login telah berakhir. Silakan login ulang.');
        } else if (errorMessage.includes('Database error')) {
          toast.error('Terjadi kesalahan database. Silakan coba lagi.');
        } else if (errorMessage.includes('Failed to create activity log')) {
          toast.error('Gagal membuat log aktivitas. Silakan coba lagi.');
        } else {
          toast.error('Gagal menyimpan jurnal. Silakan coba lagi.');
        }
      }
    } finally {
      setIsSaving(false);
    }
  }, [onSave, onClose]); // ✅ FIX: Remove state dependencies, use refs instead

  const handleSkip = () => {
    onClose();
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} menit`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m === 0 ? `${h} jam` : `${h} jam ${m} menit`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="mb-2">
          <div className="flex items-center justify-center gap-2 mb-2">
            <h2 className="text-2xl font-bold text-gray-900">One Minute Journal</h2>
          </div>
          <h4 className="text-center text-gray-700 mb-4">Jurnalkan jawaban atas pertanyaan berikut setiap kali selesai menjalani Sesi Fokus.</h4>
          {taskTitle && (
            <p className="text-blue-600 font-medium text-center">
              {taskTitle}
            </p>
          )}
          <p className="text-gray-600 text-center">
            Sesi Fokus selesai - {formatDuration(duration)}
          </p>
        </div>

        {/* Questions */}
        <div className="space-y-6">
          {/* Question 1 */}
          <div>
            <label className="block text-lg font-semibold text-gray-900 mb-3">
              1. Proyek/tugas apa yang baru saja saya selesaikan?
            </label>
            <textarea
              value={whatDone}
              onChange={(e) => setWhatDone(e.target.value)}
              placeholder="Jelaskan secara singkat apa yang telah Anda kerjakan atau selesaikan..."
              className="w-full h-24 p-3 border border-gray-300 rounded-md resize-none text-base focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              disabled={isSaving}
              autoFocus
            />
            <div className="text-xs text-gray-500 mt-1">
              {whatDone.length}/500 karakter
            </div>
          </div>

          {/* Question 2 */}
          <div>
            <label className="block text-lg font-semibold text-gray-900 mb-3">
              2. Apakah ada bagian proyek/tugas itu yang masih saya pikirkan?
            </label>
            <textarea
              value={whatThink}
              onChange={(e) => setWhatThink(e.target.value)}
              placeholder="Bagikan pemikiran, ide, atau hal yang masih mengganjal di pikiran Anda..."
              className="w-full h-24 p-3 border border-gray-300 rounded-md resize-none text-base focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              disabled={isSaving}
            />
            <div className="text-xs text-gray-500 mt-1">
              {whatThink.length}/500 karakter
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
          <Button
            onClick={handleSkip}
            variant="outline"
            disabled={isSaving}
            className="px-4 py-2"
          >
            Lewati
          </Button>
          <Button
            onClick={handleSave}
            variant="primary"
            disabled={isSaving || !whatDone.trim()}
            className="px-4 py-2"
          >
            {isSaving ? (
              <>
                <Spinner size={16} className="mr-2" />
                {isRetrying ? `Mencoba ulang... (${retryCount}/2)` : 'Menyimpan...'}
              </>
            ) : (
              'Simpan'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OneMinuteJournalModal;
