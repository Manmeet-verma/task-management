"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { api, type Task } from "@/lib/api";
import Navbar from "@/components/Navbar";
import StatusBadge from "@/components/StatusBadge";
import Link from "next/link";

export default function UserPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && (!user || user.role !== "USER")) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.role === "USER") loadData();
  }, [user]);

  const loadData = async () => {
    setLoadingData(true);
    try {
      const t = await api.tasks.getMine();
      setMyTasks(t);
    } catch (err) { console.error(err); }
    finally { setLoadingData(false); }
  };

  const getStatusColor = (task: Task) => {
    if (task.status === "LOCKED") return "bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600";
    if (task.status === "COMPLETED") return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";
    if (task.status === "PENDING") return "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800";
    if (task.status === "REJECTED") return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
    if ((task.extensionCount || 0) > 1) return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
    return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800";
  };

  if (loading || !user) return null;

  return (
    <div className="min-h-screen dark:bg-gray-900">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6 dark:text-white">My Tasks ({myTasks.length})</h1>
        {loadingData ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading...</div>
        ) : myTasks.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">No tasks assigned to you.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {myTasks.map((task) => {
              const canAct = !task.locked && task.status !== "COMPLETED" && task.status !== "LOCKED" && task.status !== "REJECTED";
              const isWaiting = task.status === "ASSIGNED" || task.status === "PENDING" || task.status === "COMPLETED";
              return (
                <div key={task.id} className={`rounded-lg border p-5 ${getStatusColor(task)} ${task.extensionCount > 1 ? "border-red-400 dark:border-red-600" : ""}`}>
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold dark:text-white">{task.name}</h3>
                    <StatusBadge status={task.status} />
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1 mb-4">
                    <p>Category: {task.category}</p>
                    <p>Site: {task.siteProject}</p>
                    <p>Deadline: {new Date(task.deadline).toLocaleDateString()}</p>
                    {task.userDeadline && <p>Your Deadline: {new Date(task.userDeadline).toLocaleDateString()}</p>}
                    {task.extensionCount > 0 && <p className="text-red-600 dark:text-red-400">Extensions: {task.extensionCount}</p>}
                  </div>

                  {task.status === "REJECTED" && task.rejectReason && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-2 mb-3">
                      <p className="text-xs font-medium text-red-700 dark:text-red-300">Rejection Reason:</p>
                      <p className="text-xs text-red-600 dark:text-red-400">{task.rejectReason}</p>
                    </div>
                  )}

                  {task.status === "PENDING" && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-2 mb-3">
                      <p className="text-xs text-yellow-700 dark:text-yellow-300">Waiting for admin review...</p>
                    </div>
                  )}

                  {task.status === "COMPLETED" && !task.locked && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-2 mb-3">
                      <p className="text-xs text-green-700 dark:text-green-300">Completed. Waiting for admin to verify...</p>
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1 italic">&quot;{user.username} has completed the job but needs intention of {task.createdBy?.username || "Admin"}&quot;</p>
                    </div>
                  )}

                  {task.locked && (
                    <div className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded p-2 mb-3">
                      <p className="text-xs text-gray-600 dark:text-gray-400">This task is locked. No changes allowed.</p>
                    </div>
                  )}

                  {canAct && (
                    <Link href={`/user/tasks/${task.id}`} className="block w-full text-center bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium">
                      Open Task
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
