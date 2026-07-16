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
  const [comments, setComments] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingReason, setPendingReason] = useState("");
  const [showPendingForm, setShowPendingForm] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [pendingSubmitting, setPendingSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role !== "USER")) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (taskId && user) {
      loadTask();
    }
  }, [taskId, user]);

  const loadTask = async () => {
    try {
      const [t, s] = await Promise.all([
        api.tasks.getById(taskId),
        api.submissions.getByTask(taskId),
      ]);
      setTask(t);
      setSubmissions(s);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formData = new FormData();
      if (file) formData.append("report", file);
      if (comments) formData.append("comments", comments);
      await api.submissions.submit(taskId, formData);
      setComments("");
      setFile(null);
      loadTask();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async () => {
    if (!confirm("Are you sure you want to mark this task as completed?")) return;
    setCompleting(true);
    try {
      await api.tasks.complete(taskId);
      loadTask();
    } catch (err) {
      console.error(err);
    } finally {
      setCompleting(false);
    }
  };

  const handlePendingResubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingReason.trim()) {
      alert("Please provide a reason");
      return;
    }
    setPendingSubmitting(true);
    try {
      await api.tasks.pendingResubmit(taskId, pendingReason);
      setPendingReason("");
      setShowPendingForm(false);
      loadTask();
    } catch (err) {
      console.error(err);
    } finally {
      setPendingSubmitting(false);
    }
  };

  if (loading || !user || !task) return null;

  const isCompleted = task.status === "COMPLETED";

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <button
          onClick={() => router.back()}
          className="text-sm text-indigo-600 hover:underline mb-4 inline-block"
        >
          &larr; Back
        </button>

        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <h1 className="text-2xl font-bold">{task.name}</h1>
            <StatusBadge status={task.status} />
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
            <p>
              <span className="font-medium">Category:</span> {task.category}
            </p>
            <p>
              <span className="font-medium">Project:</span> {task.siteProject}
            </p>
            <p>
              <span className="font-medium">Deadline:</span>{" "}
              {new Date(task.deadline).toLocaleDateString()}
            </p>
            {task.userDeadline && (
              <p>
                <span className="font-medium">Your Deadline:</span>{" "}
                {new Date(task.userDeadline).toLocaleDateString()}
              </p>
            )}
            <p>
              <span className="font-medium">Priority:</span> {task.priority}
            </p>
            <p>
              <span className="font-medium">Created by:</span>{" "}
              {task.createdBy?.username}
            </p>
          </div>
          <p className="text-gray-700">{task.description}</p>
        </div>

        {!isCompleted && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Take Action</h2>
            <p className="text-sm text-gray-600 mb-4">
              Choose an option for this task:
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleComplete}
                disabled={completing}
                className="flex-1 bg-emerald-600 text-white px-4 py-3 rounded-md hover:bg-emerald-700 disabled:opacity-50 font-medium"
              >
                {completing ? "Completing..." : "Complete"}
              </button>
              <button
                onClick={() => setShowPendingForm(true)}
                className="flex-1 bg-orange-500 text-white px-4 py-3 rounded-md hover:bg-orange-600 font-medium"
              >
                Pending
              </button>
            </div>
          </div>
        )}

        {isCompleted && (
          <div className="bg-emerald-50 rounded-lg border border-emerald-200 p-6 mb-6">
            <h2 className="text-lg font-semibold mb-2 text-emerald-800">Task Completed!</h2>
            <p className="text-sm text-emerald-700">This task has been marked as completed.</p>
          </div>
        )}

        {showPendingForm && (
          <div className="bg-white rounded-lg border border-orange-200 p-6 mb-6">
            <form onSubmit={handlePendingResubmit} className="space-y-4">
              <h2 className="text-lg font-semibold">Why is this pending?</h2>
              <textarea
                value={pendingReason}
                onChange={(e) => setPendingReason(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Explain why this task is pending..."
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={pendingSubmitting}
                  className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 disabled:opacity-50"
                >
                  {pendingSubmitting ? "Submitting..." : "Submit Pending"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPendingForm(false);
                    setPendingReason("");
                  }}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">
            Submission History ({submissions.length})
          </h2>
          {submissions.length === 0 ? (
            <p className="text-gray-500 text-sm">No submissions yet.</p>
          ) : (
            <div className="space-y-4">
              {submissions.map((sub) => (
                <div
                  key={sub.id}
                  className="border border-gray-100 rounded-md p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm text-gray-500">
                      {new Date(sub.createdAt).toLocaleString()}
                    </p>
                    <StatusBadge status={sub.status} />
                  </div>
                  {sub.comments && (
                    <p className="text-sm text-gray-700 mb-1">
                      {sub.comments}
                    </p>
                  )}
                  {sub.reportUrl && (
                    <a
                      href={sub.reportUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-indigo-600 hover:underline"
                    >
                      View Report
                    </a>
                  )}
                  {sub.adminComments && (
                    <p className="text-sm text-gray-500 mt-1 italic">
                      Admin: {sub.adminComments}
                    </p>
                  )}
                  {sub.pendingReason && (
                    <p className="text-sm text-orange-600 mt-1 italic">
                      Pending reason: {sub.pendingReason}
                    </p>
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
