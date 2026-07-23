"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter, useParams } from "next/navigation";
import { api, type Task, type Submission } from "@/lib/api";
import Navbar from "@/components/Navbar";
import StatusBadge from "@/components/StatusBadge";
import { openAttachment } from "@/lib/attachment";

export default function TaskDetailPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const taskId = params.id as string;
  const [task, setTask] = useState<Task | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [showExtendForm, setShowExtendForm] = useState(false);
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [completeRemarks, setCompleteRemarks] = useState("");
  const [extendDeadline, setExtendDeadline] = useState("");
  const [extendReason, setExtendReason] = useState("");
  const [completing, setCompleting] = useState(false);
  const [extendSubmitting, setExtendSubmitting] = useState(false);
  const [completeFile, setCompleteFile] = useState<File | null>(null);
  const [completeFilePreview, setCompleteFilePreview] = useState<string>("");
  const completeFileInputRef = useRef<HTMLInputElement>(null);
  const completeCameraInputRef = useRef<HTMLInputElement>(null);

  const [reassigning, setReassigning] = useState(false);
  const [reassignUserId, setReassignUserId] = useState("");
  const [reassignReason, setReassignReason] = useState("");
  const [allUsers, setAllUsers] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && (!user || user.role !== "USER")) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (taskId && user) loadTask();
    if (user) api.users.getAll().then(setAllUsers).catch(() => {});
  }, [taskId, user]);

  const loadTask = async () => {
    try {
      const [t, s] = await Promise.all([api.tasks.getById(taskId), api.submissions.getByTask(taskId)]);
      setTask(t);
      setSubmissions(s);
    } catch (err) { console.error(err); }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCompleteFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setCompleteFilePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completeRemarks.trim()) { alert("Please provide remarks"); return; }
    setCompleting(true);
    try {
      if (completeFile) {
        const formData = new FormData();
        formData.append("remarks", completeRemarks.trim());
        formData.append("file", completeFile);
        await api.submissions.submit(taskId, formData);
        await api.tasks.complete(taskId, completeRemarks.trim());
      } else {
        await api.tasks.complete(taskId, completeRemarks.trim());
      }
      setCompleteRemarks("");
      setCompleteFile(null);
      setCompleteFilePreview("");
      setShowCompleteForm(false);
      loadTask();
    } catch (err) { console.error(err); }
    finally { setCompleting(false); }
  };

  const handleExtend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extendDeadline) { alert("Please select a new deadline"); return; }
    setExtendSubmitting(true);
    try { await api.tasks.extendDate(taskId, extendDeadline, extendReason); setExtendDeadline(""); setExtendReason(""); setShowExtendForm(false); loadTask(); } catch (err) { console.error(err); }
    finally { setExtendSubmitting(false); }
  };

  const canManage = user && task && task.createdById === user.id && task.assignedToId !== user.id;

  const handleApproveComplete = async () => {
    try { await api.tasks.approveComplete(taskId); loadTask(); } catch (err) { console.error(err); }
  };

  const handleApproveExtend = async () => {
    try { await api.tasks.approveExtend(taskId); loadTask(); } catch (err) { console.error(err); }
  };

  const [rejectExtendReason, setRejectExtendReason] = useState("");
  const handleRejectExtend = async () => {
    try { await api.tasks.rejectExtend(taskId, rejectExtendReason); setRejectExtendReason(""); loadTask(); } catch (err) { console.error(err); }
  };

  const handleLock = async () => {
    if (!confirm("Lock this task?")) return;
    try { await api.tasks.lock(taskId); loadTask(); } catch (err) { console.error(err); }
  };

  const handleReassign = async () => {
    if (!reassignUserId || !reassignReason.trim()) return;
    try { await api.tasks.reassign(taskId, reassignUserId, reassignReason.trim()); setReassigning(false); setReassignUserId(""); setReassignReason(""); loadTask(); } catch (err) { console.error(err); }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this task?")) return;
    try { await api.tasks.delete(taskId); router.push("/user"); } catch (err) { console.error(err); }
  };

  if (loading || !user || !task) return null;

  const canAct = !task.locked && task.status !== "COMPLETED" && task.status !== "LOCKED" && task.status !== "REJECTED" && task.status !== "PENDING";

  const isOverdue = (() => {
    const deadline = new Date(task.deadline);
    return deadline < new Date() && task.status !== "COMPLETED" && task.status !== "LOCKED" && task.status !== "VERIFIED";
  })();

  return (
    <div className="min-h-screen dark:bg-gray-900">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <button onClick={() => router.back()} className="text-sm text-indigo-600 hover:underline mb-4">&larr; Back</button>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <h1 className="text-2xl font-bold dark:text-white">{task.name}</h1>
            <div className="flex items-center gap-2">
              {isOverdue && <span className="text-xs bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full font-medium">Overdue</span>}
              <StatusBadge status={task.status} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
            <p><span className="font-medium">Category:</span> {task.category}</p>
            <p><span className="font-medium">Site:</span> {task.siteProject}</p>
            <p><span className="font-medium">Deadline:</span> {new Date(task.deadline).toLocaleDateString()}</p>
            {task.userDeadline && <p><span className="font-medium">Your Deadline:</span> {new Date(task.userDeadline).toLocaleDateString()}</p>}
            <p><span className="font-medium">Priority:</span> {task.priority}</p>
            <p className="text-indigo-600 dark:text-indigo-400"><span className="font-medium">Requested By:</span> {task.assignedByName || task.createdBy?.username || "Unknown"}</p>
            {task.extensionCount > 0 && <p className="text-red-600 dark:text-red-400"><span className="font-medium">Extensions:</span> {task.extensionCount}</p>}
          </div>
          {task.description && <p className="text-gray-700 dark:text-gray-300">{task.description}</p>}
          {task.attachmentUrl && (
            <div className="mt-4">
              <button onClick={() => openAttachment(task.attachmentUrl!, `${task.name}_attachment`)} className="text-sm text-blue-600 dark:text-blue-400 underline">View Task Attachment</button>
            </div>
          )}
        </div>

        {task.locked && (
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Task Completed(locked)</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">This task has been approved and locked by admin. No further actions allowed.</p>
          </div>
        )}

        {task.status === "REJECTED" && task.rejectReason && (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 p-6 mb-6">
            <h2 className="text-lg font-semibold text-red-800 dark:text-red-300">Task Rejected</h2>
            <p className="text-sm text-red-700 dark:text-red-400">Admin has rejected this task.</p>
            <div className="mt-3 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 rounded-md p-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason:</p>
              <p className="text-sm text-red-600 dark:text-red-400">{task.rejectReason}</p>
            </div>
          </div>
        )}

        {task.status === "PENDING" && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800 p-6 mb-6">
            <h2 className="text-lg font-semibold text-yellow-800 dark:text-yellow-300">Pending Review</h2>
            <p className="text-sm text-yellow-700 dark:text-yellow-400">Admin is reviewing your pending request...</p>
          </div>
        )}

        {task.status === "COMPLETED" && !task.locked && (
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 p-6 mb-6">
            <h2 className="text-lg font-semibold text-green-800 dark:text-green-300">Completed</h2>
            <p className="text-sm text-green-700 dark:text-green-400">Waiting for admin to verify and lock this task.</p>
            {task.completedRemarks && (
              <div className="mt-3 bg-white dark:bg-gray-800 border border-green-200 dark:border-green-800 rounded-md p-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Your Remarks:</p>
                <p className="text-sm text-green-600 dark:text-green-400 italic">{task.completedRemarks}</p>
              </div>
            )}
            {task.completedAttachmentUrl && (
              <div className="mt-2">
                <button onClick={() => openAttachment(task.completedAttachmentUrl!, `${task.name}_completed`)} className="text-sm text-green-600 dark:text-green-400 underline">View Completion Attachment</button>
              </div>
            )}
          </div>
        )}

        {task.extendStatus === "PENDING" && (
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800 p-6 mb-6">
            <h2 className="text-lg font-semibold text-orange-800 dark:text-orange-300">Extension Request Pending</h2>
            <p className="text-sm text-orange-700 dark:text-orange-400">Waiting for admin to approve your extension request.</p>
            {task.extendReason && <p className="text-sm text-orange-600 dark:text-orange-400 mt-1 italic">Reason: {task.extendReason}</p>}
          </div>
        )}

        {task.extendStatus === "REJECTED" && (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 p-6 mb-6">
            <h2 className="text-lg font-semibold text-red-800 dark:text-red-300">Extension Rejected</h2>
            <p className="text-sm text-red-700 dark:text-red-400">Your extension request was rejected by {task.extRejectedBy || "Admin"}.</p>
            {task.extRejectReason && <p className="text-sm text-red-600 dark:text-red-400 mt-1 italic">Reason: {task.extRejectReason}</p>}
          </div>
        )}

        {canAct && task.assignedToId === user?.id && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4 dark:text-white">Take Action</h2>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setShowCompleteForm(true)} className="bg-green-600 text-white px-4 py-3 rounded-md hover:bg-green-700 font-medium text-sm">
                Complete
              </button>
              <button onClick={() => setShowExtendForm(true)} className="bg-orange-500 text-white px-4 py-3 rounded-md hover:bg-orange-600 font-medium text-sm">
                Extend Date
              </button>
            </div>
          </div>
        )}

        {canManage && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-indigo-200 dark:border-indigo-800 p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4 dark:text-white">Task Creator Actions</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">You created this task. Manage it below.</p>
            <div className="flex flex-wrap gap-2">
              {task.status === "COMPLETED" && !task.locked && (
                <button onClick={handleApproveComplete} className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 text-sm font-medium">Accept & Lock</button>
              )}
              {task.extendStatus === "PENDING" && (
                <>
                  <button onClick={handleApproveExtend} className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 text-sm font-medium">Accept Extension</button>
                  <button onClick={() => setRejectExtendReason("-")} className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm font-medium">Reject Extension</button>
                </>
              )}
              {!task.locked && task.status !== "LOCKED" && task.status !== "COMPLETED" && (
                <button onClick={handleLock} className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 text-sm font-medium">Lock</button>
              )}
              {!task.locked && task.status !== "LOCKED" && task.status !== "COMPLETED" && (
                <button onClick={() => setReassigning(!reassigning)} className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 text-sm font-medium">Reassign</button>
              )}
              <button onClick={handleDelete} className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm font-medium">Delete</button>
            </div>
            {rejectExtendReason === "-" && (
              <div className="mt-3 flex gap-2">
                <input type="text" value={rejectExtendReason === "-" ? "" : rejectExtendReason} onChange={(e) => setRejectExtendReason(e.target.value)} placeholder="Rejection reason (optional)" className="flex-1 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 dark:text-white text-sm" />
                <button onClick={handleRejectExtend} className="bg-red-600 text-white px-3 py-2 rounded-md hover:bg-red-700 text-sm">Confirm</button>
                <button onClick={() => setRejectExtendReason("")} className="bg-gray-200 dark:bg-gray-700 px-3 py-2 rounded-md text-sm">Cancel</button>
              </div>
            )}
            {reassigning && (
              <div className="mt-3 space-y-2">
                <select value={reassignUserId} onChange={(e) => setReassignUserId(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 dark:text-white text-sm">
                  <option value="">Select user</option>
                  {allUsers.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.username} ({u.role})</option>
                  ))}
                </select>
                <input type="text" value={reassignReason} onChange={(e) => setReassignReason(e.target.value)} placeholder="Reassignment reason *" className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 dark:text-white text-sm" />
                <div className="flex gap-2">
                  <button onClick={handleReassign} disabled={!reassignUserId || !reassignReason.trim()} className="bg-orange-500 text-white px-3 py-2 rounded-md hover:bg-orange-600 text-sm disabled:opacity-50">Confirm Reassign</button>
                  <button onClick={() => { setReassigning(false); setReassignUserId(""); setReassignReason(""); }} className="bg-gray-200 dark:bg-gray-700 px-3 py-2 rounded-md text-sm">Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}

        {showCompleteForm && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-800 p-6 mb-6">
            <form onSubmit={handleComplete} className="space-y-4">
              <h2 className="text-lg font-semibold dark:text-white">Complete Task</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Please provide remarks and optionally attach a file (PDF/JPEG or camera photo).</p>
              <textarea value={completeRemarks} onChange={(e) => setCompleteRemarks(e.target.value)} rows={4} className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="Describe what you did to complete this task..." required />

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Attach File (optional)</label>
                <div className="flex gap-2">
                  <input ref={completeFileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileSelect} className="hidden" />
                  <button type="button" onClick={() => completeFileInputRef.current?.click()} className="bg-blue-500 text-white px-3 py-2 rounded-md hover:bg-blue-600 text-sm">
                    Upload PDF/Image
                  </button>
                  <input ref={completeCameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" />
                  <button type="button" onClick={() => completeCameraInputRef.current?.click()} className="bg-purple-500 text-white px-3 py-2 rounded-md hover:bg-purple-600 text-sm">
                    Camera
                  </button>
                </div>
                {completeFile && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Selected: {completeFile.name}</p>
                    {completeFilePreview && completeFile.type.startsWith("image/") && (
                      <img src={completeFilePreview} alt="Preview" className="mt-2 max-h-32 rounded border border-gray-200 dark:border-gray-700" />
                    )}
                    <button type="button" onClick={() => { setCompleteFile(null); setCompleteFilePreview(""); }} className="text-xs text-red-600 hover:underline mt-1">Remove</button>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button type="submit" disabled={completing} className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50">{completing ? "Completing..." : "Submit & Complete"}</button>
                <button type="button" onClick={() => { setShowCompleteForm(false); setCompleteRemarks(""); setCompleteFile(null); setCompleteFilePreview(""); }} className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {showExtendForm && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-orange-200 dark:border-orange-800 p-6 mb-6">
            <form onSubmit={handleExtend} className="space-y-4">
              <h2 className="text-lg font-semibold dark:text-white">Request Deadline Extension</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Deadline</label>
                <input type="date" value={extendDeadline} onChange={(e) => setExtendDeadline(e.target.value)} required className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason (Optional)</label>
                <textarea value={extendReason} onChange={(e) => setExtendReason(e.target.value)} rows={2} className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="Why do you need more time?" />
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={extendSubmitting} className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 disabled:opacity-50">{extendSubmitting ? "Submitting..." : "Submit Request"}</button>
                <button type="button" onClick={() => { setShowExtendForm(false); setExtendDeadline(""); setExtendReason(""); }} className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600">Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold mb-4 dark:text-white">History ({submissions.length})</h2>
          {submissions.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm">No history yet.</p>
          ) : (
            <div className="space-y-4">
              {submissions.map((sub) => (
                <div key={sub.id} className="border border-gray-100 dark:border-gray-700 rounded-md p-4">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(sub.createdAt).toLocaleString()}</p>
                    <StatusBadge status={sub.status} />
                  </div>
                  {sub.comments && <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">{sub.comments}</p>}
                  {sub.adminComments && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 italic">Admin: {sub.adminComments}</p>}
                  {sub.pendingReason && <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1 italic">Reason: {sub.pendingReason}</p>}
                  {sub.reportUrl && (
                    <button onClick={() => openAttachment(sub.reportUrl!, `submission_${sub.id}`)} className="text-xs text-blue-600 dark:text-blue-400 underline mt-1 inline-block">View Attachment</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
