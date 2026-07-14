"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/dashboard" className="text-xl font-bold text-indigo-600">
          TaskManager
        </Link>
        {user && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {user.username} ({user.role})
            </span>
            {user.role === "ADMIN" && (
              <Link
                href="/admin"
                className="text-sm text-gray-600 hover:text-indigo-600"
              >
                Admin Dashboard
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-md"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
