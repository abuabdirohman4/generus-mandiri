"use client";
import React, { useState } from 'react';
import { checkAudioPermission, openAudioPermissionSettings } from '@/lib/soundUtils';

interface AudioPermissionPromptProps {
  onPermissionGranted: () => void;
  onSkip: () => void;
}

export default function AudioPermissionPrompt({ onPermissionGranted, onSkip }: AudioPermissionPromptProps) {
  const [isTesting, setIsTesting] = useState(false);
  const [showManualSteps, setShowManualSteps] = useState(false);

  const handleOpenSettings = () => {
    openAudioPermissionSettings();
    // Show manual steps after user clicks the button
    setShowManualSteps(true);
  };

  const handleTestAudio = async () => {
    setIsTesting(true);
    try {
      const hasPermission = await checkAudioPermission();
      if (hasPermission) {
        onPermissionGranted();
      } else {
        alert('Audio permission still blocked. Please check your browser settings and try again.');
      }
    } catch (error) {
      console.error('Error testing audio permission:', error);
      alert('Error testing audio permission. Please try again.');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            🎵 Enable Audio for Focus Sound
          </h3>
          <p className="text-gray-600 text-sm leading-relaxed mb-4">
            Focus sounds cannot play automatically due to browser security. To play focus sounds during your Pomodoro timer, please allow audio permissions in your browser settings.
          </p>
          
        </div>

        <div className="space-y-3">
          <button
            onClick={handleOpenSettings}
            className="w-full bg-blue-500 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-600 transition-colors flex items-center justify-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Open Browser Settings</span>
          </button>
          
          {showManualSteps && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg relative">
              <button
                onClick={() => setShowManualSteps(false)}
                className="absolute top-2 right-2 text-blue-600 hover:text-blue-800 transition-colors"
                aria-label="Close manual steps"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <p className="text-sm text-blue-800 pr-6">
                <strong>Manual Steps:</strong>
              </p>
              <div className="text-xs text-blue-700 mt-2 space-y-2">
                <p className="font-medium">Browsers block websites from directly opening settings pages (like chrome://settings) for security reasons. This prevents malicious websites from changing your browser settings without permission.</p>
                
                <div className="space-y-1">
                  <p className="font-medium">Follow these steps manually:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Click the lock icon in your browser's address bar</li>
                    <li>Set "Sound" & "Notifications" to "Allow"</li>
                    <li>Refresh this page</li>
                  </ol>
                </div>
                
                <div className="mt-2 p-2 bg-blue-100 rounded border border-blue-300">
                  <p className="font-medium text-blue-800">Alternative method:</p>
                  <p className="text-blue-700">If you can't find the lock icon, go to your browser settings → Privacy & Security → Site Settings → Sound, and allow audio for this website.</p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleTestAudio}
            disabled={isTesting}
            className="w-full bg-blue-500 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isTesting ? (
              <>
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Testing...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Test Audio Permission</span>
              </>
            )}
          </button>

          <button
            onClick={onSkip}
            className="w-full bg-gray-100 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            Skip for Now
          </button>
          
          <p className="text-gray-500 text-xs leading-relaxed mb-4 bg-gray-50 p-3 rounded-lg">
            <strong>Note:</strong> Even without browser permission, you can still use focus sounds by open <strong>Sound Settings</strong> and choose any sound or start any quest. The sound will then play normally for the rest of your session.
          </p>
        </div>
      </div>
    </div>
  );
}
