import type { Metadata } from "next";
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server'
import HomeSkeleton from '@/components/ui/skeleton/HomeSkeleton';
import { UserProfileProvider } from './UserProfileProvider';

export const metadata: Metadata = {
  title: "Home | Warlob App",
  description: "Halaman utama Warlob App - Sistem Absensi Digital",
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

  return (
    <UserProfileProvider profile={profile}>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Absensi Card */}
          <a href="/absensi" className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow cursor-pointer block">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Absensi</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Kelola kehadiran siswa</p>
              </div>
            </div>
          </a>

          {/* Kelas Card */}
          {/* <a href="/kelas" className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow cursor-pointer block">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Kelas</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {isAdmin ? 'Kelola semua kelas' : `${profile.classes?.[0]?.name || 'Kelas tidak diketahui'}`}
                </p>
              </div>
            </div>
          </a> */}

          {/* Siswa Card */}
          <a href="/siswa" className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow cursor-pointer block">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Siswa</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {isAdmin ? 'Kelola semua siswa' : `Siswa ${profile.classes?.[0]?.name || 'kelas tidak diketahui'}`}
                </p>
              </div>
            </div>
          </a>

          {/* Admin Only Cards */}
          {isAdmin && (
            <>
              {/* Guru Card */}
              <a href="/admin/teachers" className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow cursor-pointer block">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Guru</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Kelola data guru</p>
                  </div>
                </div>
              </a>

              {/* Laporan Card */}
              <a href="/laporan" className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow cursor-pointer block">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Laporan</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Laporan absensi</p>
                  </div>
                </div>
              </a>
            </>
          )}
        </div>

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
    </UserProfileProvider>
  )
}
