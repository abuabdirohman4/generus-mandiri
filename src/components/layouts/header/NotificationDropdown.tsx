"use client";
import Link from "next/link";
import React, { useState, useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";

import { Dropdown } from "../../ui/dropdown/Dropdown";
import { DropdownItem } from "../../ui/dropdown/DropdownItem";
import { useNotifications } from "@/hooks/useNotifications";
import type { NotificationWithStatus } from "@/types/notification";
import { stripHtml } from "@/lib/htmlText";
import Spinner from "@/components/ui/spinner/Spinner";

// ─── Helper ───────────────────────────────────────────────────────────────────

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  return `${days} hari lalu`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function NotificationBellIcon() {
  return (
    <svg
      className="fill-current"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
        fill="currentColor"
      />
    </svg>
  );
}

function NotificationButton({
  onClick,
  unreadCount,
}: {
  onClick: () => void;
  unreadCount: number;
}) {
  return (
    <button
      className="relative dropdown-toggle flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full hover:text-gray-700 h-11 w-11 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
      onClick={onClick}
      aria-label={`Notifikasi${unreadCount > 0 ? ` (${unreadCount} belum dibaca)` : ""}`}
    >
      {unreadCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 z-10 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-400 px-1 text-[10px] font-bold leading-none text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
        </span>
      )}
      <NotificationBellIcon />
    </button>
  );
}

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-gray-500 transition dropdown-toggle dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
    >
      <svg
        className="fill-current"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
          fill="currentColor"
        />
      </svg>
    </button>
  );
}

function NotificationHeader({
  unreadCount,
  onClose,
  onMarkAllRead,
}: {
  unreadCount: number;
  onClose: () => void;
  onMarkAllRead: () => void;
}) {
  return (
    <div className="pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
          Notifikasi
        </h5>
        <CloseButton onClick={onClose} />
      </div>
      {unreadCount > 0 && (
        <button
          onClick={onMarkAllRead}
          className="mt-1 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          Tandai semua dibaca
        </button>
      )}
    </div>
  );
}

function NotificationListItem({
  item,
  onRead,
  navigating,
  onNavigate,
}: {
  item: NotificationWithStatus;
  onRead: () => void;
  navigating: boolean;
  onNavigate: (id: string) => void;
}) {
  const handleClick = () => {
    if (!item.is_read) onRead();
    onNavigate(item.id);
  };

  return (
    <li>
      <DropdownItem
        onItemClick={handleClick}
        tag="a"
        href={`/notifikasi/${item.id}`}
        className={`flex w-full gap-3 rounded-lg border-b border-gray-100 px-4 py-3 text-left hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-white/5 ${
          item.is_read
            ? "bg-white dark:bg-transparent"
            : "bg-blue-50 dark:bg-blue-900/20"
        }`}
      >
        {/* Unread indicator dot / loading spinner */}
        <span className="mt-1 shrink-0">
          {navigating ? (
            <Spinner size={14} colorClass="border-gray-400" />
          ) : (
            <span
              className={`block h-2 w-2 rounded-full ${
                item.is_read ? "bg-transparent" : "bg-blue-500"
              }`}
            />
          )}
        </span>

        <span className="block min-w-0 flex-1">
          {/* Sender name */}
          {item.sender_name && (
            <span className="block truncate text-theme-xs text-gray-400 dark:text-gray-500 mb-0.5">
              {item.sender_name}
            </span>
          )}
          {/* Title */}
          <span
            className={`mb-0.5 block line-clamp-2 text-theme-sm ${
              item.is_read
                ? "text-gray-700 dark:text-gray-300"
                : "font-semibold text-gray-900 dark:text-white"
            }`}
          >
            {item.title}
          </span>

          {/* Body preview */}
          <span className="mb-1 block truncate text-theme-xs text-gray-500 dark:text-gray-400">
            {stripHtml(item.body)}
          </span>

          {/* Timestamp + edited */}
          <span className="flex items-center gap-1 text-theme-xs text-gray-400 dark:text-gray-500">
            <span>{formatRelativeTime(item.created_at)}</span>
            {item.edited_at && (
              <span className="italic">· diedit</span>
            )}
          </span>
        </span>
      </DropdownItem>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
        Tidak ada notifikasi
      </p>
      <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
        Notifikasi baru akan muncul di sini
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [navigatingId, setNavigatingId] = useState<string | null>(null);
  const { notifications, unreadCount, markRead, markAllRead } =
    useNotifications();

  const pathname = usePathname();
  useEffect(() => {
    if (navigatingId !== null) {
      setNavigatingId(null);
      setIsOpen(false);
    }
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleDropdown = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Show only the 5 most recent notifications
  const recentNotifications = notifications.slice(0, 5);

  return (
    <div className="relative">
      <NotificationButton onClick={toggleDropdown} unreadCount={unreadCount} />
      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute -right-60 mt-4.25 flex w-87.5 flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-90.25 lg:right-0"
      >
        <NotificationHeader
          unreadCount={unreadCount}
          onClose={toggleDropdown}
          onMarkAllRead={markAllRead}
        />

        {recentNotifications.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="flex flex-col overflow-y-auto custom-scrollbar max-h-90">
            {recentNotifications.map((item) => (
              <NotificationListItem
                key={item.id}
                item={item}
                onRead={() => markRead([item.id])}
                navigating={navigatingId === item.id}
                onNavigate={setNavigatingId}
              />
            ))}
          </ul>
        )}

        <Link
          href="/notifikasi"
          onClick={closeDropdown}
          className="mt-3 block rounded-lg border border-gray-300 bg-white px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          Lihat semua
        </Link>
      </Dropdown>
    </div>
  );
}
