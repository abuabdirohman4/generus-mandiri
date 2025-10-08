import type { Metadata } from "next";
import { Suspense } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server'
import HomeSkeleton from '@/components/ui/skeleton/HomeSkeleton';
import QuickActions from './components/QuickActions';

export const metadata: Metadata = {
  title: "Beranda | Warlob App",
  description: "Halaman utama Warlob App - Sistem Digital Generus Warlob",
};

export default function HomePage() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <HomeContent />
    </Suspense>
  );
}

async function HomeContent() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Tidak dapat memuat data user
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Silakan login kembali
          </p>
        </div>
      </div>
    )
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      role,
      classes!classes_teacher_id_fkey (
        id,
        name
      )
    `)
    .eq('id', user.id)
    .single()

  // Extract username from email
  const username = user.email?.split('@')[0] || 'Unknown'

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Profile tidak ditemukan
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Silakan hubungi administrator
          </p>
        </div>
      </div>
    )
  }

  const isAdmin = profile.role === 'admin'
  const isTeacher = profile.role === 'teacher'

  // Add email to profile data
  const profileWithEmail = {
    ...profile,
    email: user.email
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="md:flex md:gap-2 text-3xl font-bold text-gray-900 dark:text-white mb-2">
            <div>Selamat Datang, </div> 
            <div>{profile.full_name}!</div> 
          </h1>
          {/* <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            Username: {username}
          </p> */}
          <p className="text-lg text-gray-600 dark:text-gray-400">
            {isAdmin 
              ? 'Selamat datang di dashboard admin Warlob App' 
              : `Selamat datang di ${profile.classes?.[0]?.name || 'kelas tidak diketahui'}`
            }
          </p>
        </div>

        {/* Quick Actions */}
        <QuickActions isAdmin={isAdmin} profile={profile} />

        {/* Recent Activity */}
        {/* <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Aktivitas Terbaru</h2>
          <div className="space-y-3">
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
              <span>Selamat datang di Warlob App!</span>
              <span className="ml-auto text-xs text-gray-500 dark:text-gray-500">
                {new Date().toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div> */}
      </div>
    </div>
  )
}
