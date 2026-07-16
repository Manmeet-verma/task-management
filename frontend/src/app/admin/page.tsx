"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { api, type Task, type Submission, type User } from "@/lib/api";
import Navbar from "@/components/Navbar";
import TaskCard from "@/components/TaskCard";
import StatusBadge from "@/components/StatusBadge";
import Link from "next/link";

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
  const [claimedTasks, setClaimedTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tab, setTab] = useState<"tasks" | "claimed" | "submissions" | "pending" | "users">("tasks");
  const [loadingData, setLoadingData] = useState(true);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({ username: "", email: "", password: "", role: "USER" });
  const [rejectingTaskId, setRejectingTaskId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    if (!loading && (!user || user.role !== "ADMIN")) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.role === "ADMIN") {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setLoadingData(true);
    try {
      const [t, s, p, c, u] = await Promise.all([
        api.tasks.getAll(),
        api.submissions.getAll(),
        api.tasks.getPending(),
        api.tasks.getClaimed(),
        api.admin.getUsers(),
      ]);
      setTasks(t);
      setSubmissions(s);
      setPendingTasks(p);
      setClaimedTasks(c);
      setUsers(u);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this task?")) return;
    try {
      await api.tasks.delete(id);
      setTasks(tasks.filter((t) => t.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleAcceptTask = async (id: string) => {
    try {
      await api.tasks.accept(id);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectTask = async (id: string) => {
    if (!rejectReason.trim()) {
      alert("Please provide a rejection reason");
      return;
    }
    try {
      await api.tasks.reject(id, rejectReason);
      setRejectingTaskId(null);
      setRejectReason("");
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReview = async (id: string, action: "accept" | "reject") => {
    const adminComments =
      action === "reject" ? prompt("Reason for rejection:") || "" : undefined;
    try {
      await api.submissions.review(id, action, adminComments);
      loadData();
    } catch (err) {
      console.error(err);
    }
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
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    }
  };

  const handleEditUser = (u: User) => {
    setEditingUser(u);
    setUserForm({ username: u.username, email: u.email, password: "", role: u.role });
    setShowUserForm(true);
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Delete this user?")) return;
    try {
      await api.admin.deleteUser(id);
      setUsers(users.filter((u) => u.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading || !user) return null;

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <div className="flex gap-2">
            {tab === "users" ? (
              <button
                onClick={() => { setEditingUser(null); setUserForm({ username: "", email: "", password: "", role: "USER" }); setShowUserForm(true); }}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm"
              >
                + New User
              </button>
            ) : (
              <Link
                href="/admin/tasks/new"
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm"
              >
                + New Task
              </Link>
            )}
          </div>
        </div>

        <div className="flex gap-4 mb-6 border-b border-gray-200 overflow-x-auto">
          <button onClick={() => setTab("tasks")} className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === "tasks" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            Tasks ({tasks.length})
          </button>
          <button onClick={() => setTab("claimed")} className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === "claimed" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            Claimed ({claimedTasks.length})
          </button>
          <button onClick={() => setTab("submissions")} className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === "submissions" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            Submissions ({submissions.length})
          </button>
          <button onClick={() => setTab("pending")} className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === "pending" ? "border-orange-600 text-orange-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            Pending ({pendingTasks.length})
          </button>
          <button onClick={() => setTab("users")} className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === "users" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            Users ({users.length})
          </button>
        </div>

        {showUserForm && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">{editingUser ? "Edit User" : "Create User"}</h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                  <input type="text" value={userForm.username} onChange={(e) => setUserForm({ ...userForm, username: e.target.value })} required className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} required className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{editingUser ? "New Password (leave blank to keep)" : "Password"}</label>
                  <input type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} required={!editingUser} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="USER">User</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm">
                  {editingUser ? "Update User" : "Create User"}
                </button>
                <button type="button" onClick={() => { setShowUserForm(false); setEditingUser(null); }} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 text-sm">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {loadingData ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : tab === "tasks" ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                href={`/admin/tasks/${task.id}/edit`}
                action={
                  <button onClick={(e) => { e.preventDefault(); handleDelete(task.id); }} className="text-sm text-red-600 hover:text-red-800">
                    Delete
                  </button>
                }
              />
            ))}
            {tasks.length === 0 && (
              <p className="text-gray-500 col-span-full text-center py-8">No tasks yet.</p>
            )}
          </div>
        ) : tab === "claimed" ? (
          <div className="space-y-4">
            {claimedTasks.map((task) => (
              <div key={task.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{task.name}</p>
                    <p className="text-sm text-gray-500">Claimed by: {task.assignedTo?.username || "Unknown"}</p>
                    <p className="text-sm text-gray-500">Deadline: {new Date(task.deadline).toLocaleDateString()}</p>
                    {task.userDeadline && (
                      <p className="text-sm text-gray-500">User Deadline: {new Date(task.userDeadline).toLocaleDateString()}</p>
                    )}
                    <p className="text-sm text-gray-500">Category: {task.category} | Project: {task.siteProject}</p>
                  </div>
                  <StatusBadge status={task.status} />
                </div>
                {rejectingTaskId === task.id ? (
                  <div className="mt-3 bg-white border border-red-200 rounded-md p-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reason for rejection:</label>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      rows={2}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Why are you rejecting this task?"
                    />
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => handleRejectTask(task.id)} className="bg-red-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-red-700">Confirm Reject</button>
                      <button onClick={() => { setRejectingTaskId(null); setRejectReason(""); }} className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md text-sm hover:bg-gray-300">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => handleAcceptTask(task.id)} className="bg-emerald-600 text-white px-4 py-1.5 rounded-md text-sm hover:bg-emerald-700">Accept</button>
                    <button onClick={() => { setRejectingTaskId(task.id); setRejectReason(""); }} className="bg-red-600 text-white px-4 py-1.5 rounded-md text-sm hover:bg-red-700">Reject</button>
                  </div>
                )}
              </div>
            ))}
            {claimedTasks.length === 0 && <p className="text-gray-500 text-center py-8">No claimed tasks waiting for review.</p>}
          </div>
        ) : tab === "submissions" ? (
          <div className="space-y-4">
            {submissions.map((sub) => (
              <div key={sub.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{sub.task?.name || "Unknown Task"}</p>
                    <p className="text-sm text-gray-500">Submitted by: {sub.user?.username}</p>
                    <p className="text-sm text-gray-500">{new Date(sub.createdAt).toLocaleString()}</p>
                    {sub.comments && <p className="text-sm text-gray-600 mt-1">Comment: {sub.comments}</p>}
                    {sub.reportUrl && (
                      <a href={sub.reportUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:underline mt-1 inline-block">
                        View Report
                      </a>
                    )}
                    {sub.adminComments && <p className="text-sm text-gray-600 mt-1">Admin note: {sub.adminComments}</p>}
                  </div>
                  <StatusBadge status={sub.status} />
                </div>
                {sub.status === "SUBMITTED" && (
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => handleReview(sub.id, "accept")} className="bg-emerald-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-emerald-700">Accept</button>
                    <button onClick={() => handleReview(sub.id, "reject")} className="bg-red-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-red-700">Reject</button>
                  </div>
                )}
              </div>
            ))}
            {submissions.length === 0 && <p className="text-gray-500 text-center py-8">No submissions yet.</p>}
          </div>
        ) : tab === "pending" ? (
          <div className="space-y-4">
            {pendingTasks.map((task) => (
              <div key={task.id} className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{task.name}</p>
                    <p className="text-sm text-gray-500">Assigned to: {task.assignedTo?.username || "Unassigned"}</p>
                    <p className="text-sm text-gray-500">Deadline: {new Date(task.deadline).toLocaleDateString()}</p>
                    {task.submissions && task.submissions.length > 0 && (
                      <div className="mt-2">
                        {task.submissions.filter((s) => s.status === "PENDING_RESUBMIT").map((sub) => (
                          <p key={sub.id} className="text-sm text-orange-700 italic">Reason: {sub.pendingReason}</p>
                        ))}
                      </div>
                    )}
                  </div>
                  <StatusBadge status={task.status} />
                </div>
              </div>
            ))}
            {pendingTasks.length === 0 && <p className="text-gray-500 text-center py-8">No pending tasks.</p>}
          </div>
        ) : (
          <div className="space-y-4">
            {users.map((u) => (
              <div key={u.id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{u.username}</p>
                  <p className="text-sm text-gray-500">{u.email}</p>
                  <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${u.role === "ADMIN" ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-700"}`}>
                    {u.role}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEditUser(u)} className="text-sm text-indigo-600 hover:text-indigo-800">Edit</button>
                  <button onClick={() => handleDeleteUser(u.id)} className="text-sm text-red-600 hover:text-red-800">Delete</button>
                </div>
              </div>
            ))}
            {users.length === 0 && <p className="text-gray-500 text-center py-8">No users yet.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
