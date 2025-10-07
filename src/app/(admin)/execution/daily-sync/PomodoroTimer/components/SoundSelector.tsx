'use client';
import React, { useState, useEffect } from 'react';
import { useSoundStore } from '@/stores/soundStore';
import { TIMER_SOUND_OPTIONS, COMPLETION_SOUND_OPTIONS, FOCUS_SOUND_OPTIONS, playSound, stopCurrentSound } from '@/lib/soundUtils';

interface SoundSelectorProps {
  isOpen: boolean;
  onClose: () => void;
}

const SoundSelector: React.FC<SoundSelectorProps> = ({ isOpen, onClose }) => {
  const { 
    settings, 
    taskCompletionSettings, 
    focusSettings,
    updateSettings, 
    updateTaskCompletionSettings, 
    updateFocusSettings,
    isLoading, 
    loadSettings 
  } = useSoundStore();
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Load settings from server when component mounts
  useEffect(() => {
    if (isOpen && !hasLoaded) {
      loadSettings().then(() => {
        setHasLoaded(true);
      });
    } else if (!isOpen) {
      // Stop any playing sound when modal is closed
      stopCurrentSound();
      setIsPlaying(null);
      setHasLoaded(false); // Reset for next time
    }
  }, [isOpen, loadSettings, hasLoaded]);

  if (!isOpen) return null;

  const handleSoundSelect = async (soundId: string) => {
    updateSettings({ soundId });
    // Auto-play sound when selected
    await playPreview(soundId);
  };

  const handleTaskCompletionSoundSelect = async (soundId: string) => {
    updateTaskCompletionSettings({ soundId });
    // Auto-play sound when selected
    await playPreview(soundId);
  };

  const handleFocusSoundSelect = async (soundId: string) => {
    await updateFocusSettings({ soundId });
    // Auto-play sound when selected
    await playPreview(soundId);
  };

  const handleVolumeChange = (volume: number) => {
    const volumeValue = volume / 100;
    updateSettings({ volume: volumeValue });
    updateTaskCompletionSettings({ volume: volumeValue });
    updateFocusSettings({ volume: volumeValue });
  };

  const playPreview = async (soundId: string) => {
    // Stop any currently playing sound first
    stopCurrentSound();
    
    if (isPlaying) {
      setIsPlaying(null);
      return;
    }
    
    setIsPlaying(soundId);
    
    try {
      // Use appropriate volume based on sound type
      const volume = COMPLETION_SOUND_OPTIONS.some(option => option.id === soundId) 
        ? taskCompletionSettings.volume 
        : FOCUS_SOUND_OPTIONS.some(option => option.id === soundId)
        ? focusSettings.volume
        : settings.volume;
      
      // For focus sound, use playFocusSoundLoop instead of playSound
      if (FOCUS_SOUND_OPTIONS.some(option => option.id === soundId)) {
        const { playFocusSoundLoop } = await import('@/lib/soundUtils');
        await playFocusSoundLoop(soundId, volume);
      } else {
        await playSound(soundId, volume);
      }
    } catch (error) {
      console.error('Error playing preview:', error);
    } finally {
      setTimeout(() => {
        setIsPlaying(null);
      }, 1000);
    }
  };

  return (
    <>
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        .slider::-webkit-slider-track {
          height: 8px;
          border-radius: 4px;
        }
        
        .slider::-moz-range-track {
          height: 8px;
          border-radius: 4px;
        }
      `}</style>
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Sound Settings
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Loading State - Only show skeleton on initial load */}
        {isLoading && !hasLoaded ? (
          <div className="space-y-6 mb-6">
            {/* Completion Sound Options Skeleton */}
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse"></div>
              <div className="flex flex-wrap gap-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-8 bg-gray-200 dark:bg-gray-700 rounded-full w-24 animate-pulse"></div>
                ))}
              </div>
            </div>
            
            {/* Focus Sound Options Skeleton */}
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-40 animate-pulse"></div>
              <div className="flex flex-wrap gap-2">
                {[1].map((i) => (
                  <div key={`focus-${i}`} className="h-8 bg-gray-200 dark:bg-gray-700 rounded-full w-28 animate-pulse"></div>
                ))}
              </div>
            </div>
            
            {/* Task Completion Sound Options Skeleton */}
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-40 animate-pulse"></div>
              <div className="flex flex-wrap gap-2">
                {[1, 2].map((i) => (
                  <div key={`task-${i}`} className="h-8 bg-gray-200 dark:bg-gray-700 rounded-full w-24 animate-pulse"></div>
                ))}
              </div>
            </div>
            
            {/* Volume Slider Skeleton */}
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse"></div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
          </div>
        ) : (
          <>
            {/* Sound Options */}
            <div className="space-y-6 mb-6">
              {/* When focus session completed */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  When focus session completed
                </h3>
                <div className="flex flex-wrap gap-2">
                  {TIMER_SOUND_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handleSoundSelect(option.id)}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-full border transition-colors ${
                        settings.soundId === option.id
                          ? 'border-yellow-400 bg-yellow-100 dark:bg-yellow-900/20'
                          : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span className="text-sm">{option.emoji}</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {option.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* When focus is running (background sound) */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  When focus is running
                </h3>
                <div className="flex flex-wrap gap-2">
                  {FOCUS_SOUND_OPTIONS.map((option) => (
                    <button
                      key={`focus-${option.id}`}
                      onClick={() => handleFocusSoundSelect(option.id)}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-full border transition-colors ${
                        focusSettings.soundId === option.id
                          ? 'border-yellow-400 bg-yellow-100 dark:bg-yellow-900/20'
                          : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span className="text-sm">{option.emoji}</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {option.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Task completion sounds */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Task completion sounds
                </h3>
                <div className="flex flex-wrap gap-2">
                  {COMPLETION_SOUND_OPTIONS.map((option) => (
                    <button
                      key={`task-${option.id}`}
                      onClick={() => handleTaskCompletionSoundSelect(option.id)}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-full border transition-colors ${
                        taskCompletionSettings.soundId === option.id
                          ? 'border-yellow-400 bg-yellow-100 dark:bg-yellow-900/20'
                          : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span className="text-sm">{option.emoji}</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {option.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Volume Control */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Volume: {Math.round(settings.volume * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(settings.volume * 100)}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 slider"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${settings.volume * 100}%, #e5e7eb ${settings.volume * 100}%, #e5e7eb 100%)`
                }}
              />
            </div>
          </>
        )}
      </div>
    </div>
    </>
  );
};

export default SoundSelector;
