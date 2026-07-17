"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter, useParams } from "next/navigation";
import { api, type Task, type Submission } from "@/lib/api";
import Navbar from "@/components/Navbar";
import StatusBadge from "@/components/StatusBadge";

export default function TaskDetailPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const taskId = params.id as string;
  const [task, setTask] = useState<Task | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [pendingReason, setPendingReason] = useState("");
  const [showPendingForm, setShowPendingForm] = useState(false);
  const [showExtendForm, setShowExtendForm] = useState(false);
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [completeRemarks, setCompleteRemarks] = useState("");
  const [extendDeadline, setExtendDeadline] = useState("");
  const [extendReason, setExtendReason] = useState("");
  const [completing, setCompleting] = useState(false);
  const [pendingSubmitting, setPendingSubmitting] = useState(false);
  const [extendSubmitting, setExtendSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role !== "USER")) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (taskId && user) loadTask();
  }, [taskId, user]);

  const loadTask = async () => {
    try {
      const [t, s] = await Promise.all([api.tasks.getById(taskId), api.submissions.getByTask(taskId)]);
      setTask(t);
      setSubmissions(s);
    } catch (err) { console.error(err); }
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completeRemarks.trim()) { alert("Please provide remarks"); return; }
    setCompleting(true);
    try {
      await api.tasks.complete(taskId, completeRemarks.trim());
      setCompleteRemarks("");
      setShowCompleteForm(false);
      loadTask();
    } catch (err) { console.error(err); }
    finally { setCompleting(false); }
  };

  const handlePending = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingReason.trim()) { alert("Please provide a reason"); return; }
    setPendingSubmitting(true);
    try { await api.tasks.pending(taskId, pendingReason); setPendingReason(""); setShowPendingForm(false); loadTask(); } catch (err) { console.error(err); }
    finally { setPendingSubmitting(false); }
  };

  const handleExtend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extendDeadline) { alert("Please select a new deadline"); return; }
    setExtendSubmitting(true);
    try { await api.tasks.extendDate(taskId, extendDeadline, extendReason); setExtendDeadline(""); setExtendReason(""); setShowExtendForm(false); loadTask(); } catch (err) { console.error(err); }
    finally { setExtendSubmitting(false); }
  };

  if (loading || !user || !task) return null;

  const canAct = !task.locked && task.status !== "COMPLETED" && task.status !== "LOCKED" && task.status !== "REJECTED" && task.status !== "PENDING";

  return (
    <div className="min-h-screen dark:bg-gray-900">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <button onClick={() => router.back()} className="text-sm text-indigo-600 hover:underline mb-4">&larr; Back</button>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <h1 className="text-2xl font-bold dark:text-white">{task.name}</h1>
            <StatusBadge status={task.status} />
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
            <p><span className="font-medium">Category:</span> {task.category}</p>
            <p><span className="font-medium">Site:</span> {task.siteProject}</p>
            <p><span className="font-medium">Deadline:</span> {new Date(task.deadline).toLocaleDateString()}</p>
            {task.userDeadline && <p><span className="font-medium">Your Deadline:</span> {new Date(task.userDeadline).toLocaleDateString()}</p>}
            <p><span className="font-medium">Priority:</span> {task.priority}</p>
            {task.extensionCount > 0 && <p className="text-red-600 dark:text-red-400"><span className="font-medium">Extensions:</span> {task.extensionCount}</p>}
          </div>
          {task.description && <p className="text-gray-700 dark:text-gray-300">{task.description}</p>}
        </div>

        {task.locked && (
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Task Locked</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">This task is locked. No further actions allowed.</p>
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
          </div>
        )}

        {canAct && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4 dark:text-white">Take Action</h2>
            <div className="grid grid-cols-3 gap-4">
              <button onClick={() => setShowCompleteForm(true)} className="bg-green-600 text-white px-4 py-3 rounded-md hover:bg-green-700 font-medium text-sm">
                Complete
              </button>
              <button onClick={() => setShowExtendForm(true)} className="bg-orange-500 text-white px-4 py-3 rounded-md hover:bg-orange-600 font-medium text-sm">
                Extend Date
              </button>
              <button onClick={() => setShowPendingForm(true)} className="bg-yellow-500 text-white px-4 py-3 rounded-md hover:bg-yellow-600 font-medium text-sm">
                Pending
              </button>
            </div>
          </div>
        )}

        {showCompleteForm && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-800 p-6 mb-6">
            <form onSubmit={handleComplete} className="space-y-4">
              <h2 className="text-lg font-semibold dark:text-white">Complete Task</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Please provide remarks about the action you have taken on this task.</p>
              <textarea value={completeRemarks} onChange={(e) => setCompleteRemarks(e.target.value)} rows={4} className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="Describe what you did to complete this task..." required />
              <div className="flex gap-2">
                <button type="submit" disabled={completing} className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50">{completing ? "Completing..." : "Submit & Complete"}</button>
                <button type="button" onClick={() => { setShowCompleteForm(false); setCompleteRemarks(""); }} className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {showPendingForm && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-yellow-200 dark:border-yellow-800 p-6 mb-6">
            <form onSubmit={handlePending} className="space-y-4">
              <h2 className="text-lg font-semibold dark:text-white">Why is this pending?</h2>
              <textarea value={pendingReason} onChange={(e) => setPendingReason(e.target.value)} rows={3} className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500" placeholder="Explain why this task is pending..." />
              <div className="flex gap-2">
                <button type="submit" disabled={pendingSubmitting} className="bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600 disabled:opacity-50">{pendingSubmitting ? "Submitting..." : "Submit"}</button>
                <button type="button" onClick={() => { setShowPendingForm(false); setPendingReason(""); }} className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600">Cancel</button>
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
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
