"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useRef, useState,useCallback } from "react";

import { useSidebar } from "@/stores/sidebarStore";
import {
  CalenderIcon,
  ChevronDownIcon,
  GridIcon,
  PieChartIcon,
  PlugInIcon,
  UserCircleIcon,
  TaskIcon,
  EyeIcon,
  CheckCircleIcon,
  // DocsIcon,
  // ShootingStarIcon,
} from "@/lib/icons";

type SubNavItem = { name: string; path: string; pro?: boolean; new?: boolean };

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: SubNavItem[];
};

const executionNav: NavItem[] = [
  {
    icon: <GridIcon />,
    name: "Dashboard",
    path: "/dashboard",
  },
  {
    icon: <TaskIcon />,
    name: "Daily Sync",
    path: "/execution/daily-sync",
  },
  {
    icon: <CalenderIcon />,
    name: "Weekly Sync",
    path: "/execution/weekly-sync",
  },
];

const planningNav: NavItem[] = [
  {
    icon: <EyeIcon />,
    name: "Vision",
    path: "/planning/vision",
  },
  {
    icon: <TaskIcon />,
    name: "12 Week Quests",
    path: "/planning/12-week-quests",
  },
  {
    icon: <PieChartIcon />,
    name: "Main Quests",
    path: "/planning/main-quests",
  },
  // {
  //   icon: <DocsIcon />,
  //   name: "Self Development Curriculum",
  //   path: "/planning/curriculum",
  // },
  // {
  //   icon: <ShootingStarIcon />,
  //   name: "Best Week",
  //   path: "/planning/best-week",
  // },
];

const questsNav: NavItem[] = [
  {
    icon: <TaskIcon />,
    name: "Work Quests",
    path: "/quests/work-quests",
  },
  {
    icon: <TaskIcon />,
    name: "Side Quests",
    path: "/quests/side-quests",
  },
];

const trackingNav: NavItem[] = [
  {
    icon: <UserCircleIcon />,
    name: "AW Quests",
    path: "/aw-quests",
  },
  {
    icon: <CheckCircleIcon />,
    name: "Habit Tracker",
    path: "/habit-tracker",
  },
  {
    icon: <PieChartIcon />,
    name: "Reports",
    path: "/reports",
  },
];

const settingsNav: NavItem[] = [
  {
    icon: <PlugInIcon />,
    name: "Settings",
    path: "/profile",
  },
];

// Submenu Badges Component
function SubmenuBadges({ subItem, isActive }: { subItem: SubNavItem; isActive: boolean }) {
  return (
    <span className="flex items-center gap-1 ml-auto">
      {subItem.new === true && (
        <span
          className={`ml-auto ${
            isActive
              ? "menu-dropdown-badge-active"
              : "menu-dropdown-badge-inactive"
          } menu-dropdown-badge`}
        >
          new
        </span>
      )}
      {subItem.pro === true && (
        <span
          className={`ml-auto ${
            isActive
              ? "menu-dropdown-badge-active"
              : "menu-dropdown-badge-inactive"
          } menu-dropdown-badge`}
        >
          pro
        </span>
      )}
    </span>
  );
}

// Submenu Item Component
function SubmenuItem({ 
  subItem, 
  index, 
  isActive 
}: { 
  subItem: SubNavItem; 
  index: number; 
  isActive: (path: string) => boolean;
}) {
  return (
    <li key={subItem.name || index}>
      <Link
        href={subItem.path || ''}
        className={`menu-dropdown-item ${
          isActive(subItem.path || '')
            ? "menu-dropdown-item-active"
            : "menu-dropdown-item-inactive"
        }`}
      >
        {subItem.name || ''}
        <SubmenuBadges subItem={subItem} isActive={isActive(subItem.path || '')} />
      </Link>
    </li>
  );
}

// Submenu Component
function Submenu({ 
  nav, 
  index, 
  menuType, 
  isExpanded, 
  isHovered, 
  isMobileOpen, 
  openSubmenu, 
  subMenuHeight, 
  subMenuRefs,
  isActive
}: { 
  nav: NavItem; 
  index: number; 
  menuType: "main" | "others";
  isExpanded: boolean;
  isHovered: boolean;
  isMobileOpen: boolean;
  openSubmenu: { type: "main" | "others"; index: number } | null;
  subMenuHeight: Record<string, number>;
  subMenuRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  isActive: (path: string) => boolean;
}) {
  const isOpen = openSubmenu?.type === menuType && openSubmenu?.index === index;
  const height = isOpen ? `${subMenuHeight[`${menuType}-${index}`] ?? 0}px` : "0px";

  // Return null AFTER all variable declarations
  if (!nav.subItems || !(isExpanded || isHovered || isMobileOpen)) return null;

  return (
    <div
      ref={(el) => {
        subMenuRefs.current[`${menuType}-${index}`] = el;
      }}
      className="overflow-hidden transition-all duration-300"
      style={{ height }}
    >
      <ul className="mt-2 space-y-1 ml-9">
        {nav.subItems.map((subItem, subIndex) => (
          <SubmenuItem 
            key={subItem.path}
            subItem={subItem} 
            index={subIndex} 
            isActive={isActive}
          />
        ))}
      </ul>
    </div>
  );
}

// Menu Item Component
function MenuItem({ 
  nav, 
  index, 
  menuType, 
  isExpanded, 
  isHovered, 
  isMobileOpen, 
  openSubmenu, 
  subMenuHeight, 
  subMenuRefs, 
  handleSubmenuToggle, 
  isActive 
}: { 
  nav: NavItem; 
  index: number; 
  menuType: "main" | "others";
  isExpanded: boolean;
  isHovered: boolean;
  isMobileOpen: boolean;
  openSubmenu: { type: "main" | "others"; index: number } | null;
  subMenuHeight: Record<string, number>;
  subMenuRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  handleSubmenuToggle: (index: number, menuType: "main" | "others") => void;
  isActive: (path: string) => boolean;
}) {
  const isSubmenuOpen = openSubmenu?.type === menuType && openSubmenu?.index === index;
  const showText = isExpanded || isHovered || isMobileOpen;

  if (nav.subItems) {
    return (
      <li key={nav.name || index}>
        <button
          onClick={() => handleSubmenuToggle(index, menuType)}
          className={`menu-item group ${
            isSubmenuOpen ? "menu-item-active" : "menu-item-inactive"
          } cursor-pointer ${
            !isExpanded && !isHovered ? "lg:justify-center" : "lg:justify-start"
          }`}
        >
          <span
            className={isSubmenuOpen ? "menu-item-icon-active" : "menu-item-icon-inactive"}
          >
            {nav.icon ? nav.icon : null}
          </span>
          {showText && nav.name ? <span className="menu-item-text">{nav.name}</span> : null}
          {showText ? (
            <ChevronDownIcon
              className={`ml-auto w-5 h-5 transition-transform duration-200 ${
                isSubmenuOpen ? "rotate-180 text-brand-500" : ""
              }`}
            />
          ) : null}
        </button>
        <Submenu 
          nav={nav} 
          index={index} 
          menuType={menuType}
          isExpanded={isExpanded}
          isHovered={isHovered}
          isMobileOpen={isMobileOpen}
          openSubmenu={openSubmenu}
          subMenuHeight={subMenuHeight}
          subMenuRefs={subMenuRefs}
          isActive={isActive}
        />
      </li>
    );
  }

  if (nav.path) {
    return (
      <li key={nav.name || index}>
        <Link
          href={nav.path}
          prefetch={true}
          className={`menu-item group ${
            isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
          }`}
        >
          <span
            className={
              isActive(nav.path) ? "menu-item-icon-active" : "menu-item-icon-inactive"
            }
          >
            {nav.icon ? nav.icon : null}
          </span>
          {showText && nav.name ? <span className="menu-item-text">{nav.name}</span> : null}
        </Link>
      </li>
    );
  }

  return null;
}

// Menu Items Component
function MenuItems({ 
  navItems, 
  menuType, 
  isExpanded, 
  isHovered, 
  isMobileOpen, 
  openSubmenu, 
  subMenuHeight, 
  subMenuRefs, 
  handleSubmenuToggle, 
  isActive 
}: { 
  navItems: NavItem[]; 
  menuType: "main" | "others";
  isExpanded: boolean;
  isHovered: boolean;
  isMobileOpen: boolean;
  openSubmenu: { type: "main" | "others"; index: number } | null;
  subMenuHeight: Record<string, number>;
  subMenuRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  handleSubmenuToggle: (index: number, menuType: "main" | "others") => void;
  isActive: (path: string) => boolean;
}) {
  return (
    <ul className="flex flex-col gap-4">
      {navItems.map((nav, index) => (
        <MenuItem 
          key={nav.path || nav.name}
          nav={nav} 
          index={index} 
          menuType={menuType}
          isExpanded={isExpanded}
          isHovered={isHovered}
          isMobileOpen={isMobileOpen}
          openSubmenu={openSubmenu}
          subMenuHeight={subMenuHeight}
          subMenuRefs={subMenuRefs}
          handleSubmenuToggle={handleSubmenuToggle}
          isActive={isActive}
        />
      ))}
    </ul>
  );
}

function SidebarContent({
  isExpanded,
  isMobileOpen,
  isHovered,
  setIsHovered,
  openSubmenu,
  subMenuHeight,
  subMenuRefs,
  handleSubmenuToggle,
  isActive
}: {
  isExpanded: boolean;
  isMobileOpen: boolean;
  isHovered: boolean;
  setIsHovered: (hovered: boolean) => void;
  openSubmenu: { type: "main" | "others"; index: number } | null;
  subMenuHeight: Record<string, number>;
  subMenuRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  handleSubmenuToggle: (index: number, menuType: "main" | "others") => void;
  isActive: (path: string) => boolean;
}) {
  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 transform
        ${
          isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
        <div className="py-8 ml-4 flex justify-start">
            <Link href="/" className="relative block">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Image
                    src="/images/logo/logo-icon.svg"
                    alt="Logo"
                    width={34}
                    height={34}
                    priority
                  />
                </div>
                
                <div
                  className={`transition-all duration-300 ease-in-out transform ${
                    isExpanded || isHovered || isMobileOpen
                      ? "opacity-100 translate-x-0 ml-3 w-auto"
                      : "opacity-0 -translate-x-4 absolute pointer-events-none ml-0 w-0 overflow-hidden"
                  }`}
                >
                  <span className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    Better Planner
                  </span>
                </div>
              </div>
            </Link>
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="flex flex-col gap-6">
          {/* EXECUTION */}
          <div className="mb-2">
            <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Execution</div>
            <MenuItems 
              navItems={executionNav} 
              menuType="main"
              isExpanded={isExpanded}
              isHovered={isHovered}
              isMobileOpen={isMobileOpen}
              openSubmenu={openSubmenu}
              subMenuHeight={subMenuHeight}
              subMenuRefs={subMenuRefs}
              handleSubmenuToggle={handleSubmenuToggle}
              isActive={isActive}
            />
          </div>
          {/* PLANNING */}
          <div className="mb-2">
            <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Planning</div>
            <MenuItems 
              navItems={planningNav} 
              menuType="main"
              isExpanded={isExpanded}
              isHovered={isHovered}
              isMobileOpen={isMobileOpen}
              openSubmenu={openSubmenu}
              subMenuHeight={subMenuHeight}
              subMenuRefs={subMenuRefs}
              handleSubmenuToggle={handleSubmenuToggle}
              isActive={isActive}
            />
          </div>
          {/* QUEST */}
          <div className="mb-2">
            <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Quests</div>
            <MenuItems 
              navItems={questsNav} 
              menuType="main"
              isExpanded={isExpanded}
              isHovered={isHovered}
              isMobileOpen={isMobileOpen}
              openSubmenu={openSubmenu}
              subMenuHeight={subMenuHeight}
              subMenuRefs={subMenuRefs}
              handleSubmenuToggle={handleSubmenuToggle}
              isActive={isActive}
            />
          </div>
          {/* TRACKING */}
          {/* <div className="mb-2">
            <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Tracking</div>
            <MenuItems 
              navItems={trackingNav} 
              menuType="main"
              isExpanded={isExpanded}
              isHovered={isHovered}
              isMobileOpen={isMobileOpen}
              openSubmenu={openSubmenu}
              subMenuHeight={subMenuHeight}
              subMenuRefs={subMenuRefs}
              handleSubmenuToggle={handleSubmenuToggle}
              isActive={isActive}
            />
          </div> */}
          {/* Divider */}
          {/* <div className="flex-1" /> */}
          {/* SETTINGS */}
          {/* <div className="mb-2">
            <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Settings</div>
            <MenuItems 
              navItems={settingsNav} 
              menuType="main"
              isExpanded={isExpanded}
              isHovered={isHovered}
              isMobileOpen={isMobileOpen}
              openSubmenu={openSubmenu}
              subMenuHeight={subMenuHeight}
              subMenuRefs={subMenuRefs}
              handleSubmenuToggle={handleSubmenuToggle}
              isActive={isActive}
            />
          </div> */}
        </nav>
      </div>
    </aside>
  );
}

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "others";
    index: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
    {}
  );
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isActive = useCallback((path: string) => path === pathname, [pathname]);

  useEffect(() => {
    // Check if the current path matches any submenu item
    let submenuMatched = false;
    ["main", "others"].forEach((menuType) => {
      const items = menuType === "main" ? executionNav : trackingNav;
      items.forEach((nav, index) => {
        if (nav.subItems) {
          nav.subItems.forEach((subItem) => {
            if (isActive(subItem.path)) {
              setOpenSubmenu({
                type: menuType as "main" | "others",
                index,
              });
              submenuMatched = true;
            }
          });
        }
      });
    });

    // If no submenu item matches, close the open submenu
    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [pathname,isActive]);

  useEffect(() => {
    // Set the height of the submenu items when the submenu is opened
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (index: number, menuType: "main" | "others") => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.index === index
      ) {
        return null;
      }
      return { type: menuType, index };
    });
  };

  return (
    <SidebarContent
      isExpanded={isExpanded}
      isMobileOpen={isMobileOpen}
      isHovered={isHovered}
      setIsHovered={setIsHovered}
      openSubmenu={openSubmenu}
      subMenuHeight={subMenuHeight}
      subMenuRefs={subMenuRefs}
      handleSubmenuToggle={handleSubmenuToggle}
      isActive={isActive}
    />
  );
};

export default AppSidebar;
