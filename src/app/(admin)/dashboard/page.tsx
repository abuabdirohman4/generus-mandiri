"use client";

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import dayjs from 'dayjs'; // Import Dayjs
import 'dayjs/locale/id'; // Import Locale Indonesia
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
import { useDashboardStore } from './stores/dashboardStore';

// Set locale global ke Indonesia
dayjs.locale('id');

export default function AdminDashboard() {
  const { filters, setFilters, setFilter } = useDashboardStore();
  // Derived values
  const selectedPeriod = filters.period;
  const customDateRange = filters.customDateRange;
  const classViewMode = filters.classViewMode;

  // Dynamic date selector states
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedWeekOffset, setSelectedWeekOffset] = useState<number>(0);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  );

  // Fetch organizational data
  const { profile: userProfile } = useUserProfile();
  const { daerah } = useDaerah();
  const { desa } = useDesa();
  const { kelompok } = useKelompok();
  const { classes } = useClasses();

  // Dashboard stats (Total Siswa, Total Kelas)
  const dashboardFilters = useMemo(() => ({
    daerahId: filters.daerah,
    desaId: filters.desa,
    kelompokId: filters.kelompok,
    classId: filters.kelas,
    gender: filters.gender
  }), [filters.daerah, filters.desa, filters.kelompok, filters.kelas, filters.gender]);

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
      gender: filters.gender,
      classViewMode,
      // Dynamic date parameters
      specificDate: selectedDate,
      weekOffset: selectedWeekOffset,
      monthString: selectedMonth
    });
  };

  // Build stable cache key
  const monitoringCacheKey = useMemo(() => {
    const key = {
      period: filters.period,
      dateRange: filters.customDateRange,
      daerah: filters.daerah.sort().join(','),
      desa: filters.desa.sort().join(','),
      kelompok: filters.kelompok.sort().join(','),
      kelas: filters.kelas.sort().join(','),
      gender: filters.gender || '',
      viewMode: filters.classViewMode,
      comparisonLevel: filters.comparisonLevel, // ADDED: Include comparison level in cache key
      // Dynamic date selectors
      selectedDate,
      selectedWeekOffset,
      selectedMonth
    };
    return JSON.stringify(key);
  }, [filters, selectedDate, selectedWeekOffset, selectedMonth]);
  const { data: monitoringData, isLoading: monitoringLoading } = useSWR(
    ['class-monitoring', monitoringCacheKey],
    monitoringFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
      // CRITICAL FIX: Don't keep previous data to avoid filter/data mismatch
      // When filters change, we need fresh data to match the new filters
      keepPreviousData: false
    }
  );

  const handleFilterChange = (newFilters: any) => {
    setFilters({
      daerah: newFilters.daerah || [],
      desa: newFilters.desa || [],
      kelompok: newFilters.kelompok || [],
      kelas: newFilters.kelas || [],
      gender: newFilters.gender
    });
  };
  const handlePeriodChange = (period: PeriodType) => {
    setFilter('period', period);
  };
  const handleCustomDateChange = (start: string, end: string) => {
    setFilter('customDateRange', { start, end });
  };
  const handleViewModeChange = (mode: 'separated' | 'combined') => {
    setFilter('classViewMode', mode);
  };
  const handleComparisonLevelChange = (level: 'class' | 'kelompok' | 'desa' | 'daerah') => {
    setFilter('comparisonLevel', level);
  };

  // Attendance Rate Calculations - Dual Metrics
  const attendanceMetrics = useMemo(() => {
    // If monitoring data is not available or empty, return default values
    if (!monitoringData || monitoringData.length === 0) {
      return {
        simpleAverage: 0,
        weightedAverage: 0,
        totalPresent: 0,
        totalPotential: 0,
        entityCount: 0
      };
    }

    // Get comparison level to determine grouping
    const comparisonLevel = filters.comparisonLevel;

    // Aggregate by entity (class/kelompok/desa/daerah)
    // CRITICAL: Use meeting_ids to deduplicate meetings for multi-class meetings
    const grouped = monitoringData.reduce((acc, cls) => {
      let entityKey: string | undefined;

      if (comparisonLevel === 'class') {
        entityKey = cls.class_name;
      } else if (comparisonLevel === 'kelompok') {
        entityKey = cls.kelompok_name;
      } else if (comparisonLevel === 'desa') {
        entityKey = cls.desa_name;
      } else {
        entityKey = cls.daerah_name;
      }

      if (!entityKey) return acc;

      if (!acc[entityKey]) {
        acc[entityKey] = {
          totalPresent: 0,
          totalPotential: 0,
          attendanceRate: 0,
          meetingIds: new Set<string>() // Track unique meeting IDs
        };
      }

      // Add meeting IDs to deduplicate multi-class meetings
      if (cls.meeting_ids && cls.meeting_ids.length > 0) {
        cls.meeting_ids.forEach(id => acc[entityKey].meetingIds.add(id));
      }

      // Weighted calculation per entity (use original meeting_count for potential)
      // The deduplication will happen when we calculate final metrics
      const potential = (cls.student_count || 0) * cls.meeting_count;
      const present = (cls.attendance_rate / 100) * potential;

      acc[entityKey].totalPresent += present;
      acc[entityKey].totalPotential += potential;

      return acc;
    }, {} as Record<string, { totalPresent: number; totalPotential: number; attendanceRate: number; meetingIds: Set<string> }>);

    // Calculate attendance rate per entity
    Object.keys(grouped).forEach(key => {
      const entity = grouped[key];
      entity.attendanceRate = entity.totalPotential > 0
        ? Math.round((entity.totalPresent / entity.totalPotential) * 100)
        : 0;
    });

    const entities = Object.values(grouped);
    const entityCount = entities.length;

    // Simple Average: Average of entity attendance rates
    const simpleAverage = entityCount > 0
      ? Math.round(entities.reduce((sum, e) => sum + e.attendanceRate, 0) / entityCount)
      : 0;

    // Weighted Average: Total present / Total potential across all entities
    const totalPresent = entities.reduce((sum, e) => sum + e.totalPresent, 0);
    const totalPotential = entities.reduce((sum, e) => sum + e.totalPotential, 0);
    const weightedAverage = totalPotential > 0
      ? Math.round((totalPresent / totalPotential) * 100)
      : 0;

    return {
      simpleAverage,
      weightedAverage,
      totalPresent: Math.round(totalPresent),
      totalPotential: Math.round(totalPotential),
      entityCount
    };
  }, [monitoringData, filters.comparisonLevel]);

  // Get entity label based on comparison level
  const entityLabel = useMemo(() => {
    const level = filters.comparisonLevel;
    if (level === 'class') return 'Kelas';
    if (level === 'kelompok') return 'Kelompok';
    if (level === 'desa') return 'Desa';
    return 'Daerah';
  }, [filters.comparisonLevel]);

  // Attendance Label Logic
  const attendanceLabel = useMemo(() => {
    if (selectedPeriod === 'today') {
      const isToday = dayjs(selectedDate).isSame(dayjs(), 'day');
      const isYesterday = dayjs(selectedDate).isSame(dayjs().subtract(1, 'day'), 'day');

      if (isToday) return 'Kehadiran Hari Ini';
      if (isYesterday) return 'Kehadiran Kemarin';
      return `Kehadiran ${dayjs(selectedDate).format('D MMMM')}`;
    }

    if (selectedPeriod === 'week') {
      if (selectedWeekOffset === 0) return 'Kehadiran Minggu Ini';
      if (selectedWeekOffset === 1) return 'Kehadiran Minggu Lalu';

      // Calculate date range for the label
      const startOfWeek = dayjs().subtract(selectedWeekOffset, 'week').startOf('week').add(1, 'day'); // Assuming Monday
      const endOfWeek = dayjs().subtract(selectedWeekOffset, 'week').endOf('week').add(1, 'day');
      return `Minggu (${startOfWeek.format('D MMM')} - ${endOfWeek.format('D MMM')})`;
    }

    if (selectedPeriod === 'month') {
      const isCurrentMonth = dayjs(selectedMonth).isSame(dayjs(), 'month');
      if (isCurrentMonth) return 'Kehadiran Bulan Ini';

      return `Kehadiran ${dayjs(selectedMonth).format('MMMM YYYY')}`;
    }

    if (selectedPeriod === 'custom' && customDateRange) {
      return `Kehadiran (${dayjs(customDateRange.start).format('D MMM')} - ${dayjs(customDateRange.end).format('D MMM')})`;
    }

    return 'Kehadiran Periode Ini';
  }, [selectedPeriod, selectedDate, selectedWeekOffset, selectedMonth, customDateRange]);

  // Tooltip for attendance metrics
  const attendanceTooltip = useMemo(() => {
    if (!attendanceMetrics || attendanceMetrics.entityCount === 0) return '';

    const { simpleAverage, weightedAverage, totalPresent, totalPotential, entityCount } = attendanceMetrics;

    return `Rata-rata ${entityCount} ${entityLabel.toLowerCase()}: ${simpleAverage}%\n\nTotal siswa hadir: ${weightedAverage}% (${totalPresent.toLocaleString('id-ID')} dari ${totalPotential.toLocaleString('id-ID')} kehadiran)`;
  }, [attendanceMetrics, entityLabel]);


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
      <div className="mx-auto px-0 pb-28 md:pb-0 md:px-6 lg:px-8">
        {/* Data Filter */}
        <div className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm dark:border-gray-700">
          <DataFilter
            filters={{
              daerah: filters.daerah,
              desa: filters.desa,
              kelompok: filters.kelompok,
              kelas: filters.kelas,
              gender: filters.gender
            }}
            onFilterChange={handleFilterChange}
            userProfile={userProfile}
            daerahList={daerah || []}
            desaList={desa || []}
            kelompokList={kelompok || []}
            classList={classes || []}
            showKelas={true}
            showMeetingType={false}
            showGender={true}
            cascadeFilters={true}
            classViewMode={filters.classViewMode}
            onClassViewModeChange={handleViewModeChange}
            showComparisonLevel={true}
            comparisonLevel={filters.comparisonLevel}
            onComparisonLevelChange={handleComparisonLevelChange}
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
            value={
              monitoringLoading ? (
                <span className="inline-block h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              ) : (
                `${attendanceMetrics.simpleAverage}%`
              )
            }
            icon="✅"
            className="col-span-2 md:col-span-1"
            color="emerald"
            tooltip={attendanceTooltip}
          />
        </div>

        {/* Period Tabs */}
        <PeriodTabs
          selected={selectedPeriod}
          onChange={handlePeriodChange}
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