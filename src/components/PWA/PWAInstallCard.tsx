"use client";

import { useState, useEffect } from 'react';
import { useUserProfile } from '@/stores/userProfileStore';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function PWAInstallCard() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallCard, setShowInstallCard] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const { profile } = useUserProfile();

  useEffect(() => {
    // Check if app is already installed
    const checkIfInstalled = () => {
      // Check if running in standalone mode (installed PWA)
      if (window.matchMedia('(display-mode: standalone)').matches || 
          (window.navigator as any).standalone === true) {
        setIsInstalled(true);
        return;
      }
      
      // Check if already installed by looking for install prompt
      const installPrompt = localStorage.getItem('pwa-install-prompt');
      if (installPrompt === 'dismissed') {
        return;
      }
      
      setShowInstallCard(true);
    };

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallCard(true);
    };

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallCard(false);
      localStorage.setItem('pwa-install-prompt', 'installed');
    };

    // Check on mount
    checkIfInstalled();

    // Add event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Cleanup
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    setIsInstalling(true);
    
    try {
      // Show the install prompt
      await deferredPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
        localStorage.setItem('pwa-install-prompt', 'dismissed');
      }
      
      // Clear the deferredPrompt
      setDeferredPrompt(null);
      setShowInstallCard(false);
    } catch (error) {
      console.error('Error during PWA installation:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setShowInstallCard(false);
    localStorage.setItem('pwa-install-prompt', 'dismissed');
  };

  // Don't show if already installed or if user dismissed
  if (isInstalled || !showInstallCard || !profile) {
    return null;
  }

  // Show debug info if not supported
  if (!deferredPrompt) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">
              PWA Tidak Didukung
            </h3>
            <p className="text-xs text-red-600 dark:text-red-400">
              Browser Anda tidak mendukung PWA atau sudah dalam mode standalone. 
              Cek debug info di atas untuk detail lebih lanjut.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Icon */}
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
              Install Aplikasi
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Install PWA untuk akses offline dan performa lebih baik
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleInstallClick}
            disabled={isInstalling || !deferredPrompt}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-xs font-medium px-3 py-1.5 rounded-md transition-colors duration-200 flex items-center"
          >
            {isInstalling ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></div>
                Installing...
              </>
            ) : (
              'Install'
            )}
          </button>
          
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200 p-1"
            title="Tutup"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
