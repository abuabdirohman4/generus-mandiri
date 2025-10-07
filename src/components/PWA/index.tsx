"use client";

import { useState, useEffect } from "react";
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
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);

  // Check if we're on the landing page or auth pages
  const isLandingPage = pathname === '/' || pathname.startsWith('/(full-width-pages)');

  useEffect(() => {
    // Register main PWA Service Worker (handles both PWA and timer functionality)
    if ('serviceWorker' in navigator) {
      // Register custom service worker with integrated timer functionality
      navigator.serviceWorker.register('/sw-custom.js')
        .then((registration) => {
          console.log('🔧 Main Service Worker registered:', registration);
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New service worker is available
                  setShowUpdatePrompt(true);
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('❌ Service Worker registration failed:', error);
        });
    }

    // Install prompt handler
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('🔔 beforeinstallprompt event fired');
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Only show install prompt if not on landing page
      if (!isLandingPage) {
        // Show install prompt after delay
        setTimeout(() => {
          setShowInstallPrompt(true);
        }, 3000);
      }
    };

    // Offline/Online handlers
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
      console.log('🔄 Service worker update available');
      setShowUpdatePrompt(true);
    };

    // Event listeners
    if (typeof window !== 'undefined') {
      window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          handleServiceWorkerUpdate
        );
      }
    }

    // Check if already installed
    const checkIfInstalled = () => {
      if (typeof window !== 'undefined') {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
        const isIOSStandalone = (window.navigator as any).standalone;
        
        if (isStandalone || isIOSStandalone) {
          console.log('📱 App is already installed');
          setShowInstallPrompt(false);
        }
      }
    };

    checkIfInstalled();

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
        
        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.removeEventListener(
            "controllerchange",
            handleServiceWorkerUpdate
          );
        }
      }
    };
  }, []);

  const handleInstallClick = async () => {
    console.log('🔔 Install button clicked!');
    
    if (!deferredPrompt) {
      console.log('❌ No deferred prompt available');
      
      // Check if already installed
      if (typeof window !== 'undefined') {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
        const isIOSStandalone = (window.navigator as any).standalone;
        
        if (isStandalone || isIOSStandalone) {
          toast.info("App is already installed!");
          setShowInstallPrompt(false);
          return;
        }
      }
      
      // Provide manual install instructions for mobile
      if (typeof window !== 'undefined' && navigator) {
        const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile) {
          toast.info("Tap the share button in your browser and select 'Add to Home Screen'");
          setShowInstallPrompt(false);
          return;
        }
      }
      
      toast.error("Install prompt not available. Please try refreshing the page.");
      return;
    }

    try {
      console.log('🔔 Calling deferredPrompt.prompt()...');
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      console.log('🔔 User choice:', outcome);
      
      if (outcome === "accepted") {
        toast.success("Warlob App installed successfully!");
      } else {
        toast.info("Installation cancelled");
      }
      
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    } catch (error) {
      console.error("❌ Error during installation:", error);
      toast.error("Failed to install app: " + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleInstallDismiss = () => {
    setShowInstallPrompt(false);
    // Don't show again this session
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('pwa-install-dismissed', 'true');
    }
  };

  const handleUpdateClick = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const handleUpdateDismiss = () => {
    setShowUpdatePrompt(false);
  };

  // Don't show if dismissed this session or on landing page
  if (typeof window !== 'undefined' && (sessionStorage.getItem('pwa-install-dismissed') === 'true' || isLandingPage) && showInstallPrompt) {
    setShowInstallPrompt(false);
  }

  return (
    <>
      {/* Offline Indicator */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-red-500 text-white text-center py-2 px-4 z-50">
          📴 You are currently offline
        </div>
      )}

      {/* Update Available */}
      {showUpdatePrompt && (
        <div className="fixed top-0 left-0 right-0 bg-blue-500 text-white text-center py-2 px-4 z-50">
          🔄 New version available
          <button 
            onClick={handleUpdateClick}
            className="ml-4 bg-white text-blue-500 px-3 py-1 rounded text-sm font-medium"
          >
            Update
          </button>
          <button 
            onClick={handleUpdateDismiss}
            className="ml-2 text-white text-sm"
          >
            ✕
          </button>
        </div>
      )}

      {/* Install Prompt - Only show on authenticated pages */}
      {showInstallPrompt && !isLandingPage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 max-w-sm w-full mx-auto bg-white rounded-xl shadow-2xl border border-gray-200 p-4 z-99">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-brand-400 to-brand-500 rounded-xl flex items-center justify-center">
              <Image
                  src="/images/logo/logo-icon.svg"
                  alt="Logo"
                  width={48}
                  height={48}
                  priority
                />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Install Warlob App</h3>
              <p className="text-xs text-gray-500">Add to home screen for quick access</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button 
              onClick={handleInstallClick} 
              className="flex-1 bg-brand-500 text-white text-sm font-medium py-2.5 px-4 rounded-lg hover:bg-brand-600 transition-colors"
            >
              Install
            </button>
            <button 
              onClick={handleInstallDismiss} 
              className="flex-1 bg-gray-100 text-gray-700 text-sm font-medium py-2.5 px-4 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
      )}
    </>
  );
}

