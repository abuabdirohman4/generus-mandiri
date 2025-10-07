"use client";

import { usePathname } from "next/navigation";
import React from "react";

import { useSidebar } from "@/stores/sidebarStore";
import { useTimerStore } from '@/stores/timerStore';
import AppHeader from "@/components/layouts/AppHeader";
import AppSidebar from "@/components/layouts/AppSidebar";
import Backdrop from "@/components/layouts/Backdrop";
import BottomNavigation from "@/components/layouts/BottomNavigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const pathname = usePathname();
  const isTwelveWeeksGoals = pathname.includes("/planning/12-week-quests");

  // Dynamic class for main content margin based on sidebar state
  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
    ? "lg:ml-[290px]"
    : "lg:ml-[90px]";

  return (
    <div className="min-h-screen dark:bg-gray-900 xl:flex">
        <AppSidebar />
        <Backdrop />
        <div
          className={`flex-1 transition-all  duration-300 ease-in-out ${mainContentMargin}`}
        >
          <AppHeader />
          <div className={`p-4 mx-auto ${!isTwelveWeeksGoals ? "max-w-[var(--breakpoint-2xl)]" : ""} md:p-6 pb-28 md:pb-6`}>
            {children}
          </div>
        </div>
        <BottomNavigation />
      </div>
  );
}
