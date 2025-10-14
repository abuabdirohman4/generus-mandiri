"use client";

import { useUserProfile } from '@/stores/userProfileStore';
import { useDashboard } from '@/hooks/useDashboard';
import DashboardSkeleton from '@/components/ui/skeleton/DashboardSkeleton';
import StatCard from './components/StatCard';
import DistributionChart from './components/DistributionChart';
import TrendChart from './components/TrendChart';

export default function AdminDashboard() {
  const { profile } = useUserProfile();
  const { stats, isLoading, error } = useDashboard();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold">Error loading dashboard</div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Dashboard Admin
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Overview sistem manajemen generus
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Daerah"
          value={stats?.daerah || 0}
          icon="🏢"
          color="blue"
        />
        <StatCard
          title="Total Desa"
          value={stats?.desa || 0}
          icon="🏘️"
          color="green"
        />
        <StatCard
          title="Total Kelompok"
          value={stats?.kelompok || 0}
          icon="👥"
          color="purple"
        />
        <StatCard
          title="Total Admin"
          value={stats?.admin || 0}
          icon="👨‍💼"
          color="orange"
        />
        <StatCard
          title="Total Guru"
          value={stats?.guru || 0}
          icon="👨‍🏫"
          color="indigo"
        />
        <StatCard
          title="Total Siswa"
          value={stats?.siswa || 0}
          icon="👨‍🎓"
          color="pink"
        />
        <StatCard
          title="Total Kelas"
          value={stats?.kelas || 0}
          icon="📚"
          color="teal"
        />
        <StatCard
          title="Kehadiran Hari Ini"
          value={`${stats?.kehadiranHariIni || 0}%`}
          icon="✅"
          color="emerald"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Student Distribution Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Distribusi Siswa per Daerah
          </h3>
          <DistributionChart data={stats?.studentDistribution || []} />
        </div>

        {/* Attendance Trend Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Trend Kehadiran 7 Hari Terakhir
          </h3>
          <TrendChart data={stats?.attendanceTrend || []} />
        </div>
      </div>

      {/* User Distribution Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Distribusi Admin & Guru per Daerah
        </h3>
        <DistributionChart 
          data={stats?.userDistribution || []} 
          type="user"
        />
      </div>
    </div>
  );
}
