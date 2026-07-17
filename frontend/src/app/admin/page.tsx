"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { api, type Task, type User, type DashboardStats, type Category } from "@/lib/api";
import Navbar from "@/components/Navbar";
import StatusBadge from "@/components/StatusBadge";
import Link from "next/link";

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 10;
  const [tab, setTab] = useState<"tasks" | "users" | "categories">("tasks");
  const [reassigningId, setReassigningId] = useState<string | null>(null);
  const [reassignUserId, setReassignUserId] = useState("");

  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({ username: "", email: "", password: "", role: "USER" });
  const [newCategory, setNewCategory] = useState("");

  useEffect(() => {
    if (!loading && (!user || user.role !== "ADMIN")) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.role === "ADMIN") loadData();
  }, [user]);

  const loadData = async () => {
    setLoadingData(true);
    try {
      const [t, u, s, c] = await Promise.all([
        api.tasks.getAll(), api.admin.getUsers(), api.tasks.getStats(), api.categories.getAll()
      ]);
      setTasks(t);
      setUsers(u);
      setStats(s);
      setCategories(c);
    } catch (err) { console.error(err); }
    finally { setLoadingData(false); }
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm("Delete this task?")) return;
    try { await api.tasks.delete(id); loadData(); } catch (err) { console.error(err); }
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
    if (!confirm("Lock this task?")) return;
    try { await api.tasks.lock(id); loadData(); } catch (err) { console.error(err); }
  };

  const handleReassign = async (id: string) => {
    if (!reassignUserId) return;
    try { await api.tasks.reassign(id, reassignUserId); setReassigningId(null); setReassignUserId(""); loadData(); } catch (err) { console.error(err); }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        const updateData: Record<string, string> = {};
        if (userForm.username) updateData.username = userForm.username;
        if (userForm.email) updateData.email = userForm.email;
        if (userForm.password) updateData.password = userForm.password;
        updateData.role = userForm.role;
        await api.admin.updateUser(editingUser.id, updateData);
      } else {
        await api.admin.createUser(userForm);
      }
      setShowUserForm(false);
      setEditingUser(null);
      setUserForm({ username: "", email: "", password: "", role: "USER" });
      loadData();
    } catch (err) { alert(err instanceof Error ? err.message : "Failed"); }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Delete this user?")) return;
    try { await api.admin.deleteUser(id); loadData(); } catch (err) { console.error(err); }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    try { await api.categories.create(newCategory); setNewCategory(""); loadData(); } catch (err) { alert(err instanceof Error ? err.message : "Failed"); }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    try { await api.categories.delete(id); loadData(); } catch (err) { console.error(err); }
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
          <div className="flex gap-2">
            {tab === "users" ? (
              <button onClick={() => { setEditingUser(null); setUserForm({ username: "", email: "", password: "", role: "USER" }); setShowUserForm(true); }} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm">+ New User</button>
            ) : tab === "categories" ? null : (
              <Link href="/admin/tasks/new" className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm">+ New Task</Link>
            )}
          </div>
        </div>

        <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          {[
            { key: "tasks" as const, label: "Tasks", count: tasks.length },
            { key: "users" as const, label: "Users", count: users.length },
            { key: "categories" as const, label: "Categories", count: categories.length },
          ].map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t.key ? "border-indigo-600 text-indigo-600 dark:text-indigo-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}>
              {t.label} ({t.count})
            </button>
          ))}
        </div>

        {showUserForm && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4 dark:text-white">{editingUser ? "Edit User" : "Create User"}</h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
                  <input type="text" value={userForm.username} onChange={(e) => setUserForm({ ...userForm, username: e.target.value })} required className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                  <input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} required className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{editingUser ? "New Password (leave blank to keep)" : "Password"}</label>
                  <input type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} required={!editingUser} className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                  <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })} className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="USER">User</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm">{editingUser ? "Update User" : "Create User"}</button>
                <button type="button" onClick={() => { setShowUserForm(false); setEditingUser(null); }} className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 text-sm">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {loadingData ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading...</div>
        ) : tab === "tasks" ? (
          <>
            <div className="flex gap-4 mb-4">
              <input type="text" placeholder="Search tasks..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="flex-1 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }} className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 dark:text-white">
                <option value="">All Status</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="PENDING">Pending</option>
                <option value="COMPLETED">Completed</option>
                <option value="LOCKED">Locked</option>
              </select>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    {["Task Name", "Category", "Site", "Assigned User", "Deadline", "Status", "Ext Count", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">{h}</th>
                    ))}
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
                            <>
                              <button onClick={() => handleApproveExtend(task.id)} className="text-xs text-green-600 hover:underline px-1">Accept Ext</button>
                              <button onClick={() => handleRejectExtend(task.id)} className="text-xs text-red-600 hover:underline px-1">Reject Ext</button>
                            </>
                          )}
                          {!task.locked && <button onClick={() => handleLock(task.id)} className="text-xs text-gray-600 hover:underline px-1">Lock</button>}
                          <button onClick={() => { setReassigningId(task.id); setReassignUserId(""); }} className="text-xs text-orange-600 hover:underline px-1">Reassign</button>
                          <button onClick={() => handleDeleteTask(task.id)} className="text-xs text-red-600 hover:underline px-1">Delete</button>
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
                  {paginated.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">No tasks found</td></tr>}
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
        ) : tab === "users" ? (
          <div className="space-y-4">
            {users.map((u) => (
              <div key={u.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium dark:text-white">{u.username}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{u.email}</p>
                  <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${u.role === "ADMIN" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300" : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"}`}>{u.role}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingUser(u); setUserForm({ username: u.username, email: u.email, password: "", role: u.role }); setShowUserForm(true); }} className="text-sm text-indigo-600 hover:text-indigo-800">Edit</button>
                  <button onClick={() => handleDeleteUser(u.id)} className="text-sm text-red-600 hover:text-red-800">Delete</button>
                </div>
              </div>
            ))}
            {users.length === 0 && <p className="text-gray-500 dark:text-gray-400 text-center py-8">No users yet.</p>}
          </div>
        ) : (
          <div>
            <div className="flex gap-2 mb-6">
              <input type="text" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="New category name..." className="flex-1 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" onKeyDown={(e) => e.key === "Enter" && handleAddCategory()} />
              <button onClick={handleAddCategory} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm">Add Category</button>
            </div>
            <div className="space-y-2">
              {categories.map((cat) => (
                <div key={cat.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium dark:text-white">{cat.name}</p>
                    <p className="text-xs text-gray-400">Created: {new Date(cat.createdAt).toLocaleDateString()}</p>
                  </div>
                  <button onClick={() => handleDeleteCategory(cat.id)} className="text-sm text-red-600 hover:text-red-800">Delete</button>
                </div>
              ))}
              {categories.length === 0 && <p className="text-gray-500 dark:text-gray-400 text-center py-8">No categories yet. Add one above.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
