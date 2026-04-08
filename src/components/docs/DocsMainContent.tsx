"use client";

import { useSidebar } from "@/stores/sidebarStore";
import type { ReactNode } from "react";

export default function DocsMainContent({ children }: { children: ReactNode }) {
  const { isExpanded, isHovered, isMobileOpen, toggleMobileSidebar } = useSidebar();

  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
    ? "lg:ml-[290px]"
    : "lg:ml-[90px]";

  return (
    <>
      {/* Backdrop for mobile sidebar */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/50 lg:hidden"
          onClick={toggleMobileSidebar}
        />
      )}
      <div className={`flex-1 transition-all duration-300 ease-in-out ${mainContentMargin}`}>
        {children}
      </div>
    </>
  );
}
