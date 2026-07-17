"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { api, type Task, type User, type DashboardStats } from "@/lib/api";
import Navbar from "@/components/Navbar";
import StatusBadge from "@/components/StatusBadge";
import Link from "next/link";

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 10;
  const [rejectingTaskId, setRejectingTaskId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [reassigningId, setReassigningId] = useState<string | null>(null);
  const [reassignUserId, setReassignUserId] = useState("");
  const [showExtendModal, setShowExtendModal] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== "ADMIN")) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.role === "ADMIN") loadData();
  }, [user]);

  const loadData = async () => {
    setLoadingData(true);
    try {
      const [t, u, s] = await Promise.all([api.tasks.getAll(), api.admin.getUsers(), api.tasks.getStats()]);
      setTasks(t);
      setUsers(u);
      setStats(s);
    } catch (err) { console.error(err); }
    finally { setLoadingData(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this task?")) return;
    try { await api.tasks.delete(id); setTasks(tasks.filter((t) => t.id !== id)); loadData(); } catch (err) { console.error(err); }
  };

  const handleApproveComplete = async (id: string) => {
    try { await api.tasks.approveComplete(id); loadData(); } catch (err) { console.error(err); }
  };

  const handleApproveExtend = async (id: string) => {
    try { await api.tasks.approveExtend(id); loadData(); } catch (err) { console.error(err); }
  };

  const handleRejectExtend = async (id: string) => {
    try { await api.tasks.rejectExtend(id); loadData(); } catch (err) { console.error(err); }
  };

  const handleLock = async (id: string) => {
    if (!confirm("Lock this task? No further changes will be allowed.")) return;
    try { await api.tasks.lock(id); loadData(); } catch (err) { console.error(err); }
  };

  const handleReassign = async (id: string) => {
    if (!reassignUserId) return;
    try { await api.tasks.reassign(id, reassignUserId); setReassigningId(null); setReassignUserId(""); loadData(); } catch (err) { console.error(err); }
  };

  const filtered = tasks.filter((t) => {
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || (t.assignedTo?.username || "").toLowerCase().includes(search.toLowerCase()) || (t.siteProject || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || t.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  if (loading || !user) return null;

  return (
    <div className="min-h-screen dark:bg-gray-900">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold dark:text-white">Admin Dashboard</h1>
          <Link href="/admin/tasks/new" className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm">+ New Task</Link>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            {[
              { label: "Total Tasks", value: stats.totalTasks, color: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800" },
              { label: "Completed", value: stats.completedTasks, color: "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800" },
              { label: "Pending", value: stats.pendingTasks, color: "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800" },
              { label: "In Progress", value: stats.inProgressTasks, color: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800" },
              { label: "Extension Requests", value: stats.extensionRequests, color: "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800" },
              { label: "Overdue", value: stats.overdueTasks, color: "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800" },
            ].map((s) => (
              <div key={s.label} className={`rounded-lg border p-4 ${s.color}`}>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-sm">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-4 mb-4">
          <input type="text" placeholder="Search tasks..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="flex-1 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }} className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">All Status</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="PENDING">Pending</option>
            <option value="COMPLETED">Completed</option>
            <option value="LOCKED">Locked</option>
          </select>
        </div>

        {loadingData ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading...</div>
        ) : (
          <>
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Task Name</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Category</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Site</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Assigned User</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Deadline</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Ext Count</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((task) => (
                    <tr key={task.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 font-medium dark:text-white">{task.name}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{task.category}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{task.siteProject}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{task.assignedTo?.username || "-"}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{new Date(task.deadline).toLocaleDateString()}</td>
                      <td className="px-4 py-3"><StatusBadge status={task.status} /></td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-center">{task.extensionCount || 0}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          <Link href={`/admin/tasks/${task.id}/edit`} className="text-xs text-indigo-600 hover:underline px-1">Edit</Link>
                          {task.status === "COMPLETED" && !task.locked && (
                            <button onClick={() => handleApproveComplete(task.id)} className="text-xs text-green-600 hover:underline px-1">Verify</button>
                          )}
                          {task.extendStatus === "PENDING" && (
                            <div className="flex gap-1">
                              <button onClick={() => handleApproveExtend(task.id)} className="text-xs text-green-600 hover:underline px-1">Accept Ext</button>
                              <button onClick={() => handleRejectExtend(task.id)} className="text-xs text-red-600 hover:underline px-1">Reject Ext</button>
                            </div>
                          )}
                          {!task.locked && (
                            <button onClick={() => handleLock(task.id)} className="text-xs text-gray-600 hover:underline px-1">Lock</button>
                          )}
                          <button onClick={() => { setReassigningId(task.id); setReassignUserId(""); }} className="text-xs text-orange-600 hover:underline px-1">Reassign</button>
                          <button onClick={() => handleDelete(task.id)} className="text-xs text-red-600 hover:underline px-1">Delete</button>
                        </div>
                        {reassigningId === task.id && (
                          <div className="mt-2 flex gap-2">
                            <select value={reassignUserId} onChange={(e) => setReassignUserId(e.target.value)} className="text-xs border rounded px-2 py-1 dark:bg-gray-700 dark:text-white dark:border-gray-600">
                              <option value="">Select user</option>
                              {users.filter((u) => u.role === "USER").map((u) => (
                                <option key={u.id} value={u.id}>{u.username}</option>
                              ))}
                            </select>
                            <button onClick={() => handleReassign(task.id)} className="text-xs bg-indigo-600 text-white px-2 py-1 rounded">Go</button>
                            <button onClick={() => setReassigningId(null)} className="text-xs text-gray-500">Cancel</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {paginated.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">No tasks found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                <button disabled={page === 1} onClick={() => setPage(page - 1)} className="px-3 py-1 rounded border dark:border-gray-600 dark:text-gray-300 disabled:opacity-50">Prev</button>
                <span className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400">Page {page} of {totalPages}</span>
                <button disabled={page === totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1 rounded border dark:border-gray-600 dark:text-gray-300 disabled:opacity-50">Next</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
