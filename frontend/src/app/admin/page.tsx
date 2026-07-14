"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { api, type Task, type Submission } from "@/lib/api";
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
  const [tab, setTab] = useState<"tasks" | "submissions" | "pending">("tasks");
  const [loadingData, setLoadingData] = useState(true);

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
      const [t, s, p] = await Promise.all([
        api.tasks.getAll(),
        api.submissions.getAll(),
        api.tasks.getPending(),
      ]);
      setTasks(t);
      setSubmissions(s);
      setPendingTasks(p);
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

  const handleReview = async (
    id: string,
    action: "accept" | "reject"
  ) => {
    const adminComments =
      action === "reject"
        ? prompt("Reason for rejection:") || ""
        : undefined;
    try {
      await api.submissions.review(id, action, adminComments);
      loadData();
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
          <Link
            href="/admin/tasks/new"
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm"
          >
            + New Task
          </Link>
        </div>

        <div className="flex gap-4 mb-6 border-b border-gray-200">
          <button
            onClick={() => setTab("tasks")}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              tab === "tasks"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Tasks ({tasks.length})
          </button>
          <button
            onClick={() => setTab("submissions")}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              tab === "submissions"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Submissions ({submissions.length})
          </button>
          <button
            onClick={() => setTab("pending")}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              tab === "pending"
                ? "border-orange-600 text-orange-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Pending ({pendingTasks.length})
          </button>
        </div>

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
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleDelete(task.id);
                    }}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                }
              />
            ))}
            {tasks.length === 0 && (
              <p className="text-gray-500 col-span-full text-center py-8">
                No tasks yet.
              </p>
            )}
          </div>
        ) : tab === "submissions" ? (
          <div className="space-y-4">
            {submissions.map((sub) => (
              <div
                key={sub.id}
                className="bg-white border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {sub.task?.name || "Unknown Task"}
                    </p>
                    <p className="text-sm text-gray-500">
                      Submitted by: {sub.user?.username}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(sub.createdAt).toLocaleString()}
                    </p>
                    {sub.comments && (
                      <p className="text-sm text-gray-600 mt-1">
                        Comment: {sub.comments}
                      </p>
                    )}
                    {sub.reportUrl && (
                      <a
                        href={sub.reportUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-indigo-600 hover:underline mt-1 inline-block"
                      >
                        View Report
                      </a>
                    )}
                    {sub.adminComments && (
                      <p className="text-sm text-gray-600 mt-1">
                        Admin note: {sub.adminComments}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={sub.status} />
                </div>
                {sub.status === "SUBMITTED" && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleReview(sub.id, "accept")}
                      className="bg-emerald-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-emerald-700"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleReview(sub.id, "reject")}
                      className="bg-red-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-red-700"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
            {submissions.length === 0 && (
              <p className="text-gray-500 text-center py-8">
                No submissions yet.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {pendingTasks.map((task) => (
              <div
                key={task.id}
                className="bg-orange-50 border border-orange-200 rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{task.name}</p>
                    <p className="text-sm text-gray-500">
                      Assigned to: {task.assignedTo?.username || "Unassigned"}
                    </p>
                    <p className="text-sm text-gray-500">
                      Deadline: {new Date(task.deadline).toLocaleDateString()}
                    </p>
                    {task.userDeadline && (
                      <p className="text-sm text-gray-500">
                        User Deadline:{" "}
                        {new Date(task.userDeadline).toLocaleDateString()}
                      </p>
                    )}
                    {task.submissions && task.submissions.length > 0 && (
                      <div className="mt-2">
                        {task.submissions
                          .filter((s) => s.status === "PENDING_RESUBMIT")
                          .map((sub) => (
                            <p
                              key={sub.id}
                              className="text-sm text-orange-700 italic"
                            >
                              Reason: {sub.pendingReason}
                            </p>
                          ))}
                      </div>
                    )}
                  </div>
                  <StatusBadge status={task.status} />
                </div>
              </div>
            ))}
            {pendingTasks.length === 0 && (
              <p className="text-gray-500 text-center py-8">
                No pending tasks.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
