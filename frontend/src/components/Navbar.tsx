"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/components/ThemeProvider";
import { useEffect, useState } from "react";
import { api, type Notification } from "@/lib/api";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);

  useEffect(() => {
    if (user) {
      loadNotifs();
      const interval = setInterval(loadNotifs, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadNotifs = async () => {
    try {
      const n = await api.notifications.getMine();
      setNotifications(n);
    } catch {}
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = async () => {
    try {
      await api.notifications.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {}
  };

  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
          TaskManager
        </Link>
        <div className="flex items-center gap-4">
          <button onClick={toggle} className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white text-lg">
            {dark ? "☀" : "☾"}
          </button>
          {user && (
            <div className="relative">
              <button onClick={() => setShowNotifs(!showNotifs)} className="relative text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                🔔
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              {showNotifs && (
                <div className="absolute right-0 top-8 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-sm font-semibold dark:text-white">Notifications</span>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-xs text-indigo-600 hover:underline">Mark all read</button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <p className="p-4 text-sm text-gray-500 dark:text-gray-400">No notifications</p>
                  ) : (
                    notifications.slice(0, 20).map((n) => (
                      <div key={n.id} className={`px-4 py-3 border-b border-gray-100 dark:border-gray-700 text-sm ${!n.read ? "bg-indigo-50 dark:bg-indigo-900/20" : ""}`}>
                        <p className="text-gray-700 dark:text-gray-300">{n.message}</p>
                        <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
          {user?.role === "ADMIN" && (
            <Link href="/admin" className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Admin</Link>
          )}
          {user && (
            <span className="text-sm text-gray-500 dark:text-gray-400">{user.username}</span>
          )}
          {user && (
            <button onClick={logout} className="text-sm text-red-600 hover:text-red-800">Logout</button>
          )}
        </div>
      </div>
    </nav>
  );
}
