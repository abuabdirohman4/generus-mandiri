import type { Metadata } from 'next';
import CacheSettingsSection from './components/CacheSettingsSection';

export const metadata: Metadata = {
  title: "Reset Cache | Generus Mandiri",
  description: "Hapus semua cookies dan cache aplikasi untuk memulai fresh",
};

export default function CacheSettingsPage() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6 not-last:space-y-8 space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Reset Cookies & Cache
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Hapus semua cookies, cache, dan data tersimpan untuk memulai fresh
        </p>
      </div>

      <CacheSettingsSection />
    </div>
  );
}
