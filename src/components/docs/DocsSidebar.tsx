"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/stores/sidebarStore";
import type { PageMapItem, Folder, MdxFile, MetaJsonFile } from "nextra";

function isFolder(item: PageMapItem): item is Folder {
  return "children" in item;
}

function isMdxFile(item: PageMapItem): item is MdxFile {
  return "route" in item && !("children" in item);
}

function isMetaJsonFile(item: PageMapItem): item is MetaJsonFile {
  return "data" in item;
}

function extractMeta(items: PageMapItem[]): Record<string, string> {
  for (const item of items) {
    if (isMetaJsonFile(item)) {
      const result: Record<string, string> = {};
      for (const [key, value] of Object.entries(item.data)) {
        if (typeof value === "string") {
          result[key] = value;
        } else if (typeof value === "object" && value !== null && "title" in value) {
          result[key] = String(value.title);
        }
      }
      return result;
    }
  }
  return {};
}

function getTitle(item: MdxFile | Folder, meta: Record<string, string>): string {
  if (meta[item.name]) return meta[item.name];
  if ("frontMatter" in item && item.frontMatter?.title) {
    return item.frontMatter.title as string;
  }
  return item.name.charAt(0).toUpperCase() + item.name.slice(1).replace(/-/g, " ");
}

function toHref(route: string): string {
  return route.replace(/^\/docs\/docs/, "/docs");
}

function NavItems({
  items,
  depth,
  showText,
}: {
  items: PageMapItem[];
  depth: number;
  showText: boolean;
}) {
  const meta = extractMeta(items);
  const pathname = usePathname();

  const metaKeys = Object.keys(meta);
  const sorted = [...items]
    .filter((item) => isMdxFile(item) || isFolder(item))
    .sort((a, b) => {
      const ai = metaKeys.indexOf((a as MdxFile | Folder).name);
      const bi = metaKeys.indexOf((b as MdxFile | Folder).name);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });

  return (
    <>
      {sorted.map((item, i) => {
        if (isFolder(item)) {
          const label = getTitle(item, meta);
          return (
            <div key={i}>
              {showText && (
                <p className="mt-6 mb-2 px-4 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                  {label}
                </p>
              )}
              {!showText && (
                <div className="my-3 mx-4 border-t border-gray-200 dark:border-gray-700" />
              )}
              <ul className="flex flex-col gap-1">
                <NavItems items={item.children} depth={depth + 1} showText={showText} />
              </ul>
            </div>
          );
        }

        if (isMdxFile(item)) {
          const href = toHref(item.route);
          const isActive = pathname === href || (href !== "/docs" && pathname.startsWith(href + "/"));
          const label = getTitle(item, meta);

          return (
            <li key={i}>
              <Link
                href={href}
                className={`menu-item group ${
                  isActive ? "menu-item-active" : "menu-item-inactive"
                } ${!showText ? "lg:justify-center" : "lg:justify-start"}`}
              >
                {/* Dot icon when collapsed, text icon when expanded */}
                <span
                  className={`w-6 h-6 flex items-center justify-center shrink-0 ${
                    isActive ? "menu-item-icon-active" : "menu-item-icon-inactive"
                  }`}
                >
                  <svg
                    width="6"
                    height="6"
                    viewBox="0 0 6 6"
                    fill="currentColor"
                    className="shrink-0"
                  >
                    <circle cx="3" cy="3" r="3" />
                  </svg>
                </span>
                {showText && (
                  <span className="menu-item-text">{label}</span>
                )}
              </Link>
            </li>
          );
        }

        return null;
      })}
    </>
  );
}

export default function DocsSidebar({ pageMap }: { pageMap: PageMapItem[] }) {
  const { isExpanded, isHovered, isMobileOpen, setIsHovered } = useSidebar();
  const showText = isExpanded || isHovered || isMobileOpen;

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 transform
        ${isExpanded || isMobileOpen ? "w-72.5" : isHovered ? "w-72.5" : "w-22.5"}
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Logo — same as AppSidebar */}
      <div className="ml-2 py-8 flex justify-start">
        <Link href="/docs" className="relative block">
          <div className="flex items-center">
            <div className="shrink-0">
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
                showText
                  ? "opacity-100 translate-x-0 ml-3 w-auto"
                  : "opacity-0 -translate-x-4 absolute pointer-events-none ml-0 w-0 overflow-hidden"
              }`}
            >
              <span
                className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight"
                style={{ fontFamily: "Inter, system-ui, sans-serif" }}
              >
                Dokumentasi
              </span>
            </div>
          </div>
        </Link>
      </div>

      {/* Nav items */}
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav>
          <ul className="flex flex-col gap-1">
            <NavItems items={pageMap} depth={0} showText={showText} />
          </ul>
        </nav>
      </div>
    </aside>
  );
}
