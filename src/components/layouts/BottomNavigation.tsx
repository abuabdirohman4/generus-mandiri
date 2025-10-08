"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { GridIcon, GroupIcon } from "@/lib/icons";
import Spinner from "../ui/spinner/Spinner";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    href: "/home",
    label: "Beranda",
    icon: <GridIcon />,
    activeIcon: <GridIcon />,
  },
  {
    href: "/absensi",
    label: "Absensi",
    icon: <GroupIcon />,
    activeIcon: <GroupIcon />,
  },
];

export default function BottomNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [loadingRoutes, setLoadingRoutes] = useState<Set<string>>(new Set());

  const handleNavigation = useCallback((href: string) => {
    if (href === pathname) return;
    
    setLoadingRoutes(prev => new Set(prev).add(href));
    router.push(href);
  }, [pathname, router]);

  // Clear loading state when navigation completes
  React.useEffect(() => {
    setLoadingRoutes(new Set());
  }, [pathname]);

  // Prefetch all routes on component mount
  React.useEffect(() => {
    navItems.forEach(item => {
      router.prefetch(item.href);
    });
  }, [router]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-lg md:hidden">
      {/* Safe area untuk iPhone dengan home indicator */}
      <div className="pb-safe">
        <div className="flex items-center justify-around px-1 py-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const isLoading = loadingRoutes.has(item.href);
            
            return (
              <button
                key={item.href}
                onClick={() => handleNavigation(item.href)}
                disabled={isLoading}
                className={cn(
                  "bottom-nav-item",
                  isActive ? "bottom-nav-item-active" : "bottom-nav-item-inactive",
                  isLoading ? "opacity-70" : ""
                )}
              >
                <div className={cn(
                  "bottom-nav-icon",
                  isActive ? "bottom-nav-icon-active" : "bottom-nav-icon-inactive"
                )}>
                  {isLoading ? (
                    <Spinner size={16} />
                  ) : (
                    isActive ? item.activeIcon : item.icon
                  )}
                </div>
                <span className={cn(
                  "bottom-nav-label",
                  isActive ? "bottom-nav-label-active" : "bottom-nav-label-inactive"
                )}>
                  {isLoading ? "Loading..." : item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
