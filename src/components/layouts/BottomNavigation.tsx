"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { GridIcon, TaskIcon, CalenderIcon, PieChartIcon } from "@/lib/icons";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: <GridIcon />,
    activeIcon: <GridIcon />,
  },
  {
    href: "/execution/daily-sync",
    label: "Daily Sync",
    icon: <TaskIcon />,
    activeIcon: <TaskIcon />,
  },
  {
    href: "/execution/weekly-sync",
    label: "Weekly Sync",
    icon: <CalenderIcon />,
    activeIcon: <CalenderIcon />,
  },
  {
    href: "/planning/main-quests",
    label: "Main Quests",
    icon: <PieChartIcon />,
    activeIcon: <PieChartIcon />,
  },
];

export default function BottomNavigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-lg md:hidden">
      {/* Safe area untuk iPhone dengan home indicator */}
      <div className="pb-safe">
        <div className="flex items-center justify-around px-1 py-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                className={cn(
                  "bottom-nav-item",
                  isActive ? "bottom-nav-item-active" : "bottom-nav-item-inactive"
                )}
              >
                <div className={cn(
                  "bottom-nav-icon",
                  isActive ? "bottom-nav-icon-active" : "bottom-nav-icon-inactive"
                )}>
                  {isActive ? item.activeIcon : item.icon}
                </div>
                <span className={cn(
                  "bottom-nav-label",
                  isActive ? "bottom-nav-label-active" : "bottom-nav-label-inactive"
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
