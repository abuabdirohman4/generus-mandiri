"use client";

import React, { useState, useEffect } from 'react';
import { useBrainDump } from './hooks/useBrainDump';
import { toast } from 'sonner';
import Tooltip from '@/components/ui/tooltip/Tooltip';
import RichTextEditor from '@/components/ui/rich-text-editor/RichTextEditor';
import CollapsibleCard from '@/components/common/CollapsibleCard';
import Button from '@/components/ui/button/Button';
import { useUIPreferencesStore } from '@/stores/uiPreferencesStore';

interface BrainDumpSectionProps {
  date: string;
}

const BrainDumpSection: React.FC<BrainDumpSectionProps> = ({ date }) => {
  const [content, setContent] = useState('');
  const { cardCollapsed, toggleCardCollapsed } = useUIPreferencesStore();

  const {
    brainDump,
    isLoading,
    error,
    saveBrainDump,
    isSaving
  } = useBrainDump({ date });

  // Update content when brainDump data changes
  useEffect(() => {
    if (brainDump) {
      setContent(brainDump.content);
    } else {
      setContent('');
    }
  }, [brainDump]);

  const handleSave = async () => {
    try {
      await saveBrainDump(content);
      toast.success('Brain dump berhasil disimpan');
    } catch (error) {
      toast.error('Gagal menyimpan brain dump');
      console.error('Error saving brain dump:', error);
    }
  };


  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Cmd+Enter on Mac or Ctrl+Enter on Windows/Linux
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!isSaving) {
        handleSave();
      }
    }
  };

  if (error) {
    return (
      <div className="mt-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 pt-5  shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-gray-100">Brain Dump</h3>
          <div className="text-center py-8 text-red-500">
            Error: {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <CollapsibleCard
        isCollapsed={cardCollapsed.brainDump}
        onToggle={() => toggleCardCollapsed('brainDump')}
      >
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 pt-5  shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">Brain Dump</h3>
              <Tooltip
                content="Brain Dump ini adalah bagian untuk mengisi buah pikir apapun yang muncul sepanjang hari, yang mungkin bisa memberikan Anda ide, atau mungkin akan Anda lakukan suatu hari. Ide-ide menarik bisa muncul, jangan sia-siakan dengan membiarkannya hilang atau membiarkannya terus menghantui pikiran Anda sehingga sulit fokus mengerjakan rencana Anda. Tuliskan di bagian ini, Anda akan membebaskan energi dan menyimpan dengan baik untuk keperluan di masa yang akan datang."
                position="right"
                maxWidth="400px"
                trigger="hover"
                showIcon={true}
              />
            </div>
          </div>

        {/* Brain dump textarea */}
        {isLoading ? (
          <div className="animate-pulse">
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg mb-4"></div>
            <div className="flex gap-2">
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <RichTextEditor
              value={content}
              onChange={setContent}
              onKeyDown={handleKeyDown}
              placeholder="Tuliskan apa yang ada di pikiran Anda..."
              className="w-full"
              rows={10}
              disabled={isSaving}
            />
            
            <Button
              onClick={handleSave}
              loading={isSaving}
              loadingText="Menyimpan..."
              className="w-full"
              size="md"
              variant="primary"
            >
              Simpan
            </Button>
          </div>
        )}
        </div>
      </CollapsibleCard>
    </div>
  );
};

export default BrainDumpSection;