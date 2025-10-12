import type { Metadata } from "next";
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server'
import HomeSkeleton from '@/components/ui/skeleton/HomeSkeleton';
import HomePage from "./page";

export const metadata: Metadata = {
  title: "Beranda | Generus Mandiri",
  description: "Halaman utama Generus Mandiri - Sistem Digital Generus LDII",
};

export default function HomeLayout() {
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

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Tidak dapat memuat profil user
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Silakan login kembali
          </p>
        </div>
      </div>
    )
  }

  return <HomePage />;
}