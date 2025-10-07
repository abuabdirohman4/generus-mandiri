"use client";
import Image from "next/image";
import Link from "next/link";
import React, { useState, useCallback } from "react";

import { Dropdown } from "../../ui/dropdown/Dropdown";
import { DropdownItem } from "../../ui/dropdown/DropdownItem";

interface NotificationItem {
  id: string;
  user: {
    name: string;
    avatar: string;
    status: 'online' | 'offline';
  };
  action: string;
  project: string;
  time: string;
  href?: string;
}

const notificationData: NotificationItem[] = [
  {
    id: '1',
    user: {
      name: 'Terry Franci',
      avatar: '/images/user/user-02.jpg',
      status: 'online'
    },
    action: 'requests permission to change',
    project: 'Project - Nganter App',
    time: '5 min ago'
  },
  {
    id: '2',
    user: {
      name: 'Alena Franci',
      avatar: '/images/user/user-03.jpg',
      status: 'online'
    },
    action: 'requests permission to change',
    project: 'Project - Nganter App',
    time: '8 min ago'
  },
  {
    id: '3',
    user: {
      name: 'Jocelyn Kenter',
      avatar: '/images/user/user-04.jpg',
      status: 'online'
    },
    action: 'requests permission to change',
    project: 'Project - Nganter App',
    time: '15 min ago'
  },
  {
    id: '4',
    user: {
      name: 'Brandon Philips',
      avatar: '/images/user/user-05.jpg',
      status: 'offline'
    },
    action: 'requests permission to change',
    project: 'Project - Nganter App',
    time: '1 hr ago'
  },
  {
    id: '5',
    user: {
      name: 'Terry Franci',
      avatar: '/images/user/user-02.jpg',
      status: 'online'
    },
    action: 'requests permission to change',
    project: 'Project - Nganter App',
    time: '5 min ago'
  },
  {
    id: '6',
    user: {
      name: 'Alena Franci',
      avatar: '/images/user/user-03.jpg',
      status: 'online'
    },
    action: 'requests permission to change',
    project: 'Project - Nganter App',
    time: '8 min ago'
  },
  {
    id: '7',
    user: {
      name: 'Jocelyn Kenter',
      avatar: '/images/user/user-04.jpg',
      status: 'online'
    },
    action: 'requests permission to change',
    project: 'Project - Nganter App',
    time: '15 min ago'
  },
  {
    id: '8',
    user: {
      name: 'Brandon Philips',
      avatar: '/images/user/user-05.jpg',
      status: 'offline'
    },
    action: 'requests permission to change',
    project: 'Project - Nganter App',
    time: '1 hr ago'
  }
];

// Component for notification bell icon
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

// Component for notification button
function NotificationButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="relative dropdown-toggle flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full hover:text-gray-700 h-11 w-11 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
      onClick={onClick}
    >
      <span
        className={`absolute right-0 top-0.5 z-10 h-2 w-2 rounded-full bg-orange-400 flex`}
      >
        <span className="absolute inline-flex w-full h-full bg-orange-400 rounded-full opacity-75 animate-ping" />
      </span>
      <NotificationBellIcon />
    </button>
  );
}

// Component for close button
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

// Component for notification header
function NotificationHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
      <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
        Notification
      </h5>
      <CloseButton onClick={onClose} />
    </div>
  );
}

// Component for user avatar
function UserAvatar({ user }: { user: NotificationItem['user'] }) {
  const statusColor = user.status === 'online' ? 'bg-success-500' : 'bg-error-500';
  
  return (
    <span className="relative block w-full h-10 rounded-full z-1 max-w-10">
      <Image
        width={40}
        height={40}
        src={user.avatar}
        alt={user.name}
        className="w-full overflow-hidden rounded-full"
      />
      <span className={`absolute bottom-0 right-0 z-10 h-2.5 w-full max-w-2.5 rounded-full border-[1.5px] border-white ${statusColor} dark:border-gray-900`} />
    </span>
  );
}

// Component for notification item
function NotificationItem({ item, onClose }: { item: NotificationItem; onClose: () => void }) {
  return (
    <li>
      <DropdownItem
        onItemClick={onClose}
        className="flex gap-3 rounded-lg border-b border-gray-100 p-3 px-4.5 py-3 hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-white/5"
        href={item.href}
      >
        <UserAvatar user={item.user} />
        <span className="block">
          <span className="mb-1.5 space-x-1 block text-theme-sm text-gray-500 dark:text-gray-400">
            <span className="font-medium text-gray-800 dark:text-white/90">
              {item.user.name}
            </span>
            <span>{item.action}</span>
            <span className="font-medium text-gray-800 dark:text-white/90">
              {item.project}
            </span>
          </span>
          <span className="flex items-center gap-2 text-gray-500 text-theme-xs dark:text-gray-400">
            <span>Project</span>
            <span className="w-1 h-1 bg-gray-400 rounded-full" />
            <span>{item.time}</span>
          </span>
        </span>
      </DropdownItem>
    </li>
  );
}

// Component for notification list
function NotificationList({ notifications, onClose }: { notifications: NotificationItem[]; onClose: () => void }) {
  return (
    <ul className="flex flex-col h-auto overflow-y-auto custom-scrollbar">
      {notifications.map((item) => (
        <NotificationItem key={item.id} item={item} onClose={onClose} />
      ))}
    </ul>
  );
}

// Component for view all button
function ViewAllButton() {
  return (
    <Link
      href="/"
      className="block px-4 py-2 mt-3 text-sm font-medium text-center text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
    >
      View All Notifications
    </Link>
  );
}

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleDropdown = useCallback(() => {
    setIsOpen(!isOpen);
  }, [isOpen]);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleClick = useCallback(() => {
    toggleDropdown();
  }, [toggleDropdown]);

  return (
    <div className="relative">
      <NotificationButton onClick={handleClick} />
      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute -right-[240px] mt-[17px] flex h-[480px] w-[350px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[361px] lg:right-0"
      >
        <NotificationHeader onClose={toggleDropdown} />
        <NotificationList notifications={notificationData} onClose={closeDropdown} />
        <ViewAllButton />
      </Dropdown>
    </div>
  );
}
