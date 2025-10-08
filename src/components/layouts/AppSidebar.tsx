"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useRef, useState,useCallback } from "react";

import { useSidebar } from "@/stores/sidebarStore";
import {
  ChevronDownIcon,
  GridIcon,
  GroupIcon,
} from "@/lib/icons";

type SubNavItem = { name: string; path: string; pro?: boolean; new?: boolean };

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: SubNavItem[];
};

const mainNav: NavItem[] = [
  {
    icon: <GridIcon />,
    name: "Beranda",
    path: "/home",
  },
  {
    icon: <GroupIcon />,
    name: "Absensi",
    path: "/absensi",
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
      <div className={`${isExpanded || isHovered ? 'ml-2' : 'ml-2'} py-8 flex justify-start`}>
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
                Warlob App
              </span>
            </div>
          </div>
        </Link>
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="flex flex-col gap-6">
          <MenuItems 
            navItems={mainNav} 
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
    // Since we don't have submenus anymore, always close any open submenu
    setOpenSubmenu(null);
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
