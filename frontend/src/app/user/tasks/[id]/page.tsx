"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter, useParams } from "next/navigation";
import { api, type Task, type Submission } from "@/lib/api";
import Navbar from "@/components/Navbar";
import StatusBadge from "@/components/StatusBadge";
import { openAttachment } from "@/lib/attachment";
import VoiceRecorder from "@/components/VoiceRecorder";
import VoicePlayer from "@/components/VoicePlayer";

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
  const [completeFiles, setCompleteFiles] = useState<File[]>([]);
  const [completeFilePreviews, setCompleteFilePreviews] = useState<string[]>([]);
  const completeFileInputRef = useRef<HTMLInputElement>(null);
  const completeCameraInputRef = useRef<HTMLInputElement>(null);

  const [extendFiles, setExtendFiles] = useState<File[]>([]);
  const [extendFilePreviews, setExtendFilePreviews] = useState<string[]>([]);
  const extendFileInputRef = useRef<HTMLInputElement>(null);
  const extendCameraInputRef = useRef<HTMLInputElement>(null);

  const [showVoiceAfterComplete, setShowVoiceAfterComplete] = useState(false);
  const [showVoiceAfterExtend, setShowVoiceAfterExtend] = useState(false);
  const [showVoiceInComplete, setShowVoiceInComplete] = useState(false);

  const [reassigning, setReassigning] = useState(false);
  const [reassignUserId, setReassignUserId] = useState("");
  const [reassignReason, setReassignReason] = useState("");
  const [allUsers, setAllUsers] = useState<any[]>([]);

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (!loading && (!user || (user.role !== "USER" && user.role !== "ADMIN"))) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (taskId && user) loadTask();
    if (user) api.users.getAll().then(setAllUsers).catch(() => {});
  }, [taskId, user]);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const loadTask = async () => {
    try {
      const [t, s] = await Promise.all([api.tasks.getById(taskId), api.submissions.getByTask(taskId)]);
      setTask(t);
      setSubmissions(s);
    } catch (err) { console.error(err); }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles = Array.from(files);
    setCompleteFiles(prev => [...prev, ...newFiles]);
    newFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => setCompleteFilePreviews(prev => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const removeCompleteFile = (index: number) => {
    setCompleteFiles(prev => prev.filter((_, i) => i !== index));
    setCompleteFilePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleExtendFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles = Array.from(files);
    setExtendFiles(prev => [...prev, ...newFiles]);
    newFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => setExtendFilePreviews(prev => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const removeExtendFile = (index: number) => {
    setExtendFiles(prev => prev.filter((_, i) => i !== index));
    setExtendFilePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completeRemarks.trim()) { alert("Please provide remarks"); return; }
    setCompleting(true);
    try {
      const formData = new FormData();
      formData.append("remarks", completeRemarks.trim());
      for (const file of completeFiles) {
        formData.append("files", file);
      }
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/tasks/${taskId}/complete`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setCompleteRemarks("");
      setCompleteFiles([]);
      setCompleteFilePreviews([]);
      setShowCompleteForm(false);
      loadTask();
    } catch (err) { console.error(err); }
    finally { setCompleting(false); }
  };

  const handleExtend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extendDeadline) { alert("Please select a new deadline"); return; }
    setExtendSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("newDeadline", extendDeadline);
      formData.append("reason", extendReason);
      for (const file of extendFiles) {
        formData.append("files", file);
      }
      const token = localStorage.getItem("token");
      await fetch(`/api/tasks/${taskId}/extend-date`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      setExtendDeadline("");
      setExtendReason("");
      setExtendFiles([]);
      setExtendFilePreviews([]);
      setShowExtendForm(false);
      setShowVoiceAfterExtend(true);
      loadTask();
    } catch (err) { console.error(err); }
    finally { setExtendSubmitting(false); }
  };

  const canManage = user && task && task.createdById === user.id && task.assignedToId !== user.id;

  const [editingAttachments, setEditingAttachments] = useState(false);
  const [editFiles, setEditFiles] = useState<File[]>([]);
  const [editFilePreviews, setEditFilePreviews] = useState<string[]>([]);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const editCameraInputRef = useRef<HTMLInputElement>(null);
  const [editRemarks, setEditRemarks] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [keptAttachments, setKeptAttachments] = useState<string[]>([]);

  const handleEditFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles = Array.from(files);
    setEditFiles(prev => [...prev, ...newFiles]);
    newFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => setEditFilePreviews(prev => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const removeEditFile = (index: number) => {
    setEditFiles(prev => prev.filter((_, i) => i !== index));
    setEditFilePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveEdit = async () => {
    setSavingEdit(true);
    try {
      const formData = new FormData();
      formData.append("remarks", editRemarks.trim() || task?.completedRemarks || "Completed");
      formData.append("keepAttachments", JSON.stringify(keptAttachments));
      for (const file of editFiles) {
        formData.append("files", file);
      }
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/tasks/${taskId}/complete`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setEditingAttachments(false);
      setEditFiles([]);
      setEditFilePreviews([]);
      setEditRemarks("");
      setKeptAttachments([]);
      loadTask();
    } catch (err) { console.error(err); }
    finally { setSavingEdit(false); }
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
    const overdueThreshold = new Date(deadline.getTime() + 24 * 60 * 60 * 1000);
    return overdueThreshold < now && task.status !== "COMPLETED" && task.status !== "LOCKED" && task.status !== "VERIFIED";
  })();

  return (
    <div className="min-h-screen dark:bg-gray-900">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <button onClick={() => router.back()} className="text-sm text-indigo-600 hover:underline mb-4">&larr; Back</button>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
            <h1 className="text-2xl font-bold dark:text-white">{task.name}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              {isOverdue && <span className="text-xs bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full font-medium">Overdue</span>}
              <StatusBadge status={task.status} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
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

        {task.status === "COMPLETED" && !task.locked && task.assignedToId === user?.id && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-6 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-blue-800 dark:text-blue-300">Edit Completion</h2>
                <p className="text-sm text-blue-700 dark:text-blue-400">You can update your completion remarks and attachments before admin approval.</p>
              </div>
              <button onClick={() => {
                if (!editingAttachments && task) {
                  const existing = task.completedAttachments || (task.completedAttachmentUrl ? [task.completedAttachmentUrl] : []);
                  setKeptAttachments([...existing]);
                  setEditRemarks(task.completedRemarks || "");
                }
                setEditingAttachments(!editingAttachments);
              }} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium">
                {editingAttachments ? "Cancel Edit" : "Edit Completion"}
              </button>
            </div>
            {editingAttachments && (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Update Remarks (optional)</label>
                  <textarea value={editRemarks} onChange={(e) => setEditRemarks(e.target.value)} rows={3} className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Update your completion remarks..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Existing Attachments ({keptAttachments.length})</label>
                  {keptAttachments.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {keptAttachments.map((att, i) => (
                        <div key={i} className="relative">
                          {att.startsWith("data:image") ? (
                            <img src={att} alt={`File ${i + 1}`} className="w-full h-24 object-cover rounded border border-gray-200 dark:border-gray-700" />
                          ) : (
                            <div className="w-full h-24 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-700">
                              <p className="text-xs text-gray-500 dark:text-gray-400 text-center px-1">File {i + 1}</p>
                            </div>
                          )}
                          <button type="button" onClick={() => setKeptAttachments(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600">x</button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">No existing attachments</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Add New Files</label>
                  <div className="flex gap-2 flex-wrap">
                    <input ref={editFileInputRef} type="file" multiple onChange={handleEditFileSelect} className="hidden" />
                    <button type="button" onClick={() => editFileInputRef.current?.click()} className="bg-blue-500 text-white px-3 py-2 rounded-md hover:bg-blue-600 text-sm">+ Add File</button>
                    <input ref={editCameraInputRef} type="file" accept="image/*" capture="environment" multiple onChange={handleEditFileSelect} className="hidden" />
                    <button type="button" onClick={() => editCameraInputRef.current?.click()} className="bg-purple-500 text-white px-3 py-2 rounded-md hover:bg-purple-600 text-sm">Camera</button>
                  </div>
                  {editFiles.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {editFilePreviews.map((preview, i) => (
                        <div key={i} className="relative">
                          {editFiles[i]?.type.startsWith("image/") ? (
                            <img src={preview} alt={`Preview ${i + 1}`} className="w-full h-24 object-cover rounded border border-gray-200 dark:border-gray-700" />
                          ) : (
                            <div className="w-full h-24 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-700">
                              <p className="text-xs text-gray-500 dark:text-gray-400 text-center px-1">{editFiles[i]?.name}</p>
                            </div>
                          )}
                          <button type="button" onClick={() => removeEditFile(i)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600">x</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSaveEdit} disabled={savingEdit} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm">{savingEdit ? "Saving..." : "Save Changes"}</button>
                  <button onClick={() => { setEditingAttachments(false); setEditFiles([]); setEditFilePreviews([]); setEditRemarks(""); setKeptAttachments([]); }} className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 text-sm">Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}

        {task.locked && (
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Task Approved & Locked</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">This task has been accepted and approved by admin. No further actions allowed.</p>
          </div>
        )}

        {task.status === "REJECTED" && task.rejectReason && (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 p-6 mb-6">
            <h2 className="text-lg font-semibold text-red-800 dark:text-red-300">Work Completion Rejected</h2>
            <p className="text-sm text-red-700 dark:text-red-400">Your work completion request has been rejected. The work submitted was not fulfilled as expected.</p>
            <div className="mt-3 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 rounded-md p-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rejection Reason:</p>
              <p className="text-sm text-red-600 dark:text-red-400">{task.rejectReason}</p>
            </div>
            {task.rejectedBy && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Rejected by: {task.rejectedBy}</p>
            )}
            {task.rejectedAt && (
              <p className="text-xs text-gray-500 dark:text-gray-400">Rejected at: {new Date(task.rejectedAt).toLocaleString()}</p>
            )}
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
            <h2 className="text-lg font-semibold text-green-800 dark:text-green-300">Waiting Approval</h2>
            <p className="text-sm text-green-700 dark:text-green-400">Waiting for admin to accept and approve this task.</p>
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
            {task.completedAttachments && task.completedAttachments.length > 1 && (
              <div className="mt-1 space-y-1">
                {task.completedAttachments.map((att, i) => (
                  <button key={i} onClick={() => openAttachment(att, `${task.name}_completed_${i + 1}`)} className="text-xs text-green-600 dark:text-green-400 underline block">Attachment {i + 1}</button>
                ))}
              </div>
            )}
          </div>
        )}

        {task.extendStatus === "PENDING" && (
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800 p-6 mb-6">
            <h2 className="text-lg font-semibold text-orange-800 dark:text-orange-300">Extension Request Pending</h2>
            <p className="text-sm text-orange-700 dark:text-orange-400">Waiting for admin to approve your extension request.</p>
            {task.extendReason && <p className="text-sm text-orange-600 dark:text-orange-400 mt-1 italic">Reason: {task.extendReason}</p>}
            {task.extendAttachments && task.extendAttachments.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-xs font-medium text-orange-700 dark:text-orange-300">Attached Files:</p>
                {task.extendAttachments.map((att, i) => (
                  <button key={i} onClick={() => openAttachment(att, `${task.name}_extend_${i + 1}`)} className="text-xs text-orange-600 dark:text-orange-400 underline block">File {i + 1}</button>
                ))}
              </div>
            )}
          </div>
        )}

        {task.extendStatus === "REJECTED" && (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 p-6 mb-6">
            <h2 className="text-lg font-semibold text-red-800 dark:text-red-300">Extension Rejected</h2>
            <p className="text-sm text-red-700 dark:text-red-400">Your extension request was rejected by {task.extRejectedBy || "Admin"}.</p>
            {task.extRejectReason && <p className="text-sm text-red-600 dark:text-red-400 mt-1 italic">Reason: {task.extRejectReason}</p>}
          </div>
        )}

        {task.adminRemarks && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-6 mb-6">
            <h2 className="text-lg font-semibold text-blue-800 dark:text-blue-300">Message from Admin</h2>
            <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">{task.adminRemarks}</p>
          </div>
        )}

        {task.reassignReason && (
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800 p-6 mb-6">
            <h2 className="text-lg font-semibold text-orange-800 dark:text-orange-300">Reassigned by {task.reassignedBy || "Admin"}</h2>
            <p className="text-sm text-orange-700 dark:text-orange-400 mt-1 italic">Reason: {task.reassignReason}</p>
          </div>
        )}

        {canAct && task.assignedToId === user?.id && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4 dark:text-white">Take Action</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button onClick={() => setShowCompleteForm(true)} className="bg-green-600 text-white px-4 py-3 rounded-md hover:bg-green-700 font-medium text-sm">
                Complete Task
              </button>
              <button onClick={() => setShowExtendForm(true)} className="bg-orange-500 text-white px-4 py-3 rounded-md hover:bg-orange-600 font-medium text-sm">
                Extend Date
              </button>
            </div>
          </div>
        )}

        {showCompleteForm && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-800 p-6 mb-6">
            <form onSubmit={handleComplete} className="space-y-4">
              <h2 className="text-lg font-semibold dark:text-white">Complete Task</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Provide remarks about your work and optionally attach files (PDF, images, Excel, Word, etc.).</p>
              <textarea value={completeRemarks} onChange={(e) => setCompleteRemarks(e.target.value)} rows={4} className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="Describe what you did to complete this task..." required />

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Attach Files (optional)</label>
                <div className="flex gap-2 flex-wrap">
                  <input ref={completeFileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" />
                  <button type="button" onClick={() => completeFileInputRef.current?.click()} className="bg-blue-500 text-white px-3 py-2 rounded-md hover:bg-blue-600 text-sm">
                    + Add File (Any Type)
                  </button>
                  <input ref={completeCameraInputRef} type="file" accept="image/*" capture="environment" multiple onChange={handleFileSelect} className="hidden" />
                  <button type="button" onClick={() => completeCameraInputRef.current?.click()} className="bg-purple-500 text-white px-3 py-2 rounded-md hover:bg-purple-600 text-sm">
                    Camera
                  </button>
                  <button type="button" onClick={() => setShowVoiceInComplete(!showVoiceInComplete)} className={`px-3 py-2 rounded-md text-sm ${showVoiceInComplete ? "bg-red-500 text-white hover:bg-red-600" : "bg-green-500 text-white hover:bg-green-600"}`}>
                    {showVoiceInComplete ? "Close Voice Note" : "Voice Note"}
                  </button>
                </div>
                {showVoiceInComplete && (
                  <div className="mt-3">
                    <VoiceRecorder taskId={taskId} onSent={() => { setShowVoiceInComplete(false); loadTask(); }} />
                  </div>
                )}
                {completeFiles.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {completeFilePreviews.map((preview, i) => (
                      <div key={i} className="relative">
                        {completeFiles[i]?.type.startsWith("image/") ? (
                          <img src={preview} alt={`Preview ${i + 1}`} className="w-full h-24 object-cover rounded border border-gray-200 dark:border-gray-700" />
                        ) : (
                          <div className="w-full h-24 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-700">
                            <p className="text-xs text-gray-500 dark:text-gray-400 text-center px-1">{completeFiles[i]?.name}</p>
                          </div>
                        )}
                        <button type="button" onClick={() => removeCompleteFile(i)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600">
                          x
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {completeFiles.length > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{completeFiles.length} file(s) selected</p>
                )}
              </div>

              <div className="flex gap-2">
                <button type="submit" disabled={completing} className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50">{completing ? "Submitting..." : "Submit Completion"}</button>
                <button type="button" onClick={() => { setShowCompleteForm(false); setCompleteRemarks(""); setCompleteFiles([]); setCompleteFilePreviews([]); }} className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600">Cancel</button>
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

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Attach Files (optional)</label>
                <div className="flex gap-2 flex-wrap">
                  <input ref={extendFileInputRef} type="file" multiple onChange={handleExtendFileSelect} className="hidden" />
                  <button type="button" onClick={() => extendFileInputRef.current?.click()} className="bg-blue-500 text-white px-3 py-2 rounded-md hover:bg-blue-600 text-sm">
                    + Add File (Any Type)
                  </button>
                  <input ref={extendCameraInputRef} type="file" accept="image/*" capture="environment" multiple onChange={handleExtendFileSelect} className="hidden" />
                  <button type="button" onClick={() => extendCameraInputRef.current?.click()} className="bg-purple-500 text-white px-3 py-2 rounded-md hover:bg-purple-600 text-sm">
                    Camera
                  </button>
                </div>
                {extendFiles.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {extendFilePreviews.map((preview, i) => (
                      <div key={i} className="relative">
                        {extendFiles[i]?.type.startsWith("image/") ? (
                          <img src={preview} alt={`Preview ${i + 1}`} className="w-full h-24 object-cover rounded border border-gray-200 dark:border-gray-700" />
                        ) : (
                          <div className="w-full h-24 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-700">
                            <p className="text-xs text-gray-500 dark:text-gray-400 text-center px-1">{extendFiles[i]?.name}</p>
                          </div>
                        )}
                        <button type="button" onClick={() => removeExtendFile(i)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600">
                          x
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {extendFiles.length > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{extendFiles.length} file(s) selected</p>
                )}
              </div>

              <div className="flex gap-2">
                <button type="submit" disabled={extendSubmitting} className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 disabled:opacity-50">{extendSubmitting ? "Submitting..." : "Submit Request"}</button>
                <button type="button" onClick={() => { setShowExtendForm(false); setExtendDeadline(""); setExtendReason(""); setExtendFiles([]); setExtendFilePreviews([]); }} className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {showVoiceAfterExtend && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-800 p-6 mb-6">
            <h2 className="text-lg font-semibold mb-3 dark:text-white">Send Voice Note with Extension Request</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Optionally record a voice note to send along with your extension request.</p>
            <VoiceRecorder taskId={taskId} onSent={() => { setShowVoiceAfterExtend(false); loadTask(); }} />
            <button onClick={() => setShowVoiceAfterExtend(false)} className="mt-3 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">Skip - No Voice Note</button>
          </div>
        )}

        {task.voiceNoteUrl && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-800 p-6 mb-6">
            <h2 className="text-lg font-semibold mb-3 dark:text-white">Voice Note from Admin</h2>
            <VoicePlayer src={task.voiceNoteUrl} />
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold mb-4 dark:text-white">Task History</h2>
          {task.history && task.history.length > 0 && (
            <div className="mb-4 space-y-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Change Log:</p>
              {task.history.map((h: any, i: number) => (
                <div key={i} className="bg-gray-50 dark:bg-gray-900 rounded-md p-3 border border-gray-100 dark:border-gray-700">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">{h.action}</span>
                    {h.details && <span className="text-gray-500 dark:text-gray-400"> - {h.details}</span>}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {h.performedBy && <span>by {h.performedBy} </span>}
                    {h.date && <span>at {new Date(h.date).toLocaleString()}</span>}
                  </p>
                </div>
              ))}
            </div>
          )}
          <h3 className="text-md font-semibold mb-3 dark:text-white">Submissions ({submissions.length})</h3>
          {submissions.length === 0 && !(task.history && task.history.length > 0) ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm">No history yet.</p>
          ) : submissions.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm">No submissions yet.</p>
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
