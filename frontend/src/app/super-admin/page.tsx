"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { api, type Task, type User, type Category, type Site } from "@/lib/api";
import Navbar from "@/components/Navbar";
import StatusBadge from "@/components/StatusBadge";
import Pagination from "@/components/Pagination";
import Link from "next/link";
import { openAttachment } from "@/lib/attachment";
import VoiceRecorder from "@/components/VoiceRecorder";
import VoicePlayer from "@/components/VoicePlayer";
import { downloadExcel, tasksToExcelRows, usersToExcelRows } from "@/lib/excel";

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
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterSite, setFilterSite] = useState("");
  const [filterAssignedTo, setFilterAssignedTo] = useState("");
  const [filterAssignedBy, setFilterAssignedBy] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [tab, setTab] = useState<"stats" | "all" | "pending" | "completed" | "approved" | "reassigned" | "requests" | "users" | "admins" | "categories" | "sites">("stats");
  const [pendingFilter, setPendingFilter] = useState<"general" | "extend" | "overdue" | "reassign">("general");
  const [quickFilter, setQuickFilter] = useState<"all" | "pending" | "overdue" | "extension" | "reassign" | "completed">("all");
  const [reassigningId, setReassigningId] = useState<string | null>(null);
  const [reassignUserId, setReassignUserId] = useState("");
  const [reassignReason, setReassignReason] = useState("");
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [expandedTaskData, setExpandedTaskData] = useState<Task | null>(null);
  const [rejectExtendId, setRejectExtendId] = useState<string | null>(null);
  const [rejectExtendReason, setRejectExtendReason] = useState("");
  const [remarksTaskId, setRemarksTaskId] = useState<string | null>(null);
  const [remarksText, setRemarksText] = useState("");
  const [now, setNow] = useState(new Date());

  const toggleExpandTask = async (task: Task) => {
    if (expandedTaskId === task.id) {
      setExpandedTaskId(null);
      setExpandedTaskData(null);
    } else {
      setExpandedTaskId(task.id);
      setExpandedTaskData(null);
      try {
        const fullTask = await api.tasks.getById(task.id);
        setExpandedTaskData(fullTask);
      } catch (err) {
        console.error("Failed to load task details:", err);
        alert("Failed to load task details. Please try again.");
      }
    }
  };

  const openTaskAttachment = async (task: Task, type: "attachment" | "completed" | "extend", index?: number) => {
    try {
      const fullTask = await api.tasks.getById(task.id);
      if (type === "attachment") {
        const url = fullTask.attachmentUrl || (fullTask.attachments && fullTask.attachments[0]);
        if (url) openAttachment(url, `${task.name}_attachment`);
        else alert("Attachment data not found");
      } else if (type === "completed") {
        const all = fullTask.completedAttachments || (fullTask.completedAttachmentUrl ? [fullTask.completedAttachmentUrl] : []);
        const url = index !== undefined ? all[index] : all[0];
        if (url) openAttachment(url, `${task.name}_completed${index !== undefined ? `_${index + 1}` : ""}`);
        else alert("Completion attachment not found");
      } else if (type === "extend") {
        const all = fullTask.extendAttachments || [];
        const url = index !== undefined ? all[index] : all[0];
        if (url) openAttachment(url, `${task.name}_extend${index !== undefined ? `_${index + 1}` : ""}`);
        else alert("Extension attachment not found");
      }
    } catch (err) {
      console.error("Failed to load attachment:", err);
      alert("Failed to load attachment. Please try again.");
    }
  };

  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({ username: "", email: "", password: "", role: "USER", isMaster: false, panCard: "", aadharCard: "", gst: "" });
  const [newCategory, setNewCategory] = useState("");
  const [newSite, setNewSite] = useState("");
  const [topAction, setTopAction] = useState<"create" | "all" | "site">("all");
  const [selectedSite, setSelectedSite] = useState<string>("");

  useEffect(() => {
    if (!loading && (!user || user.role !== "ADMIN" || !user.isMaster)) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.role === "ADMIN" && user.isMaster) loadData();
  }, [user]);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

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

  const isOverdue = (task: Task) => {
    const deadline = new Date(task.deadline);
    const overdueThreshold = new Date(deadline.getTime() + 24 * 60 * 60 * 1000);
    return overdueThreshold < now && task.status !== "COMPLETED" && task.status !== "LOCKED" && task.status !== "VERIFIED";
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

  const handleAdminRemarks = async (id: string) => {
    if (!remarksText.trim()) return;
    try {
      await fetch(`/api/tasks/${id}/admin-remarks`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ remarks: remarksText.trim() }),
      });
      setRemarksTaskId(null);
      setRemarksText("");
      loadData();
    } catch (err) { console.error(err); }
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
        if (userForm.panCard) updateData.panCard = userForm.panCard;
        if (userForm.aadharCard) updateData.aadharCard = userForm.aadharCard;
        if (userForm.gst) updateData.gst = userForm.gst;
        await api.admin.updateUser(editingUser.id, updateData);
      } else {
        await api.admin.createUser({ ...userForm, isMaster: userForm.isMaster });
      }
      setShowUserForm(false);
      setEditingUser(null);
      setUserForm({ username: "", email: "", password: "", role: "USER", isMaster: false, panCard: "", aadharCard: "", gst: "" });
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

  const completedTasks = tasks.filter((t) => t.status === "COMPLETED" && !t.locked);
  const lockedTasks = tasks.filter((t) => t.status === "LOCKED" || t.locked);
  const reassignedTasks = tasks.filter((t) => t.reassignReason);
  const pendingTasks = tasks.filter((t) => t.status !== "LOCKED" && t.status !== "VERIFIED");
  const generalPendingCount = pendingTasks.filter((t) => t.status !== "COMPLETED" && !t.reassignReason && t.extendStatus !== "PENDING" && !isOverdue(t)).length;
  const overdueCount = pendingTasks.filter((t) => t.status !== "COMPLETED" && isOverdue(t) && !t.reassignReason && t.extendStatus !== "PENDING").length;
  const extensionCount = pendingTasks.filter((t) => t.status !== "COMPLETED" && t.extendStatus === "PENDING").length;
  const reassignCount = pendingTasks.filter((t) => t.status !== "COMPLETED" && t.reassignReason).length;
  const awaitingApprovalCount = tasks.filter((t) => t.status === "COMPLETED" && !t.locked).length;
  const userRequestsCount = tasks.filter((t) => {
    const creator = users.find(u => u.id === t.createdById);
    return creator && creator.role === "USER";
  }).length;

  const filteredTasks = tasks.filter((t) => {
    if (topAction === "site" && selectedSite) {
      if (t.siteProject !== selectedSite) return false;
    }
    if (tab === "requests") {
      const creator = users.find(u => u.id === t.createdById);
      if (!creator || creator.role !== "USER") return false;
    } else if (tab === "pending") {
      if (t.status === "LOCKED" || t.status === "VERIFIED") return false;
      if (pendingFilter === "general") {
        if (t.status === "COMPLETED") return false;
        if (t.reassignReason) return false;
        if (t.extendStatus === "PENDING") return false;
        if (isOverdue(t)) return false;
      } else if (pendingFilter === "overdue") {
        if (t.status === "COMPLETED") return false;
        if (!isOverdue(t)) return false;
      } else if (pendingFilter === "extend") {
        if (t.status === "COMPLETED") return false;
        if (t.extendStatus !== "PENDING") return false;
      } else if (pendingFilter === "reassign") {
        if (t.status === "COMPLETED") return false;
        if (!t.reassignReason) return false;
      }
    } else if (tab === "completed") {
      if (t.status !== "COMPLETED" || t.locked) return false;
    } else if (tab === "approved") {
      if (t.status !== "LOCKED") return false;
    } else if (tab === "all") {
      if (quickFilter === "pending") {
        if (t.status === "COMPLETED" || t.status === "LOCKED" || t.status === "VERIFIED") return false;
        if (t.reassignReason) return false;
        if (t.extendStatus === "PENDING") return false;
        if (isOverdue(t)) return false;
      } else if (quickFilter === "overdue") {
        if (t.status === "COMPLETED" || t.status === "LOCKED" || t.status === "VERIFIED") return false;
        if (!isOverdue(t)) return false;
      } else if (quickFilter === "extension") {
        if (t.extendStatus !== "PENDING") return false;
      } else if (quickFilter === "reassign") {
        if (!t.reassignReason) return false;
        if (t.status === "LOCKED") return false;
      } else if (quickFilter === "completed") {
        if (t.status !== "COMPLETED" && t.status !== "LOCKED") return false;
      }
    }
    if (tab === "reassigned") { if (!t.reassignReason) return false; }
    const matchStatus = !filterStatus || t.status === filterStatus;
    const matchCategory = !filterCategory || t.category === filterCategory;
    const matchSite = !filterSite || t.siteProject === filterSite;
    const matchAssignedTo = !filterAssignedTo || t.assignedToId === filterAssignedTo;
    const matchAssignedBy = !filterAssignedBy || t.createdById === filterAssignedBy;
    return matchStatus && matchCategory && matchSite && matchAssignedTo && matchAssignedBy;
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
            <Link href="/tasks/new" className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm">+ Create Task</Link>
            {tab === "users" && (
              <button onClick={() => { setEditingUser(null); setUserForm({ username: "", email: "", password: "", role: "USER", isMaster: false, panCard: "", aadharCard: "", gst: "" }); setShowUserForm(true); }} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm">+ New User</button>
            )}
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <button onClick={() => { setTopAction("all"); setSelectedSite(""); }} className={`px-4 py-2 rounded-md text-sm font-medium ${topAction === "all" ? "bg-indigo-600 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"}`}>
            All Task
          </button>
          <div className="relative">
            <button onClick={() => setTopAction("site")} className={`px-4 py-2 rounded-md text-sm font-medium ${topAction === "site" ? "bg-indigo-600 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"}`}>
              Task Vise {topAction === "site" && selectedSite ? `(${selectedSite})` : ""}
            </button>
            {topAction === "site" && (
              <div className="absolute z-10 mt-1 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                <button onClick={() => { setSelectedSite(""); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white rounded-t-lg">All Sites</button>
                {sites.filter(s => s.status === "ACTIVE").map((site, i) => (
                  <button key={site.id} onClick={() => { setSelectedSite(site.name); }} className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white ${i === sites.filter(s => s.status === "ACTIVE").length - 1 ? "rounded-b-lg" : ""}`}>
                    {site.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          {[
            { key: "stats" as const, label: "Overview" },
            { key: "all" as const, label: "All Tasks", count: tasks.length },
            { key: "pending" as const, label: "Pending", count: pendingTasks.length },
            { key: "completed" as const, label: "Completed", count: awaitingApprovalCount },
            { key: "approved" as const, label: "Approved Tasks", count: lockedTasks.length },
            { key: "reassigned" as const, label: "Reassigned", count: reassignedTasks.length },
            { key: "requests" as const, label: "Requests by Users", count: userRequestsCount },
            { key: "users" as const, label: "Users", count: users.length },
            { key: "admins" as const, label: "Admins", count: allAdmins.length },
            { key: "categories" as const, label: "Categories", count: categories.length },
            { key: "sites" as const, label: "Sites", count: sites.length },
          ].map((t) => (
            <button key={t.key} onClick={() => { setTab(t.key); setPage(1); setFilterStatus(""); setPendingFilter("general"); setQuickFilter("all"); }} className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t.key ? "border-amber-500 text-amber-600 dark:text-amber-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}>
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">PAN Card (Optional)</label>
                  <input type="text" value={userForm.panCard} onChange={(e) => setUserForm({ ...userForm, panCard: e.target.value })} className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Enter PAN card number" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Aadhar Card (Optional)</label>
                  <input type="text" value={userForm.aadharCard} onChange={(e) => setUserForm({ ...userForm, aadharCard: e.target.value })} className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Enter Aadhar card number" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">GST (Optional)</label>
                  <input type="text" value={userForm.gst} onChange={(e) => setUserForm({ ...userForm, gst: e.target.value })} className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Enter GST number" />
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
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <button onClick={() => { setTab("all"); setPage(1); }} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-left hover:shadow-md transition-shadow cursor-pointer">
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Tasks</p>
                <p className="text-2xl font-bold dark:text-white">{stats?.totalTasks || 0}</p>
              </button>
              <button onClick={() => { setTab("all"); setFilterStatus("COMPLETED"); setPage(1); }} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-left hover:shadow-md transition-shadow cursor-pointer">
                <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats?.completedTasks || 0}</p>
              </button>
              <button onClick={() => { setTab("pending"); setPendingFilter("general"); setPage(1); }} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-left hover:shadow-md transition-shadow cursor-pointer">
                <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats?.pendingTasks || 0}</p>
              </button>
              <button onClick={() => { setTab("pending"); setPendingFilter("overdue"); setPage(1); }} className="bg-white dark:bg-gray-800 border border-red-200 dark:border-red-700 rounded-lg p-4 text-left hover:shadow-md transition-shadow cursor-pointer">
                <p className="text-sm text-gray-500 dark:text-gray-400">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{stats?.overdueTasks || 0}</p>
              </button>
              <button onClick={() => { setTab("all"); setFilterStatus("LOCKED"); setPage(1); }} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-left hover:shadow-md transition-shadow cursor-pointer">
                <p className="text-sm text-gray-500 dark:text-gray-400">Locked</p>
                <p className="text-2xl font-bold text-gray-600">{stats?.lockedTasks || 0}</p>
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button onClick={() => { setTab("users"); setPage(1); }} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-left hover:shadow-md transition-shadow cursor-pointer">
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Users</p>
                <p className="text-2xl font-bold dark:text-white">{stats?.totalUsers || 0}</p>
              </button>
              <button onClick={() => { setTab("admins"); setPage(1); }} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-left hover:shadow-md transition-shadow cursor-pointer">
                <p className="text-sm text-gray-500 dark:text-gray-400">Admins</p>
                <p className="text-2xl font-bold text-indigo-600">{stats?.totalAdmins || 0}</p>
              </button>
              <button onClick={() => { setTab("pending"); setPendingFilter("extend"); setPage(1); }} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-left hover:shadow-md transition-shadow cursor-pointer">
                <p className="text-sm text-gray-500 dark:text-gray-400">Extension Requests</p>
                <p className="text-2xl font-bold text-orange-600">{stats?.extensionRequests || 0}</p>
              </button>
              <button onClick={() => { setTab("users"); setPage(1); }} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-left hover:shadow-md transition-shadow cursor-pointer">
                <p className="text-sm text-gray-500 dark:text-gray-400">Regular Users</p>
                <p className="text-2xl font-bold dark:text-white">{stats?.totalRegularUsers || 0}</p>
              </button>
            </div>
            {stats?.tasksByAdmin && stats.tasksByAdmin.length > 0 && (
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 dark:text-white">Tasks by Admin</h3>
                <div className="space-y-3">
                  {stats.tasksByAdmin.map((admin) => (
                    <button key={admin.adminId} onClick={() => { setTab("all"); setFilterAssignedBy(admin.adminId); setPage(1); }} className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer text-left">
                      <div>
                        <p className="font-medium dark:text-white">{admin.username}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{admin.taskCount} tasks created</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-green-600">{admin.completedCount} completed</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{admin.taskCount > 0 ? Math.round((admin.completedCount / admin.taskCount) * 100) : 0}% completion</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : tab === "admins" ? (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={() => downloadExcel(usersToExcelRows(allAdmins), "superadmin_admins")} className="bg-green-600 text-white px-3 py-1.5 rounded-md hover:bg-green-700 text-xs font-medium">Download Admins Excel</button>
            </div>
            {allAdmins.map((admin) => {
              const adminTasks = tasks.filter((t) => t.createdById === admin.id);
              const completedAdminTasks = adminTasks.filter((t) => t.status === "COMPLETED" || t.status === "LOCKED").length;
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
                      <span className="text-green-600">{completedAdminTasks} completed</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingUser(admin); setUserForm({ username: admin.username, email: admin.email, password: "", role: admin.role, isMaster: admin.isMaster || false, panCard: (admin as any).panCard || "", aadharCard: (admin as any).aadharCard || "", gst: (admin as any).gst || "" }); setShowUserForm(true); }} className="text-sm text-indigo-600 hover:text-indigo-800">Edit</button>
                  </div>
                </div>
              );
            })}
            {allAdmins.length === 0 && <p className="text-gray-500 dark:text-gray-400 text-center py-8">No admins found.</p>}
          </div>
        ) : tab === "users" ? (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={() => downloadExcel(usersToExcelRows(allRegularUsers), "superadmin_users")} className="bg-green-600 text-white px-3 py-1.5 rounded-md hover:bg-green-700 text-xs font-medium">Download Users Excel</button>
            </div>
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
                  <button onClick={() => { setEditingUser(u); setUserForm({ username: u.username, email: u.email, password: "", role: u.role, isMaster: u.isMaster || false, panCard: (u as any).panCard || "", aadharCard: (u as any).aadharCard || "", gst: (u as any).gst || "" }); setShowUserForm(true); }} className="text-sm text-indigo-600 hover:text-indigo-800">Edit</button>
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
              {categories.length === 0 && <p className="text-gray-500 dark:text-gray-400 text-center py-8">No categories yet. Add one above.</p>}
            </div>
          </div>
        ) : (
          <>
            {tab === "all" && (
              <div className="flex gap-2 mb-4 flex-wrap">
                {[
                  { key: "all" as const, label: "All", count: tasks.length },
                  { key: "pending" as const, label: "All Pending", count: generalPendingCount },
                  { key: "overdue" as const, label: "Overdue", count: overdueCount },
                  { key: "extension" as const, label: "Extension Requests", count: extensionCount },
                  { key: "reassign" as const, label: "Reassign (Incomplete)", count: reassignCount },
                  { key: "completed" as const, label: "Approved & Locked", count: lockedTasks.length },
                ].map((f) => (
                  <button key={f.key} onClick={() => { setQuickFilter(f.key); setPage(1); }} className={`px-3 py-1.5 rounded-full text-xs font-medium ${quickFilter === f.key ? "bg-amber-500 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"}`}>
                    {f.label} ({f.count})
                  </button>
                ))}
              </div>
            )}
            {tab === "pending" && (
              <div className="flex gap-2 mb-4 flex-wrap">
                {[
                  { key: "general" as const, label: "General Pending", count: generalPendingCount },
                  { key: "extend" as const, label: "Extend Date", count: extensionCount },
                  { key: "overdue" as const, label: "Overdue", count: overdueCount },
                  { key: "reassign" as const, label: "Reassign (Incomplete)", count: reassignCount },
                ].map((f) => (
                  <button key={f.key} onClick={() => { setPendingFilter(f.key); setPage(1); }} className={`px-3 py-1.5 rounded-full text-xs font-medium ${pendingFilter === f.key ? "bg-amber-500 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"}`}>
                    {f.label} ({f.count})
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-4 mb-4 flex-wrap">
              <select value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }} className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 dark:text-white text-sm">
                <option value="">All Categories</option>
                {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
              <select value={filterSite} onChange={(e) => { setFilterSite(e.target.value); setPage(1); }} className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 dark:text-white text-sm">
                <option value="">All Sites</option>
                {sites.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
              <select value={filterAssignedTo} onChange={(e) => { setFilterAssignedTo(e.target.value); setPage(1); }} className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 dark:text-white text-sm">
                <option value="">All Assigned To</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.username}</option>)}
              </select>
              <select value={filterAssignedBy} onChange={(e) => { setFilterAssignedBy(e.target.value); setPage(1); }} className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 dark:text-white text-sm">
                <option value="">All Assigned By</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.username}</option>)}
              </select>
            </div>

            <div className="flex justify-between items-center mb-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">{filteredTasks.length} task(s) found</p>
              <button onClick={() => downloadExcel(tasksToExcelRows(filteredTasks), "superadmin_tasks")} className="bg-green-600 text-white px-3 py-1.5 rounded-md hover:bg-green-700 text-xs font-medium">Download Excel</button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-800 text-left">
                    <th className="px-3 py-2 border dark:border-gray-700 font-medium">#</th>
                    <th className="px-3 py-2 border dark:border-gray-700 font-medium">Task Name</th>
                    <th className="px-3 py-2 border dark:border-gray-700 font-medium">Category</th>
                    <th className="px-3 py-2 border dark:border-gray-700 font-medium">Site</th>
                    <th className="px-3 py-2 border dark:border-gray-700 font-medium">Assigned To</th>
                    <th className="px-3 py-2 border dark:border-gray-700 font-medium">Created By</th>
                    <th className="px-3 py-2 border dark:border-gray-700 font-medium">Deadline</th>
                    {tab !== "requests" && <th className="px-3 py-2 border dark:border-gray-700 font-medium">Status</th>}
                    {tab !== "requests" && <th className="px-3 py-2 border dark:border-gray-700 font-medium">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((task, idx) => {
                    const overdue = isOverdue(task);
                    return (
                      <tr key={task.id} className={`${overdue ? "bg-red-50 dark:bg-red-900/20" : "bg-white dark:bg-gray-900"} hover:bg-gray-50 dark:hover:bg-gray-800`}>
                        <td className="px-3 py-2 border dark:border-gray-700 dark:text-gray-300">{(page - 1) * perPage + idx + 1}</td>
                        <td className="px-3 py-2 border dark:border-gray-700">
                          <div className="flex items-center gap-2">
                            <span className="font-medium dark:text-white">{task.name}</span>
                            {overdue && <span className="text-[10px] bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded-full font-medium">Overdue</span>}
                          </div>
                          {task.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{task.description}</p>}
                        </td>
                        <td className="px-3 py-2 border dark:border-gray-700 dark:text-gray-300">{task.category}</td>
                        <td className="px-3 py-2 border dark:border-gray-700 dark:text-gray-300">{task.siteProject}</td>
                        <td className="px-3 py-2 border dark:border-gray-700 dark:text-gray-300">{task.assignedTo?.username || "-"}</td>
                        <td className="px-3 py-2 border dark:border-gray-700 dark:text-gray-300">{task.createdBy?.username || "-"}</td>
                        <td className="px-3 py-2 border dark:border-gray-700 dark:text-gray-300">
                          <div>{new Date(task.deadline).toLocaleDateString()}</div>
                          {task.extensionCount > 0 && <div className="text-xs text-red-600 dark:text-red-400">Ext: {task.extensionCount}</div>}
                        </td>
                        {tab !== "requests" && (
                        <td className="px-3 py-2 border dark:border-gray-700">
                          <StatusBadge status={task.status} />
                          {task.extendStatus === "PENDING" && <span className="block text-[10px] text-orange-600 dark:text-orange-400 mt-0.5">Ext Pending</span>}
                          {task.reassignReason && <span className="block text-[10px] text-orange-600 dark:text-orange-400 mt-0.5">Reassigned</span>}
                        </td>
                        )}
                        {tab !== "requests" && (
                        <td className="px-3 py-2 border dark:border-gray-700">
                          <div className="flex gap-1 flex-wrap items-center">
                            {task.hasAttachment && (
                              <button onClick={() => openTaskAttachment(task, "attachment")} className="text-[10px] text-blue-600 dark:text-blue-400 underline">Attachment</button>
                            )}
                            {task.hasCompletedAttachment && (
                              <button onClick={() => openTaskAttachment(task, "completed")} className="text-[10px] text-green-600 dark:text-green-400 underline">Complete File</button>
                            )}
                            {task.hasExtendAttachments && (
                              <button onClick={() => openTaskAttachment(task, "extend")} className="text-[10px] text-orange-600 dark:text-orange-400 underline">Ext Files</button>
                            )}
                            {!task.locked && task.status !== "LOCKED" && task.status !== "COMPLETED" && (
                              <Link href={`/admin/tasks/${task.id}/edit`} className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded hover:bg-indigo-700">Edit</Link>
                            )}
                            {task.status === "COMPLETED" && !task.locked && (
                              <button onClick={() => handleApproveComplete(task.id)} className="text-[10px] bg-green-600 text-white px-2 py-0.5 rounded hover:bg-green-700">Accept & Approve</button>
                            )}
                            {task.extendStatus === "PENDING" && (
                              <>
                                <button onClick={() => handleApproveExtend(task.id)} className="text-[10px] bg-green-600 text-white px-2 py-0.5 rounded hover:bg-green-700">Accept Ext</button>
                                <button onClick={() => { setRejectExtendId(task.id); setRejectExtendReason(""); }} className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded hover:bg-red-700">Reject Ext</button>
                              </>
                            )}
                            {!task.locked && task.status !== "LOCKED" && task.status !== "COMPLETED" && (
                              <button onClick={() => { setReassigningId(task.id); setReassignUserId(""); setReassignReason(""); }} className="text-[10px] text-orange-600 dark:text-orange-400 underline">Reassign</button>
                            )}
                            <button onClick={() => handleDeleteTask(task.id)} className="text-[10px] text-red-600 dark:text-red-400 underline">Delete</button>
                            {task.hasVoiceNote && (
                              <button onClick={() => toggleExpandTask(task)} className="text-[10px] text-purple-600 dark:text-purple-400 underline">Voice</button>
                            )}
                            {(task.extendReason || task.lastExtReason || task.completedRemarks || task.reassignReason || task.extRejectReason || task.pendingReason || task.rejectReason || task.adminRemarks || task.hasAttachment || task.hasCompletedAttachment || task.hasExtendAttachments || task.hasVoiceNote || (task.history && task.history.length > 0)) && (
                              <button onClick={() => toggleExpandTask(task)} className="text-[10px] text-gray-600 dark:text-gray-400 underline">
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
                          {remarksTaskId === task.id && (
                            <div className="mt-2 space-y-2">
                              <textarea value={remarksText} onChange={(e) => setRemarksText(e.target.value)} rows={2} placeholder="Write admin remarks for this overdue task..." className="text-xs border rounded px-2 py-1 dark:bg-gray-700 dark:text-white dark:border-gray-600 w-full" />
                              <div className="flex gap-2">
                                <button onClick={() => handleAdminRemarks(task.id)} disabled={!remarksText.trim()} className="text-xs bg-blue-600 text-white px-2 py-1 rounded disabled:opacity-50">Send Remarks</button>
                                <button onClick={() => { setRemarksTaskId(null); setRemarksText(""); }} className="text-xs text-gray-500">Cancel</button>
                              </div>
                            </div>
                          )}
                          {expandedTaskId === task.id && (
                            <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-900 rounded text-xs space-y-1">
                              {!expandedTaskData && <p className="text-gray-400">Loading details...</p>}
                              {expandedTaskData && (
                                <>
                                  {expandedTaskData.adminRemarks && <p className="text-blue-600 dark:text-blue-400"><span className="font-medium">Admin Remarks:</span> {expandedTaskData.adminRemarks}</p>}
                                  {expandedTaskData.reassignReason && <p className="text-orange-600 dark:text-orange-400"><span className="font-medium">Reassign Reason:</span> {expandedTaskData.reassignReason}</p>}
                                  {expandedTaskData.reassignedBy && <p className="text-orange-600 dark:text-orange-400"><span className="font-medium">Reassigned By:</span> {expandedTaskData.reassignedBy}</p>}
                                  {expandedTaskData.extendReason && <p className="text-orange-600 dark:text-orange-400"><span className="font-medium">Extension Reason:</span> {expandedTaskData.extendReason}</p>}
                                  {expandedTaskData.lastExtReason && <p className="text-gray-600 dark:text-gray-400"><span className="font-medium">Last Ext Reason:</span> {expandedTaskData.lastExtReason}</p>}
                                  {expandedTaskData.extRejectReason && <p className="text-red-600 dark:text-red-400"><span className="font-medium">Ext Reject Reason:</span> {expandedTaskData.extRejectReason}</p>}
                                  {expandedTaskData.extRejectedBy && <p className="text-red-600 dark:text-red-400"><span className="font-medium">Rejected By:</span> {expandedTaskData.extRejectedBy}</p>}
                                  {expandedTaskData.completedRemarks && <p className="text-green-600 dark:text-green-400"><span className="font-medium">Completed Remarks:</span> {expandedTaskData.completedRemarks}</p>}
                                  {expandedTaskData.pendingReason && <p className="text-yellow-600 dark:text-yellow-400"><span className="font-medium">Pending Reason:</span> {expandedTaskData.pendingReason}</p>}
                                  {expandedTaskData.rejectReason && <p className="text-red-600 dark:text-red-400"><span className="font-medium">Reject Reason:</span> {expandedTaskData.rejectReason}</p>}
                                  {(expandedTaskData.attachmentUrl || (expandedTaskData.attachments && expandedTaskData.attachments.length > 0)) && (
                                    <p className="text-blue-600 dark:text-blue-400"><span className="font-medium">Task Attachment:</span> {(expandedTaskData.attachments || [expandedTaskData.attachmentUrl] as string[]).filter(Boolean).map((att: string, i: number) => (
                                      <button key={i} onClick={() => openAttachment(att, `${task.name}_att_${i + 1}`)} className="underline ml-1">View {expandedTaskData.attachments && expandedTaskData.attachments.length > 1 ? `(${i + 1})` : ""}</button>
                                    ))}</p>
                                  )}
                                  {(expandedTaskData.completedAttachmentUrl || (expandedTaskData.completedAttachments && expandedTaskData.completedAttachments.length > 0)) && (
                                    <p className="text-green-600 dark:text-green-400"><span className="font-medium">Completion Attachments:</span> {(expandedTaskData.completedAttachments || [expandedTaskData.completedAttachmentUrl] as string[]).filter(Boolean).map((att: string, i: number) => (
                                      <button key={i} onClick={() => openAttachment(att, `${task.name}_completed_${i + 1}`)} className="underline ml-1">View {i + 1}</button>
                                    ))}</p>
                                  )}
                                  {expandedTaskData.extendAttachments && expandedTaskData.extendAttachments.length > 0 && (
                                    <p className="text-orange-600 dark:text-orange-400"><span className="font-medium">Extend Attachments:</span> {expandedTaskData.extendAttachments.filter(Boolean).map((att: string, i: number) => (
                                      <button key={i} onClick={() => openAttachment(att, `${task.name}_extend_${i + 1}`)} className="underline ml-1">View {i + 1}</button>
                                    ))}</p>
                                  )}
                                  {expandedTaskData.voiceNoteUrl && <div className="mt-1"><VoicePlayer src={expandedTaskData.voiceNoteUrl} /></div>}
                                  <div className="mt-2">
                                    <VoiceRecorder taskId={task.id} onSent={loadData} />
                                  </div>
                                  {expandedTaskData.history && Array.isArray(expandedTaskData.history) && expandedTaskData.history.length > 0 && (
                                    <div className="mt-2 border-t border-gray-200 dark:border-gray-700 pt-2">
                                      <p className="font-medium text-blue-600 dark:text-blue-400 mb-1">Change History:</p>
                                      {expandedTaskData.history.map((h: any, i: number) => (
                                        <p key={i} className="text-xs text-gray-500 dark:text-gray-400">[{new Date(h.date).toLocaleString()}] {h.action}: {h.details}</p>
                                      ))}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </td>
                        )}
                      </tr>
                    );
                  })}
                  {paginated.length === 0 && <tr><td colSpan={tab === "requests" ? 7 : 9} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">No tasks found</td></tr>}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={filteredTasks.length}
              perPage={perPage}
              onPageChange={setPage}
              onPerPageChange={(n) => { setPerPage(n); setPage(1); }}
            />
          </>
        )}
      </div>
    </div>
  );
}
