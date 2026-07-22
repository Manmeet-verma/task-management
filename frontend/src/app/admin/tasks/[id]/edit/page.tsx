"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter, useParams } from "next/navigation";
import { api, type Task, type User, type Category, type Site } from "@/lib/api";
import Navbar from "@/components/Navbar";

export default function EditTaskPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const taskId = params.id as string;
  const [task, setTask] = useState<Task | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [form, setForm] = useState({
    name: "",
    category: "",
    siteProject: "",
    deadline: "",
    priority: "MEDIUM",
    description: "",
    status: "AVAILABLE",
  });
  const [assignedToId, setAssignedToId] = useState<string>("");
  const [customSite, setCustomSite] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role !== "ADMIN")) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (taskId) {
      api.tasks.getById(taskId).then((t) => {
        setTask(t);
        setForm({
          name: t.name,
          category: t.category,
          siteProject: t.siteProject,
          deadline: t.deadline.split("T")[0],
          priority: t.priority,
          description: t.description || "",
          status: t.status,
        });
        setAssignedToId(t.assignedToId || (t.assignedToIds && t.assignedToIds.length > 0 ? t.assignedToIds[0] : ""));
      });
      api.admin.getUsers().then(setUsers).catch(() => {});
      api.categories.getAll().then(setCategories).catch(() => {});
      api.sites.getAll().then(setSites).catch(() => {});
    }
  }, [taskId]);

  if (loading || !user || !task) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const submitData = {
        ...form,
        siteProject: form.siteProject === "Others" ? customSite : form.siteProject,
        description: form.description || "",
        assignedToIds: assignedToId ? [assignedToId] : [],
      };
      await api.tasks.update(taskId, submitData);
      router.push("/admin");
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen dark:bg-gray-900">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6 dark:text-white">Edit Task</h1>
        {error && <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-md mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Task Name *</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category *</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Select category</option>
                {categories.map((c) => (<option key={c.id} value={c.name}>{c.name}</option>))}
                {categories.length === 0 && <>
                  <option value="Development">Development</option>
                  <option value="Design">Design</option>
                </>}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Site *</label>
              <select value={form.siteProject} onChange={(e) => setForm({ ...form, siteProject: e.target.value })} required className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Select site</option>
                {sites.filter(s => s.status === "ACTIVE").map((s) => (<option key={s.id} value={s.name}>{s.name}</option>))}
                {sites.length === 0 && <>
                  <option value="Site A">Site A</option>
                  <option value="Site B">Site B</option>
                  <option value="Head Office">Head Office</option>
                </>}
                <option value="Others">Others</option>
              </select>
            </div>
          </div>
          {form.siteProject === "Others" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Custom Site *</label>
              <input type="text" value={customSite} onChange={(e) => setCustomSite(e.target.value)} required placeholder="Enter site name" className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          )}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Deadline *</label>
              <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} required className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="AVAILABLE">Available</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="PENDING">Pending</option>
                <option value="COMPLETED">Completed</option>
                <option value="VERIFIED">Verified</option>
                <option value="REJECTED">Rejected</option>
                <option value="LOCKED">Locked</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assign To</label>
            <select value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Unassigned (Available)</option>
              {users.filter(u => u.role === "USER").map((u) => (
                <option key={u.id} value={u.id}>{u.username}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50">{saving ? "Saving..." : "Save Changes"}</button>
            <button type="button" onClick={() => router.back()} className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
