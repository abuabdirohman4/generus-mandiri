"use client";

import { useState } from 'react';
import { signOut } from '@/app/(full-width-pages)/(auth)/actions';
import QuickActions from './components/QuickActions';
import { useUserProfile } from '@/stores/userProfileStore';
import { isAdminLegacy } from '@/lib/userUtils';

export default function HomePage() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { profile } = useUserProfile();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900">
      {/* Header Section - Livin By Mandiri Style */}
      <div className="fixed top-0 left-1/2 md:hidden transform -translate-x-1/2 z-40 overflow-hidden bg-gradient-to-r from-brand-600 via-brand-700 to-indigo-800 px-6 pt-5 pb-4 w-full">
        {/* Asymmetrical Wave Shape at Bottom */}
        <div className="absolute bottom-0 left-0 w-full h-8">
          <svg
            viewBox="0 0 400 32"
            className="w-full h-full"
            preserveAspectRatio="none"
          >
            <path
              d="M0,32 Q100,20 200,32 T400,20 L400,32 Z"
              fill="rgb(249 250 251)"
              className="transition-all duration-300"
            />
          </svg>
        </div>

        <div className="relative z-10">
          {/* Top Row - User Profile and Settings */}
          <div className="flex items-center justify-between mb-4">
            {/* User Profile */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30">
                <span className="text-white font-bold text-white">
                  {(() => {
                    const words = profile?.full_name?.split(' ').filter(Boolean) || [];
                    if (words.length > 2) {
                      return (
                        (words[0][0]?.toUpperCase() || '') +
                        (words[words.length - 1][0]?.toUpperCase() || '')
                      );
                    } else {
                      return words
                        .slice(0, 2)
                        .map((word: string) => word[0]?.toUpperCase() || '')
                        .join('');
                    }
                  })()}
                </span>
              </div>
              <div>
                <h2 className="text-white font-semibold text-lg">
                  {profile?.full_name || 'User'}
                </h2>
                <div className="flex items-center space-x-2 text-blue-200 text-sm">
                  <span>{profile?.classes?.[0]?.name || 'No Class'}</span>
                </div>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30 hover:bg-white/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Logout"
            >
              {isLoggingOut ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-3 pt-28 sm:px-6 lg:px-8 md:py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="md:flex md:gap-2 text-3xl font-bold text-gray-900 dark:text-white mb-2">
            <div>Selamat Datang </div> 
            {/* <div className="text-brand-600 dark:text-brand-400">{profile.full_name}!</div> */}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Kelola data & absensi generus dengan mudah melalui aplikasi ini.
          </p>
        </div>

        {/* Quick Actions */}
        {profile && (
          <QuickActions 
            isAdmin={isAdminLegacy(profile.role)} 
            profile={profile} 
          />
        )}
      </div>
    </div>
  );
}