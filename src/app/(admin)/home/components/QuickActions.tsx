'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Spinner from '@/components/ui/spinner/Spinner';
import { GroupIcon, ReportIcon, DashboardIcon, BuildingIcon, TableIcon, BookOpenIcon } from '@/lib/icons';
import { isAdminKelompok, isTeacher } from '@/lib/userUtils';
import { isCaberawitClass } from '@/lib/utils/classHelpers';

interface Profile {
  id: string;
  full_name: string;
  role: string;
  email?: string;
  kelompok_id?: string | null;
  desa_id?: string | null;
  daerah_id?: string | null;
  kelompok?: { id: string; name: string } | null;
  desa?: { id: string; name: string } | null;
  daerah?: { id: string; name: string } | null;
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
  excludeAdminKelompok?: boolean;
  disabled?: boolean; 
}

export default function QuickActions({ isAdmin, profile }: QuickActionsProps) {
  const [loadingRoutes, setLoadingRoutes] = useState<Set<string>>(new Set());
  const router = useRouter();
  const isKelas6Warlob = isTeacher(profile) && profile.id === '88888888-8888-8888-8888-888888888888'
  const teacherCaberawit = profile.classes?.some(c => isCaberawitClass(c)) || false
  // console.log('isTeacher', isTeacher(profile))
  // console.log('!isKelas6Warlob', !isKelas6Warlob)
  // console.log('teacherCaberawit', teacherCaberawit)

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
      disabled: false
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
      href: '/users/siswa',
      icon: (
        <GroupIcon className="w-6 h-6" />
      ),
      bgColor: 'bg-purple-100 dark:bg-purple-900',
      iconColor: 'text-purple-600 dark:text-purple-400',
      disabled: false
    },
    {
      id: 'materi',
      name: 'Materi',
      description: 'Materi Pembelajaran',
      href: '/materi',
      icon: <BookOpenIcon className="w-6 h-6" />,
      bgColor: 'bg-yellow-100 dark:bg-yellow-900',
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      adminOnly: teacherCaberawit ? false : true,
      disabled: isTeacher(profile) && !isKelas6Warlob ? true : false
    },
    {
      id: 'tahun-ajaran',
      name: 'Tahun Ajaran',
      description: 'Kelola tahun ajaran',
      href: '/tahun-ajaran',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      bgColor: 'bg-cyan-100 dark:bg-cyan-900',
      iconColor: 'text-cyan-600 dark:text-cyan-400',
      adminOnly: true,
      disabled: false
    },
    {
      id: 'monitoring',
      name: 'Monitoring',
      description: 'Monitoring siswa',
      href: '/monitoring',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      bgColor: 'bg-emerald-100 dark:bg-emerald-900',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      adminOnly: teacherCaberawit ? false : true,
      disabled: isTeacher(profile) && !isKelas6Warlob ? true : false
    },
    {
      id: 'rapot',
      name: 'Rapot',
      description: 'Rapot akademik siswa',
      href: '/rapot',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      bgColor: 'bg-rose-100 dark:bg-rose-900',
      iconColor: 'text-rose-600 dark:text-rose-400',
      adminOnly: teacherCaberawit ? false : true,
      disabled: true // Coming soon - Phase 3
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
      disabled: isTeacher(profile) ? true : false
    },
    {
      id: 'admin',
      name: 'Admin',
      description: 'Kelola data admin',
      href: '/users/admin',
      icon: <GroupIcon className="w-6 h-6" />,
      bgColor: 'bg-blue-100 dark:bg-blue-900',
      iconColor: 'text-blue-600 dark:text-blue-400',
      adminOnly: true,
      excludeAdminKelompok: true,
      disabled: false
    },
    {
      id: 'kelas',
      name: 'Kelas',
      description: 'Kelola data kelas',
      href: '/kelas',
      icon: <TableIcon className="w-6 h-6" />,
      bgColor: 'bg-teal-100 dark:bg-teal-900',
      iconColor: 'text-teal-600 dark:text-teal-400',
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
      excludeAdminKelompok: true,
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

  // Filter actions based on admin status and role-specific exclusions
  const visibleActions = quickActions.filter(action => {
    // Filter out admin-only actions for non-admins
    if (action.adminOnly && !isAdmin) {
      return false
    }

    // Filter out actions that exclude Admin Kelompok
    if (action.excludeAdminKelompok && isAdminKelompok(profile)) {
      return false
    }

    return true
  });

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
            className={`rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow cursor-pointer ${action.disabled ? 'bg-gray-100 opacity-70 border-gray-300 pointer-events-none' : 'bg-white border-gray-200'
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
