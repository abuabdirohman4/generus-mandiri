"use client";

import { useState, useEffect } from 'react';

interface PWADebugInfo {
  userAgent?: string;
  isHTTPS?: boolean;
  isLocalhost?: boolean;
  hasServiceWorker?: boolean;
  hasManifest?: boolean;
  isStandalone?: boolean;
  isIOSStandalone?: boolean;
  hasBeforeInstallPrompt?: boolean;
  serviceWorkerState?: string;
  serviceWorkerRegistrations?: number;
  manifestContent?: any;
  manifestError?: string;
  installPromptDismissed?: string | null;
  hasNotificationPermission?: boolean;
  hasPushManager?: boolean;
  hasCacheStorage?: boolean;
}

export default function PWADebug() {
  const [debugInfo, setDebugInfo] = useState<PWADebugInfo>({});

  useEffect(() => {
    const checkPWASupport = () => {
      const info: any = {
        // Basic browser info
        userAgent: navigator.userAgent,
        isHTTPS: location.protocol === 'https:',
        isLocalhost: location.hostname === 'localhost',
        
        // PWA specific checks
        hasServiceWorker: 'serviceWorker' in navigator,
        hasManifest: document.querySelector('link[rel="manifest"]') !== null,
        
        // Display mode checks
        isStandalone: window.matchMedia('(display-mode: standalone)').matches,
        isIOSStandalone: (navigator as any).standalone === true,
        
        // beforeinstallprompt support
        hasBeforeInstallPrompt: 'onbeforeinstallprompt' in window,
        
        // Service worker status
        serviceWorkerState: 'unknown',
        
        // Manifest content
        manifestContent: null,
        
        // Local storage
        installPromptDismissed: localStorage.getItem('pwa-install-prompt'),
        
        // Additional checks
        hasNotificationPermission: 'Notification' in window,
        hasPushManager: 'PushManager' in window,
        hasCacheStorage: 'caches' in window,
      };

      // Check service worker registration
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          info.serviceWorkerRegistrations = registrations.length;
          info.serviceWorkerState = registrations.length > 0 ? 'registered' : 'not-registered';
          setDebugInfo((prev: PWADebugInfo) => ({ ...prev, ...info }));
        });
      }

      // Check manifest content
      const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
      if (manifestLink) {
        fetch(manifestLink.href)
          .then(response => response.json())
          .then(manifest => {
            info.manifestContent = manifest;
            setDebugInfo((prev: PWADebugInfo) => ({ ...prev, ...info }));
          })
          .catch(err => {
            info.manifestError = err.message;
            setDebugInfo((prev: PWADebugInfo) => ({ ...prev, ...info }));
          });
      }

      setDebugInfo(info);
    };

    checkPWASupport();
  }, []);

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
      <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-4">
        🔍 PWA Debug Information
      </h3>
      
      <div className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="font-medium text-yellow-700 dark:text-yellow-300">HTTPS:</span>
            <span className={`ml-2 px-2 py-1 rounded text-xs ${
              debugInfo.isHTTPS ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {debugInfo.isHTTPS ? '✅ Yes' : '❌ No'}
            </span>
          </div>
          
          <div>
            <span className="font-medium text-yellow-700 dark:text-yellow-300">Service Worker:</span>
            <span className={`ml-2 px-2 py-1 rounded text-xs ${
              debugInfo.hasServiceWorker ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {debugInfo.hasServiceWorker ? '✅ Supported' : '❌ Not Supported'}
            </span>
          </div>
          
          <div>
            <span className="font-medium text-yellow-700 dark:text-yellow-300">Manifest:</span>
            <span className={`ml-2 px-2 py-1 rounded text-xs ${
              debugInfo.hasManifest ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {debugInfo.hasManifest ? '✅ Found' : '❌ Not Found'}
            </span>
          </div>
          
          <div>
            <span className="font-medium text-yellow-700 dark:text-yellow-300">Standalone Mode:</span>
            <span className={`ml-2 px-2 py-1 rounded text-xs ${
              debugInfo.isStandalone || debugInfo.isIOSStandalone ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {debugInfo.isStandalone || debugInfo.isIOSStandalone ? '✅ Yes' : '❌ No'}
            </span>
          </div>
          
          <div>
            <span className="font-medium text-yellow-700 dark:text-yellow-300">beforeinstallprompt:</span>
            <span className={`ml-2 px-2 py-1 rounded text-xs ${
              debugInfo.hasBeforeInstallPrompt ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {debugInfo.hasBeforeInstallPrompt ? '✅ Supported' : '❌ Not Supported'}
            </span>
          </div>
          
          <div>
            <span className="font-medium text-yellow-700 dark:text-yellow-300">SW State:</span>
            <span className={`ml-2 px-2 py-1 rounded text-xs ${
              debugInfo.serviceWorkerState === 'registered' ? 'bg-green-100 text-green-800' : 
              debugInfo.serviceWorkerState === 'not-registered' ? 'bg-red-100 text-red-800' : 
              'bg-gray-100 text-gray-800'
            }`}>
              {debugInfo.serviceWorkerState}
            </span>
          </div>
        </div>
        
        <div className="mt-4">
          <span className="font-medium text-yellow-700 dark:text-yellow-300">User Agent:</span>
          <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1 break-all">
            {debugInfo.userAgent}
          </div>
        </div>
        
        <div className="mt-4">
          <span className="font-medium text-yellow-700 dark:text-yellow-300">Install Prompt Status:</span>
          <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
            {debugInfo.installPromptDismissed || 'Not set'}
          </div>
        </div>
        
        {debugInfo.manifestContent && (
          <div className="mt-4">
            <span className="font-medium text-yellow-700 dark:text-yellow-300">Manifest Name:</span>
            <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
              {debugInfo.manifestContent.name}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
