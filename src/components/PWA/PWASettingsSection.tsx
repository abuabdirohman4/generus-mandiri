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

export default function PWASettingsSection() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installStatus, setInstallStatus] = useState<'not-supported' | 'available' | 'installed' | 'dismissed'>('not-supported');
  const { profile } = useUserProfile();

  useEffect(() => {
    // Check if app is already installed
    const checkInstallStatus = () => {
      // Check if running in standalone mode (installed PWA)
      if (window.matchMedia('(display-mode: standalone)').matches || 
          (window.navigator as any).standalone === true) {
        setIsInstalled(true);
        setInstallStatus('installed');
        return;
      }
      
      // Check if user previously dismissed
      const installPrompt = localStorage.getItem('pwa-install-prompt');
      if (installPrompt === 'dismissed') {
        setInstallStatus('dismissed');
        return;
      }
      
      setInstallStatus('not-supported');
    };

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setInstallStatus('available');
    };

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallStatus('installed');
      localStorage.setItem('pwa-install-prompt', 'installed');
    };

    // Check on mount
    checkInstallStatus();

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
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
        localStorage.setItem('pwa-install-prompt', 'dismissed');
        setInstallStatus('dismissed');
      }
      
      setDeferredPrompt(null);
    } catch (error) {
      console.error('Error during PWA installation:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleResetDismiss = () => {
    localStorage.removeItem('pwa-install-prompt');
    setInstallStatus('not-supported');
  };

  const getStatusInfo = () => {
    switch (installStatus) {
      case 'installed':
        return {
          title: 'Aplikasi Terinstall',
          description: 'PWA sudah terinstall di perangkat Anda',
          icon: '✅',
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          borderColor: 'border-green-200 dark:border-green-800'
        };
      case 'available':
        return {
          title: 'Aplikasi Tersedia',
          description: 'Anda dapat menginstall PWA untuk pengalaman yang lebih baik',
          icon: '📱',
          color: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          borderColor: 'border-blue-200 dark:border-blue-800'
        };
      case 'dismissed':
        return {
          title: 'Installasi Ditolak',
          description: 'Anda sebelumnya menolak untuk menginstall PWA',
          icon: '❌',
          color: 'text-gray-600 dark:text-gray-400',
          bgColor: 'bg-gray-50 dark:bg-gray-900/20',
          borderColor: 'border-gray-200 dark:border-gray-800'
        };
      default:
        return {
          title: 'Tidak Didukung',
          description: 'Browser Anda tidak mendukung PWA atau sudah dalam mode standalone',
          icon: 'ℹ️',
          color: 'text-gray-600 dark:text-gray-400',
          bgColor: 'bg-gray-50 dark:bg-gray-900/20',
          borderColor: 'border-gray-200 dark:border-gray-800'
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Progressive Web App (PWA)
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Kelola instalasi aplikasi web progresif untuk pengalaman yang lebih baik
        </p>
      </div>

      {/* Status Card */}
      <div className={`rounded-lg border-2 ${statusInfo.borderColor} ${statusInfo.bgColor} p-6`}>
        <div className="flex items-start space-x-4">
          <div className="text-2xl">{statusInfo.icon}</div>
          <div className="flex-1">
            <h4 className={`font-semibold ${statusInfo.color} mb-2`}>
              {statusInfo.title}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {statusInfo.description}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              {installStatus === 'available' && (
                <button
                  onClick={handleInstallClick}
                  disabled={isInstalling}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors duration-200 flex items-center"
                >
                  {isInstalling ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Installing...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Install PWA
                    </>
                  )}
                </button>
              )}

              {installStatus === 'dismissed' && (
                <button
                  onClick={handleResetDismiss}
                  className="bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors duration-200"
                >
                  Reset & Tampilkan Lagi
                </button>
              )}

              {installStatus === 'installed' && (
                <div className="flex items-center text-sm text-green-600 dark:text-green-400">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Aplikasi sudah terinstall dan siap digunakan
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
          Keuntungan Menggunakan PWA
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h5 className="font-medium text-gray-900 dark:text-white text-sm">Akses Offline</h5>
              <p className="text-xs text-gray-600 dark:text-gray-400">Bekerja tanpa koneksi internet</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-3 h-3 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h5 className="font-medium text-gray-900 dark:text-white text-sm">Loading Cepat</h5>
              <p className="text-xs text-gray-600 dark:text-gray-400">Performa lebih optimal</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-3 h-3 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h5 className="font-medium text-gray-900 dark:text-white text-sm">Notifikasi</h5>
              <p className="text-xs text-gray-600 dark:text-gray-400">Update real-time</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-3 h-3 text-orange-600 dark:text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h5 className="font-medium text-gray-900 dark:text-white text-sm">Native Feel</h5>
              <p className="text-xs text-gray-600 dark:text-gray-400">Seperti aplikasi mobile</p>
            </div>
          </div>
        </div>
      </div>

      {/* Technical Info */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <h5 className="font-medium text-gray-900 dark:text-white text-sm mb-2">
          Informasi Teknis
        </h5>
        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
          <p>• PWA memerlukan browser modern (Chrome, Firefox, Safari, Edge)</p>
          <p>• Aplikasi akan tersimpan di perangkat seperti aplikasi native</p>
          <p>• Data akan di-cache untuk akses offline</p>
          <p>• Update otomatis saat ada versi baru</p>
        </div>
      </div>
    </div>
  );
}
