"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useModal } from "@/hooks/useModal";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import { resetCacheAndLogout } from "../actions/cacheActions";

export default function CacheSettingsSection() {
  const { isOpen, openModal, closeModal } = useModal();
  const router = useRouter();
  const [isResetting, setIsResetting] = useState(false);

  const handleReset = async () => {
    setIsResetting(true);
    
    try {
      // Clear client-side storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear cookies
      document.cookie.split(";").forEach((c) => {
        const eqPos = c.indexOf("=");
        const name = eqPos > -1 ? c.substr(0, eqPos) : c;
        document.cookie = `${name.trim()}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        document.cookie = `${name.trim()}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
        document.cookie = `${name.trim()}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${window.location.hostname}`;
      });

      // Clear Service Worker cache (PWA cache)
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }

      // Clear server-side session and logout
      await resetCacheAndLogout();

      // Close modal and redirect to login
      closeModal();
      router.push('/signin');
      
    } catch (error) {
      console.error('Error during cache reset:', error);
      // You might want to show a toast notification here
      alert('Terjadi kesalahan saat melakukan reset. Silakan coba lagi.');
    } finally {
      setIsResetting(false);
    }
  };

  const cacheItems = [
    {
      name: "Local Storage",
      description: "Data pengaturan dan preferensi yang tersimpan di browser",
      icon: "💾"
    },
    {
      name: "Session Storage", 
      description: "Data sementara yang tersimpan selama sesi browser",
      icon: "🔄"
    },
    {
      name: "Cookies",
      description: "Data autentikasi dan tracking yang tersimpan di browser",
      icon: "🍪"
    },
    {
      name: "PWA Cache",
      description: "Cache aplikasi web progresif untuk akses offline",
      icon: "📱"
    },
    {
      name: "Server Session",
      description: "Sesi pengguna di server (akan logout)",
      icon: "🔐"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Reset Cookies & Cache
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Hapus semua data yang tersimpan di browser dan server untuk memulai fresh
        </p>
      </div>

      {/* Warning Card */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="text-yellow-600 dark:text-yellow-400 text-xl">⚠️</div>
          <div>
            <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
              Peringatan Penting
            </h4>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              Tindakan ini akan menghapus semua data tersimpan dan Anda akan otomatis logout. 
              Pastikan Anda telah menyimpan data penting sebelum melanjutkan.
            </p>
          </div>
        </div>
      </div>

      {/* Items that will be reset */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
          Data yang akan dihapus:
        </h4>
        <div className="space-y-3">
          {cacheItems.map((item, index) => (
            <div key={index} className="flex items-start space-x-3">
              <div className="text-lg">{item.icon}</div>
              <div>
                <h5 className="font-medium text-gray-900 dark:text-white text-sm">
                  {item.name}
                </h5>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reset Button */}
      <div className="flex justify-center">
        <Button
          onClick={openModal}
          variant="primary"
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          Reset Cookies & Cache
        </Button>
      </div>

      {/* Confirmation Modal */}
      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[500px] m-4">
        <div className="relative w-full p-6 bg-white rounded-3xl dark:bg-gray-900">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
              <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Konfirmasi Reset
            </h3>
            
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Apakah Anda yakin ingin menghapus semua cookies, cache, dan data tersimpan? 
              Anda akan otomatis logout dan perlu login ulang.
            </p>

            <div className="flex items-center justify-center space-x-3">
              <Button
                size="sm"
                variant="outline"
                onClick={closeModal}
                disabled={isResetting}
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={handleReset}
                disabled={isResetting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isResetting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Resetting...
                  </>
                ) : (
                  'Reset Sekarang'
                )}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
