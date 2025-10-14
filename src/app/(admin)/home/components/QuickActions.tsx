'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Spinner from '@/components/ui/spinner/Spinner';
import { GroupIcon, ReportIcon, DashboardIcon, BuildingIcon } from '@/lib/icons';

interface Profile {
  id: string;
  full_name: string;
  role: string;
  classes?: Array<{
    id: string;
    name: string;
  }>;
}

interface QuickActionsProps {
  isAdmin: boolean;
  profile: Profile;
}

interface QuickActionItem {
  id: string;
  name: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  bgColor: string;
  iconColor: string;
  adminOnly?: boolean;
  disabled?: boolean;
}

export default function QuickActions({ isAdmin, profile }: QuickActionsProps) {
  const [loadingRoutes, setLoadingRoutes] = useState<Set<string>>(new Set());
  const router = useRouter();

  const handleNavigation = useCallback((href: string, disabled?: boolean) => {
    if (disabled) return;
    setLoadingRoutes(prev => new Set(prev).add(href));
    router.push(href);
  }, [router]);

  // Clear loading state when route changes
  useEffect(() => {
    const handleRouteChange = () => {
      setLoadingRoutes(new Set());
    };

    // Listen for route changes
    window.addEventListener('popstate', handleRouteChange);
    
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  const quickActions: QuickActionItem[] = [
    {
      id: 'dashboard',
      name: 'Dashboard',
      description: 'Overview sistem',
      href: '/dashboard',
      icon: <DashboardIcon className="w-6 h-6" />,
      bgColor: 'bg-indigo-100 dark:bg-indigo-900',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      adminOnly: true,
      disabled: true
    },
    {
      id: 'absensi',
      name: 'Absensi',
      description: 'Kelola kehadiran siswa',
      href: '/absensi',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      bgColor: 'bg-blue-100 dark:bg-blue-900',
      iconColor: 'text-blue-600 dark:text-blue-400',
      disabled: false
    },
    {
      id: 'laporan',
      name: 'Laporan',
      description: 'Laporan absensi',
      href: '/laporan',
      icon: <ReportIcon className="w-6 h-6" />,
      bgColor: 'bg-red-100 dark:bg-red-900',
      iconColor: 'text-red-600 dark:text-red-400',
      disabled: false
    },
    {
      id: 'siswa',
      name: 'Siswa',
      description: 'Kelola data siswa',
      href: '/siswa',
      icon: (
        <GroupIcon className="w-6 h-6" />
      ),
      bgColor: 'bg-purple-100 dark:bg-purple-900',
      iconColor: 'text-purple-600 dark:text-purple-400',
      disabled: false
    },
    {
      id: 'guru',
      name: 'Guru',
      description: 'Kelola data guru',
      href: '/users/guru',
      icon: (
        <GroupIcon className="w-6 h-6" />
      ),
      bgColor: 'bg-orange-100 dark:bg-orange-900',
      iconColor: 'text-orange-600 dark:text-orange-400',
      adminOnly: true,
      disabled: false
    },
    {
      id: 'admin-users',
      name: 'Admin',
      description: 'Kelola data admin',
      href: '/users/admin',
      icon: <GroupIcon className="w-6 h-6" />,
      bgColor: 'bg-blue-100 dark:bg-blue-900',
      iconColor: 'text-blue-600 dark:text-blue-400',
      adminOnly: true,
      disabled: false
    },
    {
      id: 'organisasi',
      name: 'Organisasi',
      description: 'Kelola data organisasi',
      href: '/organisasi',
      icon: <BuildingIcon className="w-6 h-6" />,
      bgColor: 'bg-green-100 dark:bg-green-900',
      iconColor: 'text-green-600 dark:text-green-400',
      adminOnly: true,
      disabled: false
    },
    {
      id: 'settings',
      name: 'Pengaturan',
      description: 'Kelola pengaturan aplikasi',
      href: '/settings',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      bgColor: 'bg-gray-100 dark:bg-gray-900',
      iconColor: 'text-gray-600 dark:text-gray-400',
      disabled: false
    },
  ];

  // Filter actions based on admin status
  const visibleActions = quickActions.filter(action => !action.adminOnly || isAdmin);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      {visibleActions.map((action) => {
        const isLoading = loadingRoutes.has(action.href);
        
        return (
          <div
            key={action.id}
            onClick={() => {
              if (!action.disabled) {
                handleNavigation(action.href);
              }
            }}
            className={`rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow cursor-pointer ${
              action.disabled ? 'bg-gray-100 opacity-70 border-gray-300 pointer-events-none' : 'bg-white border-gray-200'
            }`}
            aria-disabled={action.disabled}
            tabIndex={action.disabled ? -1 : 0}
          >
            <div className="flex items-start justify-between relative w-full">
              <div className="flex-1 flex items-center relative w-full">
                <div className="flex-shrink-0">
                  <div className={`w-12 h-12 ${action.bgColor} rounded-lg flex items-center justify-center`}>
                    {isLoading ? (
                      <Spinner size={24} colorClass="border-gray-300 border-t-blue-600" />
                    ) : (
                      <div className={action.iconColor}>
                        {action.icon}
                      </div>
                    )}
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {action.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {action.description}
                  </p>
                </div>
              </div>
              <div className="ml-3">
                {!action.disabled ? (
                  <svg 
                    className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                ) : (
                  <span className="absolute top-0 right-0 text-xs bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-1 rounded-full">
                    Coming Soon
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
