"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function PWAComponents() {
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isAppReady, setIsAppReady] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  // Check if we're on auth pages (not landing page)
  const isAuthPage = pathname === '/signin' || pathname === '/signup';
  const isProtectedPage = pathname.startsWith('/home') || 
                         pathname.startsWith('/absensi') || 
                         pathname.startsWith('/teachers') || 
                         pathname.startsWith('/settings') || 
                         pathname.startsWith('/dashboard');

  // Check if app is already installed
  const checkInstallationStatus = useCallback(() => {
    if (typeof window === 'undefined') return false;
    
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandalone = (window.navigator as any).standalone;
    const isInApp = window.navigator.userAgent.includes('wv'); // WebView
    
    return isStandalone || isIOSStandalone || isInApp;
  }, []);

  useEffect(() => {
    // Check installation status
    const installed = checkInstallationStatus();
    setIsInstalled(installed);

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then((registration) => {
          console.log('🔧 Warlob Service Worker registered:', registration);
          setIsAppReady(true);
        })
        .catch((error) => {
          console.error('❌ Service Worker registration failed:', error);
          setIsAppReady(true); // Continue even if SW fails
        });
    } else {
      setIsAppReady(true);
    }

    // Install prompt handler
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('🔔 PWA install prompt available');
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Only show prompt on protected pages, not on auth pages
      // if (isProtectedPage && !isInstalled) {
      //   // Check if user dismissed before
      //   const dismissed = sessionStorage.getItem('pwa-install-dismissed');
      //   if (!dismissed) {
      //     setTimeout(() => {
      //       setShowInstallPrompt(true);
      //     }, 2000);
      //   }
      // }
    };

    // Network status handlers
    const handleOnline = () => {
      console.log('🌐 App is online');
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.log('📴 App is offline');
      setIsOnline(false);
    };

    // Service worker update handler
    const handleServiceWorkerUpdate = () => {
      console.log('🔄 Service Worker update available');
      // For now, we'll just log it. In the future, you can show an update prompt
    };

    // Event listeners
    if (typeof window !== 'undefined') {
      window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      
      // Listen for service worker updates
      navigator.serviceWorker?.addEventListener('message', handleServiceWorkerUpdate);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
        navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerUpdate);
      }
    };
  }, [isProtectedPage, isInstalled, checkInstallationStatus]);

  const handleInstallClick = async () => {
    console.log('🔔 Install button clicked!');
    
    if (!deferredPrompt) {
      console.log('❌ No deferred prompt available');
      
      if (isInstalled) {
        toast.info("Aplikasi sudah terinstall!");
        setShowInstallPrompt(false);
        return;
      }
      
      // Provide manual install instructions
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (isMobile) {
        toast.info("Tap tombol share di browser dan pilih 'Add to Home Screen'");
      } else {
        toast.info("Klik ikon install di address bar browser");
      }
      setShowInstallPrompt(false);
      return;
    }

    try {
      console.log('🔔 Calling deferredPrompt.prompt()...');
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      console.log('🔔 User choice:', outcome);
      
      if (outcome === "accepted") {
        toast.success("Warlob App berhasil diinstall!");
        setIsInstalled(true);
      } else {
        toast.info("Installasi dibatalkan");
      }
      
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    } catch (error) {
      console.error("❌ Error during installation:", error);
      toast.error("Gagal menginstall aplikasi: " + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleInstallDismiss = () => {
    setShowInstallPrompt(false);
    // Don't show again this session
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('pwa-install-dismissed', 'true');
    }
  };

  // Don't show if already installed, dismissed, or on auth pages
  if (isInstalled || isAuthPage || !isAppReady) {
    return (
      <>
        {/* Offline Indicator */}
        {!isOnline && (
          <div className="fixed top-0 left-0 right-0 bg-red-500 text-white text-center py-2 px-4 z-50">
            📴 Anda sedang offline
          </div>
        )}
      </>
    );
  }

  return (
    <>
      {/* Offline Indicator */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-red-500 text-white text-center py-2 px-4 z-50">
          📴 Anda sedang offline
        </div>
      )}

      {/* Install Prompt - Only show on protected pages */}
      {showInstallPrompt && isProtectedPage && !isInstalled && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 max-w-sm w-full mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 z-50">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Image
                src="/images/logo/logo-icon.svg"
                alt="Warlob App Logo"
                width={32}
                height={32}
                priority
              />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Install Warlob App
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Tambahkan ke home screen untuk akses cepat
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button 
              onClick={handleInstallClick} 
              className="flex-1 bg-blue-600 text-white text-sm font-medium py-2.5 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Install
            </button>
            <button 
              onClick={handleInstallDismiss} 
              className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium py-2.5 px-4 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Nanti
            </button>
          </div>
        </div>
      )}
    </>
  );
}

