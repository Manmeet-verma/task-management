"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/components/ThemeProvider";
import { useEffect, useState, useRef } from "react";
import { api, type Notification } from "@/lib/api";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      loadNotifs();
      const interval = setInterval(loadNotifs, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
    }
    if (showNotifs) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showNotifs]);

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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }
    if (newPassword.length < 4) {
      setPasswordError("Password must be at least 4 characters");
      return;
    }
    setChangingPassword(true);
    try {
      await api.auth.changePassword(currentPassword, newPassword);
      setPasswordSuccess("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => { setShowChangePassword(false); setPasswordSuccess(""); }, 2000);
    } catch (err: any) {
      setPasswordError(err.message || "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 relative z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="text-lg sm:text-xl font-bold text-indigo-600 dark:text-indigo-400">
          TaskManager
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          <button onClick={toggle} className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white text-lg">
            {dark ? "☀" : "☾"}
          </button>
          {user && (
            <div className="relative" ref={notifRef}>
              <button onClick={() => setShowNotifs(!showNotifs)} className="relative text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                🔔
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              {showNotifs && (
                <div className="fixed sm:absolute right-2 sm:right-0 top-12 sm:top-8 w-[calc(100vw-16px)] sm:w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-80 sm:max-h-96 overflow-y-auto">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
                    <span className="text-sm font-semibold dark:text-white">Notifications</span>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button onClick={markAllRead} className="text-xs text-indigo-600 hover:underline">Mark all read</button>
                      )}
                      <button onClick={() => setShowNotifs(false)} className="text-gray-400 hover:text-gray-600 sm:hidden text-lg leading-none">&times;</button>
                    </div>
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
          <div className="hidden sm:flex items-center gap-4">
            {user?.role === "ADMIN" && user?.isMaster && (
              <Link href="/super-admin" className="text-sm text-amber-600 dark:text-amber-400 font-medium hover:text-amber-800 dark:hover:text-amber-300">Super Admin</Link>
            )}
            {user?.role === "ADMIN" && (
              <Link href="/admin" className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Admin</Link>
            )}
            {user && (
              <span className="text-sm text-gray-500 dark:text-gray-400">{user.username}</span>
            )}
            {user && (
              <>
                <button onClick={() => setShowChangePassword(true)} className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400">Change Password</button>
                <button onClick={logout} className="text-sm text-red-600 hover:text-red-800">Logout</button>
              </>
            )}
          </div>
          {/* Mobile menu button */}
          {user && (
            <div className="sm:hidden relative">
              <button onClick={() => setShowNotifs(false)} className="text-sm text-gray-600 dark:text-gray-300">
                ☰
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Mobile bottom bar for links */}
      {user && (
        <div className="sm:hidden border-t border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <span className="text-gray-500 dark:text-gray-400">{user.username}</span>
            {user.role === "ADMIN" && user.isMaster && (
              <Link href="/super-admin" className="text-amber-600 dark:text-amber-400 font-medium">Super Admin</Link>
            )}
            {user.role === "ADMIN" && (
              <Link href="/admin" className="text-gray-600 dark:text-gray-300">Admin</Link>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowChangePassword(true)} className="text-indigo-600 dark:text-indigo-400">Change Password</button>
            <button onClick={logout} className="text-red-600">Logout</button>
          </div>
        </div>
      )}

      {showChangePassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-4 dark:text-white">Change Password</h2>
            {passwordError && <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-md mb-4 text-sm">{passwordError}</div>}
            {passwordSuccess && <div className="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 p-3 rounded-md mb-4 text-sm">{passwordSuccess}</div>}
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Password</label>
                <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm New Password</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={changingPassword} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 text-sm">{changingPassword ? "Changing..." : "Change Password"}</button>
                <button type="button" onClick={() => { setShowChangePassword(false); setPasswordError(""); setPasswordSuccess(""); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }} className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 text-sm">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </nav>
  );
}
