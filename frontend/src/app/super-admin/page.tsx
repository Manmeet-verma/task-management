"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { api, type Task, type User, type Category, type Site } from "@/lib/api";
import Navbar from "@/components/Navbar";
import StatusBadge from "@/components/StatusBadge";
import Link from "next/link";

interface SystemStats {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  extensionRequests: number;
  overdueTasks: number;
  lockedTasks: number;
  totalUsers: number;
  totalAdmins: number;
  totalRegularUsers: number;
  tasksByAdmin: { adminId: string; username: string; taskCount: number; completedCount: number }[];
}

export default function SuperAdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 10;
  const [tab, setTab] = useState<"stats" | "all" | "users" | "admins" | "categories" | "sites">("stats");
  const [reassigningId, setReassigningId] = useState<string | null>(null);
  const [reassignUserId, setReassignUserId] = useState("");
  const [reassignReason, setReassignReason] = useState("");
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [rejectExtendId, setRejectExtendId] = useState<string | null>(null);
  const [rejectExtendReason, setRejectExtendReason] = useState("");

  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({ username: "", email: "", password: "", role: "USER", isMaster: false });
  const [newCategory, setNewCategory] = useState("");
  const [newSite, setNewSite] = useState("");

  useEffect(() => {
    if (!loading && (!user || user.role !== "ADMIN" || !user.isMaster)) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.role === "ADMIN" && user.isMaster) loadData();
  }, [user]);

  const loadData = async () => {
    setLoadingData(true);
    try {
      const [t, u, s, c, st] = await Promise.all([
        api.tasks.getAll(), api.admin.getUsers(), fetch("/api/super-admin/stats", { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }).then(r => r.json()), api.categories.getAll(), api.sites.getAll()
      ]);
      setTasks(t);
      setUsers(u);
      setStats(s);
      setCategories(c);
      setSites(st);
    } catch (err) { console.error(err); }
    finally { setLoadingData(false); }
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm("Delete this task?")) return;
    try { await api.tasks.delete(id); loadData(); } catch (err: any) { alert(err.message || "Failed"); }
  };

  const handleApproveComplete = async (id: string) => {
    try { await api.tasks.approveComplete(id); loadData(); } catch (err) { console.error(err); }
  };

  const handleApproveExtend = async (id: string) => {
    try { await api.tasks.approveExtend(id); loadData(); } catch (err) { console.error(err); }
  };

  const handleRejectExtend = async (id: string) => {
    try {
      await api.tasks.rejectExtend(id, rejectExtendReason || undefined);
      setRejectExtendId(null);
      setRejectExtendReason("");
      loadData();
    } catch (err) { console.error(err); }
  };

  const handleLock = async (id: string) => {
    if (!confirm("Lock this task?")) return;
    try { await api.tasks.lock(id); loadData(); } catch (err: any) { alert(err.message || "Failed"); }
  };

  const handleReassign = async (id: string) => {
    if (!reassignUserId || !reassignReason.trim()) return;
    try {
      await api.tasks.reassign(id, reassignUserId, reassignReason.trim());
      setReassigningId(null);
      setReassignUserId("");
      setReassignReason("");
      loadData();
    } catch (err: any) { alert(err.message || "Failed"); }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        const updateData: Record<string, any> = {};
        if (userForm.username) updateData.username = userForm.username;
        if (userForm.email) updateData.email = userForm.email;
        if (userForm.password) updateData.password = userForm.password;
        updateData.role = userForm.role;
        updateData.isMaster = userForm.isMaster;
        await api.admin.updateUser(editingUser.id, updateData);
      } else {
        await api.admin.createUser({ ...userForm, isMaster: userForm.isMaster });
      }
      setShowUserForm(false);
      setEditingUser(null);
      setUserForm({ username: "", email: "", password: "", role: "USER", isMaster: false });
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

  const handleAddSite = async () => {
    if (!newSite.trim()) return;
    try { await api.sites.create({ name: newSite }); setNewSite(""); loadData(); } catch (err: unknown) { alert(err instanceof Error ? err.message : "Failed"); }
  };

  const handleDeleteSite = async (id: string) => {
    if (!confirm("Delete this site?")) return;
    try { await api.sites.delete(id); loadData(); } catch (err) { console.error(err); }
  };

  const filteredTasks = tasks.filter((t) => {
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || (t.assignedTo?.username || "").toLowerCase().includes(search.toLowerCase()) || (t.siteProject || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || t.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.ceil(filteredTasks.length / perPage);
  const paginated = filteredTasks.slice((page - 1) * perPage, page * perPage);

  const allAdmins = users.filter((u) => u.role === "ADMIN");
  const allRegularUsers = users.filter((u) => u.role === "USER");

  if (loading || !user) return null;

  return (
    <div className="min-h-screen dark:bg-gray-900">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold dark:text-white flex items-center gap-2">
            <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-3 py-1 rounded-full text-sm">Super Admin</span>
            System Dashboard
          </h1>
          <div className="flex gap-2">
            {(tab === "all" || tab === "stats") && (
              <Link href="/admin/tasks/new" className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm">+ New Task</Link>
            )}
            {tab === "users" && (
              <button onClick={() => { setEditingUser(null); setUserForm({ username: "", email: "", password: "", role: "USER", isMaster: false }); setShowUserForm(true); }} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm">+ New User</button>
            )}
          </div>
        </div>

        <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          {[
            { key: "stats" as const, label: "Overview" },
            { key: "all" as const, label: "All Tasks", count: tasks.length },
            { key: "users" as const, label: "Users", count: users.length },
            { key: "admins" as const, label: "Admins", count: allAdmins.length },
            { key: "categories" as const, label: "Categories", count: categories.length },
            { key: "sites" as const, label: "Sites", count: sites.length },
          ].map((t) => (
            <button key={t.key} onClick={() => { setTab(t.key); setPage(1); setSearch(""); setFilterStatus(""); }} className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t.key ? "border-amber-500 text-amber-600 dark:text-amber-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}>
              {t.label} {t.count !== undefined ? `(${t.count})` : ""}
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
                  <select value={userForm.isMaster ? "SUPER_ADMIN" : userForm.role} onChange={(e) => {
                    if (e.target.value === "SUPER_ADMIN") {
                      setUserForm({ ...userForm, role: "ADMIN", isMaster: true });
                    } else {
                      setUserForm({ ...userForm, role: e.target.value, isMaster: false });
                    }
                  }} className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="USER">User</option>
                    <option value="ADMIN">Admin</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
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
        ) : tab === "stats" ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Tasks</p>
                <p className="text-2xl font-bold dark:text-white">{stats?.totalTasks || 0}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats?.completedTasks || 0}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats?.pendingTasks || 0}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{stats?.overdueTasks || 0}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Users</p>
                <p className="text-2xl font-bold dark:text-white">{stats?.totalUsers || 0}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Admins</p>
                <p className="text-2xl font-bold text-indigo-600">{stats?.totalAdmins || 0}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Extension Requests</p>
                <p className="text-2xl font-bold text-orange-600">{stats?.extensionRequests || 0}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Locked</p>
                <p className="text-2xl font-bold text-gray-600">{stats?.lockedTasks || 0}</p>
              </div>
            </div>
            {stats?.tasksByAdmin && stats.tasksByAdmin.length > 0 && (
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 dark:text-white">Tasks by Admin</h3>
                <div className="space-y-3">
                  {stats.tasksByAdmin.map((admin) => (
                    <div key={admin.adminId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-md">
                      <div>
                        <p className="font-medium dark:text-white">{admin.username}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{admin.taskCount} tasks created</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-green-600">{admin.completedCount} completed</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{admin.taskCount > 0 ? Math.round((admin.completedCount / admin.taskCount) * 100) : 0}% completion</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : tab === "admins" ? (
          <div className="space-y-4">
            {allAdmins.map((admin) => {
              const adminTasks = tasks.filter((t) => t.createdById === admin.id);
              const completedTasks = adminTasks.filter((t) => t.status === "COMPLETED" || t.status === "LOCKED").length;
              return (
                <div key={admin.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium dark:text-white">
                      {admin.username}
                      {admin.isMaster && <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full ml-2">Super Admin</span>}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{admin.email}</p>
                    <div className="flex gap-4 mt-1 text-xs text-gray-400">
                      <span>{adminTasks.length} tasks created</span>
                      <span className="text-green-600">{completedTasks} completed</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingUser(admin); setUserForm({ username: admin.username, email: admin.email, password: "", role: admin.role, isMaster: admin.isMaster || false }); setShowUserForm(true); }} className="text-sm text-indigo-600 hover:text-indigo-800">Edit</button>
                  </div>
                </div>
              );
            })}
            {allAdmins.length === 0 && <p className="text-gray-500 dark:text-gray-400 text-center py-8">No admins found.</p>}
          </div>
        ) : tab === "users" ? (
          <div className="space-y-4">
            {users.map((u) => (
              <div key={u.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium dark:text-white">
                    {u.username}
                    {u.isMaster && <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full ml-1">Super Admin</span>}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{u.email}</p>
                  <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${u.role === "ADMIN" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300" : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"}`}>{u.role}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingUser(u); setUserForm({ username: u.username, email: u.email, password: "", role: u.role, isMaster: u.isMaster || false }); setShowUserForm(true); }} className="text-sm text-indigo-600 hover:text-indigo-800">Edit</button>
                  <button onClick={() => handleDeleteUser(u.id)} className="text-sm text-red-600 hover:text-red-800">Delete</button>
                </div>
              </div>
            ))}
            {users.length === 0 && <p className="text-gray-500 dark:text-gray-400 text-center py-8">No users yet.</p>}
          </div>
        ) : tab === "sites" ? (
          <div>
            <div className="flex gap-2 mb-6">
              <input type="text" value={newSite} onChange={(e) => setNewSite(e.target.value)} placeholder="New site name..." className="flex-1 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" onKeyDown={(e) => e.key === "Enter" && handleAddSite()} />
              <button onClick={handleAddSite} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm">Add Site</button>
            </div>
            <div className="space-y-2">
              {sites.map((site) => (
                <div key={site.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium dark:text-white">{site.name}</p>
                    <p className="text-xs text-gray-400">Created: {new Date(site.createdAt).toLocaleDateString()}</p>
                  </div>
                  <button onClick={() => handleDeleteSite(site.id)} className="text-sm text-red-600 hover:text-red-800">Delete</button>
                </div>
              ))}
              {sites.length === 0 && <p className="text-gray-500 dark:text-gray-400 text-center py-8">No sites yet.</p>}
            </div>
          </div>
        ) : tab === "categories" ? (
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
              {categories.length === 0 && <p className="text-gray-500 dark:text-gray-400 text-center py-8">No categories yet.</p>}
            </div>
          </div>
        ) : (
          <>
            <div className="flex gap-4 mb-4">
              <input type="text" placeholder="Search all tasks..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="flex-1 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
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
                    {["Task Name", "Category", "Site", "Assigned To", "Created By", "Deadline", "Status", "Actions"].map((h) => (
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
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{task.createdBy?.username || "-"}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{new Date(task.deadline).toLocaleDateString()}</td>
                      <td className="px-4 py-3"><StatusBadge status={task.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {!task.locked && task.status !== "LOCKED" && task.status !== "COMPLETED" && (
                            <Link href={`/admin/tasks/${task.id}/edit`} className="text-xs text-indigo-600 hover:underline px-1">Edit</Link>
                          )}
                          {task.status === "COMPLETED" && !task.locked && (
                            <button onClick={() => handleApproveComplete(task.id)} className="text-xs text-green-600 hover:underline px-1">Accept & Lock</button>
                          )}
                          {task.extendStatus === "PENDING" && (
                            <>
                              <button onClick={() => handleApproveExtend(task.id)} className="text-xs text-green-600 hover:underline px-1">Accept Ext</button>
                              <button onClick={() => { setRejectExtendId(task.id); setRejectExtendReason(""); }} className="text-xs text-red-600 hover:underline px-1">Reject Ext</button>
                            </>
                          )}
                          {!task.locked && task.status !== "LOCKED" && task.status !== "COMPLETED" && (
                            <button onClick={() => { setReassigningId(task.id); setReassignUserId(""); setReassignReason(""); }} className="text-xs text-orange-600 hover:underline px-1">Reassign</button>
                          )}
                          {!task.locked && task.status !== "LOCKED" && task.status !== "COMPLETED" && (
                            <button onClick={() => handleLock(task.id)} className="text-xs text-gray-600 hover:underline px-1">Lock</button>
                          )}
                          <button onClick={() => handleDeleteTask(task.id)} className="text-xs text-red-600 hover:underline px-1">Delete</button>
                          {(task.extendReason || task.lastExtReason || task.completedRemarks || task.reassignReason || task.extRejectReason) && (
                            <button onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)} className="text-xs text-blue-600 hover:underline px-1">
                              {expandedTaskId === task.id ? "Hide" : "Details"}
                            </button>
                          )}
                        </div>
                        {reassigningId === task.id && (
                          <div className="mt-2 space-y-2">
                            <select value={reassignUserId} onChange={(e) => setReassignUserId(e.target.value)} className="text-xs border rounded px-2 py-1 dark:bg-gray-700 dark:text-white dark:border-gray-600 w-full">
                              <option value="">Select new user</option>
                              {users.map((u) => (
                                <option key={u.id} value={u.id}>{u.username} ({u.role})</option>
                              ))}
                            </select>
                            <input type="text" value={reassignReason} onChange={(e) => setReassignReason(e.target.value)} placeholder="Reassign reason (required)" className="text-xs border rounded px-2 py-1 dark:bg-gray-700 dark:text-white dark:border-gray-600 w-full" />
                            <div className="flex gap-2">
                              <button onClick={() => handleReassign(task.id)} disabled={!reassignUserId || !reassignReason.trim()} className="text-xs bg-indigo-600 text-white px-2 py-1 rounded disabled:opacity-50">Reassign</button>
                              <button onClick={() => { setReassigningId(null); setReassignReason(""); }} className="text-xs text-gray-500">Cancel</button>
                            </div>
                          </div>
                        )}
                        {rejectExtendId === task.id && (
                          <div className="mt-2 space-y-2">
                            <input type="text" value={rejectExtendReason} onChange={(e) => setRejectExtendReason(e.target.value)} placeholder="Reject reason (optional)" className="text-xs border rounded px-2 py-1 dark:bg-gray-700 dark:text-white dark:border-gray-600 w-full" />
                            <div className="flex gap-2">
                              <button onClick={() => handleRejectExtend(task.id)} className="text-xs bg-red-600 text-white px-2 py-1 rounded">Confirm Reject</button>
                              <button onClick={() => { setRejectExtendId(null); setRejectExtendReason(""); }} className="text-xs text-gray-500">Cancel</button>
                            </div>
                          </div>
                        )}
                        {expandedTaskId === task.id && (
                          <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-900 rounded text-xs space-y-1">
                            {task.reassignReason && <p className="text-orange-600 dark:text-orange-400"><span className="font-medium">Reassign Reason:</span> {task.reassignReason}</p>}
                            {task.reassignedBy && <p className="text-orange-600 dark:text-orange-400"><span className="font-medium">Reassigned By:</span> {task.reassignedBy}</p>}
                            {task.extendReason && <p className="text-orange-600 dark:text-orange-400"><span className="font-medium">Extension Reason:</span> {task.extendReason}</p>}
                            {task.lastExtReason && <p className="text-gray-600 dark:text-gray-400"><span className="font-medium">Last Ext Reason:</span> {task.lastExtReason}</p>}
                            {task.extRejectReason && <p className="text-red-600 dark:text-red-400"><span className="font-medium">Ext Reject Reason:</span> {task.extRejectReason}</p>}
                            {task.extRejectedBy && <p className="text-red-600 dark:text-red-400"><span className="font-medium">Rejected By:</span> {task.extRejectedBy}</p>}
                            {task.completedRemarks && <p className="text-green-600 dark:text-green-400"><span className="font-medium">Completed Remarks:</span> {task.completedRemarks}</p>}
                            {task.pendingReason && <p className="text-yellow-600 dark:text-yellow-400"><span className="font-medium">Pending Reason:</span> {task.pendingReason}</p>}
                            {task.rejectReason && <p className="text-red-600 dark:text-red-400"><span className="font-medium">Reject Reason:</span> {task.rejectReason}</p>}
                            {task.attachmentUrl && <p className="text-blue-600 dark:text-blue-400"><span className="font-medium">Attachment:</span> <a href={task.attachmentUrl} target="_blank" rel="noopener noreferrer" className="underline">View</a></p>}
                            {task.completedAttachmentUrl && <p className="text-green-600 dark:text-green-400"><span className="font-medium">Completion Attachment:</span> <a href={task.completedAttachmentUrl} target="_blank" rel="noopener noreferrer" className="underline">View</a></p>}
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
        )}
      </div>
    </div>
  );
}
