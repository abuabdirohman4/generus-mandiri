import type { Metadata } from "next";
import Link from 'next/link';
import { Suspense } from 'react';

import { createClient } from '@/lib/supabase/server'
import { EyeIcon, TaskIcon, PieChartIcon } from '@/lib/icons';
import DashboardSkeleton from '@/components/ui/skeleton/DashboardSkeleton';
import QuarterSelector from '@/components/common/QuarterSelector';

export const metadata: Metadata = {
  title: "Dashboard | Better Planner",
  description: "Dashboard untuk aplikasi Better Planner",
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
              {/* <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Dashboard
              </h1> */}
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Welcome Back
              </p>
            </div>
          </div>
        </div>
        <QuarterSelector />

        <div className="col-span-12">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Getting Started
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Welcome to Better Planner! This is where you&apos;ll manage your goals, tasks, and habits. 
              The dashboard will show your daily progress and important metrics once you start using the app.
            </p>
          </div>
        </div>

        {/* Mobile Cards - Only visible on mobile */}
        <div className="col-span-12 md:hidden">
          <div className="grid grid-cols-2 gap-4 mt-4">
            {/* Vision Card */}
            <Link 
              href="/planning/vision"
              className="block bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 hover:shadow-xl transition-all"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-brand-100 to-purple-100 rounded-full flex items-center justify-center mb-3">
                  <EyeIcon />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Vision</h3>
              </div>
            </Link>

            {/* 12 Week Quests Card */}
            <Link 
              href="/planning/12-week-quests"
              className="block bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 hover:shadow-xl transition-all"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-blue-100 rounded-full flex items-center justify-center mb-3">
                  <TaskIcon />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">12 Week Quests</h3>
              </div>
            </Link>

            {/* Main Quests Card */}
            {/* <Link 
              href="/planning/main-quests"
              className="block bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 hover:shadow-xl transition-all"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mb-3">
                  <PieChartIcon />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Main Quests</h3>
              </div>
            </Link> */}

            {/* Work Quests Card */}
            <Link 
              href="/quests/work-quests"
              className="block bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 hover:shadow-xl transition-all"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-green-100 rounded-full flex items-center justify-center mb-3">
                  <TaskIcon />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Work Quests</h3>
              </div>
            </Link>
          </div>
        </div>
      </div>
  );
}
