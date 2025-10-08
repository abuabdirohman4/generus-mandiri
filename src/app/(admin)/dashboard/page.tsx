import type { Metadata } from "next";
import Link from 'next/link';
import { Suspense } from 'react';

import { createClient } from '@/lib/supabase/server'
import { GroupIcon, UserIcon, CalenderIcon } from '@/lib/icons';
import DashboardSkeleton from '@/components/ui/skeleton/DashboardSkeleton';

export const metadata: Metadata = {
  title: "Dashboard | School Management",
  description: "Dashboard untuk sistem manajemen sekolah",
};

export default function Dashboard() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Selamat datang di sistem manajemen sekolah
              </p>
            </div>
          </div>
        </div>

        <div className="col-span-12">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Sistem Manajemen Sekolah
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Kelola data siswa, guru, dan absensi dengan mudah menggunakan sistem manajemen sekolah ini.
            </p>
          </div>
        </div>

        {/* Mobile Cards - Only visible on mobile */}
        <div className="col-span-12 md:hidden">
          <div className="grid grid-cols-2 gap-4 mt-4">
            {/* Absensi Card */}
            <Link 
              href="/absensi"
              className="block bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 hover:shadow-xl transition-all"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-green-100 rounded-full flex items-center justify-center mb-3">
                  <CalenderIcon />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Absensi</h3>
              </div>
            </Link>

            {/* Teachers Card */}
            <Link 
              href="/teachers"
              className="block bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 hover:shadow-xl transition-all"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mb-3">
                  <UserIcon />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Guru</h3>
              </div>
            </Link>
          </div>
        </div>
      </div>
  );
}
