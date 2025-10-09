import type { Metadata } from 'next';
import PWASettingsSection from '@/components/PWA/PWASettingsSection';

export const metadata: Metadata = {
  title: "PWA Settings | Warlob App",
  description: "Kelola instalasi Progressive Web App (PWA) untuk pengalaman yang lebih baik",
};

export default function PWASettingsPage() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6 not-last:space-y-8 space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          PWA Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Kelola instalasi dan konfigurasi Progressive Web App
        </p>
      </div>

      <PWASettingsSection />
    </div>
  );
}
