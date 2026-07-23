"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { api, type Task, type Site } from "@/lib/api";
import Navbar from "@/components/Navbar";
import StatusBadge from "@/components/StatusBadge";
import Link from "next/link";
import { openAttachment } from "@/lib/attachment";

export default function UserPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [tab, setTab] = useState<"all" | "assigned" | "created" | "completed" | "pending" | "reassigned" | "extension" | "sites">("all");
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [topAction, setTopAction] = useState<"create" | "all" | "site">("all");
  const [selectedSite, setSelectedSite] = useState<string>("");

  useEffect(() => {
    if (!loading && (!user || user.role !== "USER")) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.role === "USER") loadData();
  }, [user]);

  const loadData = async () => {
    setLoadingData(true);
    try {
      const [t, st] = await Promise.all([
        api.tasks.getMine(), api.sites.getAll()
      ]);
      setMyTasks(t);
      setSites(st);
    } catch (err) { console.error(err); }
    finally { setLoadingData(false); }
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

  const now = new Date();
  const isOverdue = (task: Task) => {
    const deadline = new Date(task.deadline);
    return deadline < now && task.status !== "COMPLETED" && task.status !== "LOCKED" && task.status !== "VERIFIED";
  };

  const assignedToMeTasks = myTasks.filter((t) => t.assignedToId === user?.id);
  const createdByMeTasks = myTasks.filter((t) => t.createdById === user?.id);
  const completedTasks = myTasks.filter((t) => t.status === "COMPLETED" || t.status === "LOCKED");
  const pendingReviewTasks = myTasks.filter((t) => t.status === "PENDING");
  const pendingTasks = myTasks.filter((t) => t.status === "PENDING" || t.extendStatus === "PENDING");
  const reassignedTasks = myTasks.filter((t) => t.reassignReason);
  const extensionTasks = myTasks.filter((t) => t.extendStatus === "PENDING" || t.extendStatus === "APPROVED" || t.extendStatus === "REJECTED");
  const overdueTasks = myTasks.filter((t) => isOverdue(t));

  const filteredTasks = myTasks.filter((t) => {
    if (topAction === "site" && selectedSite) {
      if (t.siteProject !== selectedSite) return false;
    }
    if (tab === "assigned") return t.assignedToId === user?.id;
    if (tab === "created") return t.createdById === user?.id;
    if (tab === "completed") return t.status === "COMPLETED" || t.status === "LOCKED";
    if (tab === "pending") return t.status === "PENDING" || t.extendStatus === "PENDING";
    if (tab === "reassigned") return !!t.reassignReason;
    if (tab === "extension") return t.extendStatus === "PENDING" || t.extendStatus === "APPROVED" || t.extendStatus === "REJECTED";
    return true;
  });

  const getStatusColor = (task: Task) => {
    if (task.status === "LOCKED") return "bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600";
    if (task.status === "COMPLETED") return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";
    if (task.status === "PENDING") return "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800";
    if (task.status === "REJECTED") return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
    return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800";
  };

  const canManageTask = (task: Task) => {
    if (!user) return false;
    if (user.isMaster) return true;
    return task.createdById === user.id;
  };

  if (loading || !user) return null;

  return (
    <div className="min-h-screen dark:bg-gray-900">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold dark:text-white">My Tasks ({myTasks.length})</h1>
          <div className="flex gap-2">
            <Link href="/tasks/new" className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm">+ Create Request</Link>
            <button onClick={() => setShowChangePassword(true)} className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 text-sm">Change Password</button>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <button onClick={() => { setTopAction("all"); setSelectedSite(""); }} className={`px-4 py-2 rounded-md text-sm font-medium ${topAction === "all" ? "bg-indigo-600 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"}`}>
            All Task
          </button>
          <button onClick={() => { setTopAction("create"); setSelectedSite(""); }} className={`px-4 py-2 rounded-md text-sm font-medium ${topAction === "create" ? "bg-indigo-600 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"}`}>
            Create Request
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

        {topAction === "create" && (
          <div className="mb-6">
            <Link href="/tasks/new" className="block w-full text-center bg-indigo-600 text-white px-6 py-4 rounded-lg hover:bg-indigo-700 text-lg font-medium">
              + Create New Request
            </Link>
          </div>
        )}

        {myTasks.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Tasks</p>
              <p className="text-2xl font-bold dark:text-white">{myTasks.length}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{myTasks.filter((t) => t.status === "ASSIGNED" || t.status === "IN_PROGRESS" || t.status === "ACCEPTED").length}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{completedTasks.length}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Pending Review</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{pendingReviewTasks.length}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-red-200 dark:border-red-700 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Overdue</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{overdueTasks.length}</p>
            </div>
          </div>
        )}

        {showChangePassword && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
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
        )}

        {topAction !== "create" && (
          <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
            {[
              { key: "all" as const, label: "All", count: filteredTasks.length },
              { key: "assigned" as const, label: "Requested to Me", count: filteredTasks.filter((t) => t.assignedToId === user?.id).length },
              { key: "created" as const, label: "Created by Me", count: filteredTasks.filter((t) => t.createdById === user?.id).length },
              { key: "completed" as const, label: "Completed", count: filteredTasks.filter((t) => t.status === "COMPLETED" || t.status === "LOCKED").length },
              { key: "pending" as const, label: "Pending", count: filteredTasks.filter((t) => t.status === "PENDING" || t.extendStatus === "PENDING").length },
              { key: "reassigned" as const, label: "Reassigned", count: filteredTasks.filter((t) => !!t.reassignReason).length },
              { key: "extension" as const, label: "Extension", count: filteredTasks.filter((t) => t.extendStatus === "PENDING" || t.extendStatus === "APPROVED" || t.extendStatus === "REJECTED").length },
              { key: "sites" as const, label: "Sites", count: sites.length },
            ].map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)} className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t.key ? "border-indigo-600 text-indigo-600 dark:text-indigo-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}>
                {t.label} ({t.count})
              </button>
            ))}
          </div>
        )}

        {loadingData ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading...</div>
        ) : tab === "sites" ? (
          <div className="space-y-2">
            {sites.filter(s => s.status === "ACTIVE").map((site) => (
              <div key={site.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <p className="font-medium dark:text-white">{site.name}</p>
                {site.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{site.description}</p>}
                <p className="text-xs text-gray-400 mt-1">Created: {new Date(site.createdAt).toLocaleDateString()}</p>
              </div>
            ))}
            {sites.filter(s => s.status === "ACTIVE").length === 0 && <p className="text-gray-500 dark:text-gray-400 text-center py-8">No active sites.</p>}
          </div>
        ) : filteredTasks.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">No tasks found.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTasks.map((task) => {
              const canAct = !task.locked && task.status !== "COMPLETED" && task.status !== "LOCKED" && task.status !== "REJECTED";
              const overdue = isOverdue(task);
              return (
                <div key={task.id} className={`rounded-lg border p-5 ${overdue ? "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700" : getStatusColor(task)}`}>
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold dark:text-white">{task.name}</h3>
                    <div className="flex items-center gap-2">
                      {overdue && <span className="text-xs bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full font-medium">Overdue</span>}
                      <StatusBadge status={task.status} />
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1 mb-4">
                    <p>Category: {task.category}</p>
                    <p>Site: {task.siteProject}</p>
                    <p className="text-indigo-600 dark:text-indigo-400">Requested By: {task.createdById === user?.id ? "You" : (task.assignedByName || task.createdBy?.username || "Unknown")}</p>
                    {task.createdById === user?.id && task.assignedTo && (
                      <p className="text-blue-600 dark:text-blue-400">Assigned To: {task.assignedTo.username}</p>
                    )}
                    <p>Deadline: {new Date(task.deadline).toLocaleDateString()}</p>
                    {task.userDeadline && <p>Your Deadline: {new Date(task.userDeadline).toLocaleDateString()}</p>}
                    {task.extensionCount > 0 && <p className="text-red-600 dark:text-red-400">Extensions: {task.extensionCount}</p>}
                    {task.description && <p className="text-gray-500 dark:text-gray-500 text-xs italic line-clamp-2">{task.description}</p>}
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
                      {task.completedRemarks && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1 italic line-clamp-2">Remarks: {task.completedRemarks}</p>
                      )}
                    </div>
                  )}

                  {task.extendStatus === "PENDING" && (
                    <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded p-2 mb-3">
                      <p className="text-xs text-orange-700 dark:text-orange-300">Extension request pending...</p>
                      {task.extendReason && <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 italic">Reason: {task.extendReason}</p>}
                    </div>
                  )}

                  {task.extendStatus === "REJECTED" && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-2 mb-3">
                      <p className="text-xs text-red-700 dark:text-red-300">Extension request rejected by {task.extRejectedBy || "Admin"}.</p>
                      {task.extRejectReason && <p className="text-xs text-red-600 dark:text-red-400 mt-1 italic">Reason: {task.extRejectReason}</p>}
                    </div>
                  )}

                  {task.reassignReason && (
                    <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded p-2 mb-3">
                      <p className="text-xs text-orange-700 dark:text-orange-300">Reassigned by {task.reassignedBy || "Admin"}.</p>
                      <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 italic">Reason: {task.reassignReason}</p>
                    </div>
                  )}

                  {task.lastExtReason && task.extendStatus !== "PENDING" && (
                    <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-2 mb-3">
                      <p className="text-xs text-gray-600 dark:text-gray-400">Last Extension Reason: {task.lastExtReason}</p>
                    </div>
                  )}

                  {task.locked && (
                    <div className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded p-2 mb-3">
                      <p className="text-xs text-gray-600 dark:text-gray-400">This task is completed(locked). No changes allowed.</p>
                    </div>
                  )}

                  {task.hasAttachment && (
                    <div className="mb-3">
                      <button onClick={async () => { if (!task.attachmentUrl) { const full = await api.tasks.getById(task.id); if (full.attachmentUrl) openAttachment(full.attachmentUrl, `${task.name}_attachment`); } else { openAttachment(task.attachmentUrl, `${task.name}_attachment`); } }} className="text-xs text-blue-600 dark:text-blue-400 underline">View Attachment</button>
                    </div>
                  )}

                  {task.hasCompletedAttachment && (
                    <div className="mb-3">
                      <button onClick={async () => { if (!task.completedAttachmentUrl) { const full = await api.tasks.getById(task.id); if (full.completedAttachmentUrl) openAttachment(full.completedAttachmentUrl, `${task.name}_completed`); } else { openAttachment(task.completedAttachmentUrl, `${task.name}_completed`); } }} className="text-xs text-green-600 dark:text-green-400 underline">View Completion Attachment</button>
                    </div>
                  )}

                  {canAct && task.assignedToId === user?.id && (
                    <Link href={`/user/tasks/${task.id}`} className="block w-full text-center bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium">
                      Open Task
                    </Link>
                  )}
                  {task.createdById === user?.id && task.assignedToId !== user?.id && (
                    <div className="text-center text-xs text-gray-500 dark:text-gray-400 italic py-2">You created this task</div>
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
