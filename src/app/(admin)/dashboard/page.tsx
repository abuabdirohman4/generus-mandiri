"use client";

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { useDashboard } from '@/hooks/useDashboard';
import DashboardSkeleton from '@/components/ui/skeleton/DashboardSkeleton';
import StatCard from './components/StatCard';
import PeriodTabs, { PeriodType } from './components/PeriodTabs';
import ClassMonitoringTable from './components/ClassMonitoringTable';
import DataFilter from '@/components/shared/DataFilter';
import { useDaerah } from '@/hooks/useDaerah';
import { useDesa } from '@/hooks/useDesa';
import { useKelompok } from '@/hooks/useKelompok';
import { useClasses } from '@/hooks/useClasses';
import { useUserProfile } from '@/stores/userProfileStore';
import { getClassMonitoring } from './actions';

export default function AdminDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('today');
  const [customDateRange, setCustomDateRange] = useState<{ start: string; end: string }>();
  const [classViewMode, setClassViewMode] = useState<'separated' | 'combined'>('separated');

  // Dynamic date selector states
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedWeekOffset, setSelectedWeekOffset] = useState<number>(0);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  );

  const [filters, setFilters] = useState({
    daerah: [] as string[],
    desa: [] as string[],
    kelompok: [] as string[],
    kelas: [] as string[]
  });

  // Fetch organizational data
  const { profile: userProfile } = useUserProfile();
  const { daerah } = useDaerah();
  const { desa } = useDesa();
  const { kelompok } = useKelompok();
  const { classes } = useClasses();

  // Dashboard stats (Total Siswa, Total Kelas) - affected by filters
  const dashboardFilters = useMemo(() => ({
    daerahId: filters.daerah,
    desaId: filters.desa,
    kelompokId: filters.kelompok,
    classId: filters.kelas
  }), [filters]);

  const { stats, isLoading: statsLoading, error: statsError } = useDashboard(dashboardFilters);

  // Class Monitoring Data - affected by filters AND period AND viewMode AND dynamic dates
  const monitoringFetcher = async () => {
    return await getClassMonitoring({
      period: selectedPeriod,
      startDate: customDateRange?.start,
      endDate: customDateRange?.end,
      daerahId: filters.daerah,
      desaId: filters.desa,
      kelompokId: filters.kelompok,
      classId: filters.kelas,
      classViewMode,
      // Dynamic date parameters
      specificDate: selectedDate,
      weekOffset: selectedWeekOffset,
      monthString: selectedMonth
    });
  };

  const { data: monitoringData, isLoading: monitoringLoading } = useSWR(
    ['class-monitoring', selectedPeriod, customDateRange, filters, classViewMode, selectedDate, selectedWeekOffset, selectedMonth],
    monitoringFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000
    }
  );

  const handleCustomDateChange = (start: string, end: string) => {
    setCustomDateRange({ start, end });
  };

  const handleFilterChange = (newFilters: any) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
  };

  // Calculate dynamic attendance rate based on monitoring data
  const attendanceRate = useMemo(() => {
    if (!monitoringData || monitoringData.length === 0) return 0;

    // If period is 'today', use stats.kehadiranHariIni
    // If period is 'week', use stats.kehadiranMingguan
    // If period is 'month', use stats.kehadiranBulanan

    if (selectedPeriod === 'today') return stats?.kehadiranHariIni || 0;
    if (selectedPeriod === 'week') return stats?.kehadiranMingguan || 0;
    if (selectedPeriod === 'month') return stats?.kehadiranBulanan || 0;

    // Fallback for custom period: average of class rates
    const totalRate = monitoringData.reduce((acc, curr) => acc + curr.attendance_rate, 0);
    return Math.round(totalRate / monitoringData.length);
  }, [selectedPeriod, stats, monitoringData]);

  const attendanceLabel = useMemo(() => {
    if (selectedPeriod === 'today') return 'Kehadiran Hari Ini';
    if (selectedPeriod === 'week') return 'Kehadiran Minggu Ini';
    if (selectedPeriod === 'month') return 'Kehadiran Bulan Ini';
    return 'Kehadiran Periode Ini';
  }, [selectedPeriod]);

  if (statsLoading && !stats) {
    return <DashboardSkeleton />;
  }

  if (statsError) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold">Error loading dashboard</div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">{statsError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto px-0 sm:px-6 lg:px-8">
        {/* Data Filter */}
        <div className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm dark:border-gray-700">
          <DataFilter
            filters={filters}
            onFilterChange={handleFilterChange}
            userProfile={userProfile}
            daerahList={daerah || []}
            desaList={desa || []}
            kelompokList={kelompok || []}
            classList={classes || []}
            showKelas={true}
            showMeetingType={false}
            showGender={false}
            cascadeFilters={false}
            classViewMode={classViewMode}
            onClassViewModeChange={setClassViewMode}
          />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          <StatCard
            title="Total Siswa"
            value={stats?.siswa || 0}
            icon="👨‍🎓"
            color="blue"
          />
          <StatCard
            title="Total Kelas"
            value={stats?.kelas || 0}
            icon="📚"
            color="purple"
          />
          <StatCard
            title={attendanceLabel}
            value={`${attendanceRate}%`}
            icon="✅"
            className="col-span-2 md:col-span-1"
            color="emerald"
          />
        </div>

        {/* Period Tabs */}
        <PeriodTabs
          selected={selectedPeriod}
          onChange={setSelectedPeriod}
          customDateRange={customDateRange}
          onCustomDateChange={handleCustomDateChange}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          selectedWeekOffset={selectedWeekOffset}
          onWeekOffsetChange={setSelectedWeekOffset}
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
        />

        {/* Class Monitoring Table */}
        <div className="mb-6">
          <ClassMonitoringTable
            data={monitoringData || []}
            isLoading={monitoringLoading}
            period={selectedPeriod}
            customDateRange={customDateRange}
            classViewMode={classViewMode}
          />
        </div>
      </div>
    </div>
  );
}
