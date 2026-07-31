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
  const [tab, setTab] = useState<"all" | "assigned" | "created" | "completed" | "pending" | "reassigned" | "sites">("all");
  const [pendingFilter, setPendingFilter] = useState<"all" | "general" | "overdue" | "extension" | "reassign">("all");
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [topAction, setTopAction] = useState<"create" | "all" | "site">("all");
  const [selectedSite, setSelectedSite] = useState<string>("");
  const [now, setNow] = useState(new Date());
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  const exportToExcel = () => {
    const headers = ["#", "Task Name", "Description", "Category", "Site", "Requested By", "Deadline", "Status", "Priority", "Extensions", "Completed Remarks", "Admin Remarks"];
    const rows = filteredTasks.map((task, idx) => [
      idx + 1,
      task.name,
      task.description || "",
      task.category,
      task.siteProject,
      task.createdById === user?.id ? "You" : (task.assignedByName || task.createdBy?.username || "Unknown"),
      new Date(task.deadline).toLocaleDateString(),
      task.status,
      task.priority,
      task.extensionCount || 0,
      task.completedRemarks || "",
      task.adminRemarks || "",
    ]);

    const escapeXml = (val: string) => val.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
    const xmlRows = rows.map((row) =>
      `<Row>${row.map((cell) => `<Cell><Data ss:Type="String">${escapeXml(String(cell))}</Data></Cell>`).join("")}</Row>`
    ).join("");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="My Tasks">
  <Table>
   <Row>${headers.map((h) => `<Cell><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`).join("")}</Row>
   ${xmlRows}
  </Table>
 </Worksheet>
</Workbook>`;

    const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `my_tasks_${new Date().toISOString().split("T")[0]}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (!loading && (!user || user.role !== "USER")) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.role === "USER") loadData();
  }, [user]);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

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

  const isOverdue = (task: Task) => {
    const deadline = new Date(task.deadline);
    const overdueThreshold = new Date(deadline.getTime() + 24 * 60 * 60 * 1000);
    return overdueThreshold < now && task.status !== "COMPLETED" && task.status !== "LOCKED" && task.status !== "VERIFIED";
  };

  const assignedToMeTasks = myTasks.filter((t) => t.assignedToId === user?.id);
  const createdByMeTasks = myTasks.filter((t) => t.createdById === user?.id);
  const completedTasks = myTasks.filter((t) => t.status === "COMPLETED" || t.status === "LOCKED");
  const pendingReviewTasks = myTasks.filter((t) => t.status === "PENDING");
  const pendingTasks = myTasks.filter((t) => t.status === "PENDING" || t.extendStatus === "PENDING" || (t.reassignReason && t.status !== "LOCKED"));
  const reassignedTasks = myTasks.filter((t) => t.reassignReason);
  const overdueTasks = myTasks.filter((t) => isOverdue(t));

  const filteredTasks = myTasks.filter((t) => {
    if (topAction === "site" && selectedSite) {
      if (t.siteProject !== selectedSite) return false;
    }
    if (tab === "assigned") return t.assignedToId === user?.id;
    if (tab === "created") return t.createdById === user?.id;
    if (tab === "completed") return t.status === "COMPLETED" || t.status === "LOCKED";
    if (tab === "pending") {
      let match = t.status === "PENDING" || t.extendStatus === "PENDING" || (t.reassignReason && t.status !== "LOCKED");
      if (pendingFilter === "general") match = t.status === "PENDING" && !isOverdue(t) && !t.reassignReason;
      else if (pendingFilter === "overdue") match = isOverdue(t) && t.status !== "COMPLETED" && t.status !== "LOCKED";
      else if (pendingFilter === "extension") match = t.extendStatus === "PENDING";
      else if (pendingFilter === "reassign") match = !!t.reassignReason && t.status !== "LOCKED";
      return match;
    }
    if (tab === "reassigned") return !!t.reassignReason;
    return true;
  });

  const getStatusColor = (task: Task) => {
    if (task.status === "LOCKED") return "bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600";
    if (task.status === "COMPLETED") return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";
    if (task.status === "PENDING") return "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800";
    if (task.status === "REJECTED") return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
    return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800";
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
            <button onClick={exportToExcel} className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 text-sm">Download Excel</button>
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
              { key: "assigned" as const, label: "Request by User", count: filteredTasks.filter((t) => t.assignedToId === user?.id).length },
              { key: "created" as const, label: "Created by Me", count: filteredTasks.filter((t) => t.createdById === user?.id).length },
              { key: "completed" as const, label: "Completed", count: filteredTasks.filter((t) => t.status === "COMPLETED" || t.status === "LOCKED").length },
              { key: "pending" as const, label: "Pending", count: pendingTasks.length },
              { key: "reassigned" as const, label: "Reassigned", count: reassignedTasks.length },
              { key: "sites" as const, label: "Sites", count: sites.length },
            ].map((t) => (
              <button key={t.key} onClick={() => { setTab(t.key); setPendingFilter("all"); }} className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t.key ? "border-indigo-600 text-indigo-600 dark:text-indigo-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}>
                {t.label} ({t.count})
              </button>
            ))}
          </div>
        )}

        {tab === "pending" && (
          <div className="flex gap-2 mb-4 flex-wrap">
            {[
              { key: "all" as const, label: "All Pending" },
              { key: "general" as const, label: "General Pending" },
              { key: "overdue" as const, label: "Overdue" },
              { key: "extension" as const, label: "Extension Requests" },
              { key: "reassign" as const, label: "Reassign" },
            ].map((f) => (
              <button key={f.key} onClick={() => { setPendingFilter(f.key); }} className={`px-3 py-1.5 rounded-full text-xs font-medium ${pendingFilter === f.key ? "bg-indigo-600 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"}`}>
                {f.label}
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-800 text-left">
                  <th className="px-3 py-2 border dark:border-gray-700 font-medium">#</th>
                  <th className="px-3 py-2 border dark:border-gray-700 font-medium">Task Name</th>
                  <th className="px-3 py-2 border dark:border-gray-700 font-medium">Category</th>
                  <th className="px-3 py-2 border dark:border-gray-700 font-medium">Site</th>
                  <th className="px-3 py-2 border dark:border-gray-700 font-medium">Requested By</th>
                  <th className="px-3 py-2 border dark:border-gray-700 font-medium">Deadline</th>
                  <th className="px-3 py-2 border dark:border-gray-700 font-medium">Status</th>
                  <th className="px-3 py-2 border dark:border-gray-700 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task, idx) => {
                  const canAct = !task.locked && task.status !== "COMPLETED" && task.status !== "LOCKED" && task.status !== "REJECTED";
                  const overdue = isOverdue(task);
                  return (
                    <tr key={task.id} className={`${overdue ? "bg-red-50 dark:bg-red-900/20" : "bg-white dark:bg-gray-900"} hover:bg-gray-50 dark:hover:bg-gray-800`}>
                      <td className="px-3 py-2 border dark:border-gray-700 dark:text-gray-300">{idx + 1}</td>
                      <td className="px-3 py-2 border dark:border-gray-700">
                        <div className="flex items-center gap-2">
                          <span className="font-medium dark:text-white">{task.name}</span>
                          {overdue && <span className="text-[10px] bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded-full font-medium">Overdue</span>}
                        </div>
                        {task.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{task.description}</p>}
                      </td>
                      <td className="px-3 py-2 border dark:border-gray-700 dark:text-gray-300">{task.category}</td>
                      <td className="px-3 py-2 border dark:border-gray-700 dark:text-gray-300">{task.siteProject}</td>
                      <td className="px-3 py-2 border dark:border-gray-700 dark:text-gray-300">
                        {task.createdById === user?.id ? "You" : (task.assignedByName || task.createdBy?.username || "Unknown")}
                      </td>
                      <td className="px-3 py-2 border dark:border-gray-700 dark:text-gray-300">
                        <div>{new Date(task.deadline).toLocaleDateString()}</div>
                        {task.userDeadline && <div className="text-xs text-gray-500 dark:text-gray-400">Your: {new Date(task.userDeadline).toLocaleDateString()}</div>}
                        {task.extensionCount > 0 && <div className="text-xs text-red-600 dark:text-red-400">Ext: {task.extensionCount}</div>}
                      </td>
                      <td className="px-3 py-2 border dark:border-gray-700">
                        <StatusBadge status={task.status} />
                        {task.extendStatus === "PENDING" && <span className="block text-[10px] text-orange-600 dark:text-orange-400 mt-0.5">Ext Pending</span>}
                        {task.reassignReason && <span className="block text-[10px] text-orange-600 dark:text-orange-400 mt-0.5">Reassigned</span>}
                      </td>
                      <td className="px-3 py-2 border dark:border-gray-700">
                        <div className="flex gap-1 flex-wrap">
                          {task.hasAttachment && (
                            <button onClick={async () => { if (!task.attachmentUrl) { const full = await api.tasks.getById(task.id); if (full.attachmentUrl) openAttachment(full.attachmentUrl, `${task.name}_attachment`); } else { openAttachment(task.attachmentUrl, `${task.name}_attachment`); } }} className="text-[10px] text-blue-600 dark:text-blue-400 underline">Attachment</button>
                          )}
                          {task.hasCompletedAttachment && (
                            <button onClick={async () => { if (!task.completedAttachmentUrl) { const full = await api.tasks.getById(task.id); if (full.completedAttachmentUrl) openAttachment(full.completedAttachmentUrl, `${task.name}_completed`); } else { openAttachment(task.completedAttachmentUrl, `${task.name}_completed`); } }} className="text-[10px] text-green-600 dark:text-green-400 underline">Complete File</button>
                          )}
                          {task.voiceNoteUrl && (
                            <button onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)} className="text-[10px] text-purple-600 dark:text-purple-400 underline">Voice</button>
                          )}
                          {task.adminRemarks && (
                            <button onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)} className="text-[10px] text-blue-600 dark:text-blue-400 underline">Remarks</button>
                          )}
                          {(task.extendReason || task.lastExtReason || task.completedRemarks || task.reassignReason || task.extRejectReason || task.pendingReason || task.rejectReason || (task.history && task.history.length > 0)) && (
                            <button onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)} className="text-[10px] text-gray-600 dark:text-gray-400 underline">History</button>
                          )}
                          {canAct && task.assignedToId === user?.id && (
                            <Link href={`/user/tasks/${task.id}`} className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded hover:bg-indigo-700">Open</Link>
                          )}
                        </div>
                        {expandedTaskId === task.id && (
                          <div className="mt-2 space-y-1 text-xs">
                            {task.adminRemarks && <p className="text-blue-600 dark:text-blue-400"><span className="font-medium">Admin Remarks:</span> {task.adminRemarks}</p>}
                            {task.voiceNoteUrl && <p className="text-purple-600 dark:text-purple-400"><span className="font-medium">Voice Note:</span> <audio controls src={task.voiceNoteUrl} className="inline-block ml-2 max-w-[200px]" /></p>}
                            {task.completedRemarks && <p className="text-green-600 dark:text-green-400"><span className="font-medium">Completed Remarks:</span> {task.completedRemarks}</p>}
                            {task.extendReason && <p className="text-orange-600 dark:text-orange-400"><span className="font-medium">Extend Reason:</span> {task.extendReason}</p>}
                            {task.lastExtReason && <p className="text-gray-600 dark:text-gray-400"><span className="font-medium">Last Ext Reason:</span> {task.lastExtReason}</p>}
                            {task.reassignReason && <p className="text-orange-600 dark:text-orange-400"><span className="font-medium">Reassign Reason:</span> {task.reassignReason} {task.reassignedBy && `by ${task.reassignedBy}`}</p>}
                            {task.rejectReason && <p className="text-red-600 dark:text-red-400"><span className="font-medium">Reject Reason:</span> {task.rejectReason}</p>}
                            {task.extRejectReason && <p className="text-red-600 dark:text-red-400"><span className="font-medium">Ext Reject Reason:</span> {task.extRejectReason} {task.extRejectedBy && `by ${task.extRejectedBy}`}</p>}
                            {task.pendingReason && <p className="text-yellow-600 dark:text-yellow-400"><span className="font-medium">Pending Reason:</span> {task.pendingReason}</p>}
                            {task.history && task.history.length > 0 && (
                              <div>
                                <p className="font-medium dark:text-white">History:</p>
                                {task.history.map((h: any, i: number) => (
                                  <p key={i} className="text-gray-600 dark:text-gray-400 ml-2">{h.action} by {h.by || "System"} {h.timestamp ? `at ${new Date(h.timestamp).toLocaleString()}` : ""} {h.note ? `- ${h.note}` : ""}</p>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
