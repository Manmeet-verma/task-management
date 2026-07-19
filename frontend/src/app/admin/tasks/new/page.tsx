"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { api, type User, type Category, type Site } from "@/lib/api";
import Navbar from "@/components/Navbar";

export default function NewTaskPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
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
  });
  const [assignedToIds, setAssignedToIds] = useState<string[]>([]);
  const [customSite, setCustomSite] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.role === "ADMIN") {
      api.admin.getUsers().then((u) => setUsers(u)).catch(() => {});
      api.categories.getAll().then(setCategories).catch(() => {});
      api.sites.getAll().then(setSites).catch(() => {});
    }
  }, [user]);

  if (loading || !user) return null;

  const toggleUser = (userId: string) => {
    setAssignedToIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const submitData = {
        ...form,
        siteProject: form.siteProject === "Others" ? customSite : form.siteProject,
        description: form.description || "",
        assignedToIds,
      };
      await api.tasks.create(submitData);
      router.push("/admin");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen dark:bg-gray-900">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6 dark:text-white">Create New Task</h1>
        {error && <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-md mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Task Name *</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category *</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
              {categories.length === 0 && <>
                <option value="Development">Development</option>
                <option value="Design">Design</option>
                <option value="Documentation">Documentation</option>
                <option value="Repair">Repair</option>
                <option value="Testing">Testing</option>
              </>}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Site *</label>
              <select value={form.siteProject} onChange={(e) => setForm({ ...form, siteProject: e.target.value })} required className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Select site</option>
                {sites.filter(s => s.status === "ACTIVE").map((s) => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
                {sites.length === 0 && (
                  <>
                    <option value="Site A">Site A</option>
                    <option value="Site B">Site B</option>
                    <option value="Head Office">Head Office</option>
                  </>
                )}
                <option value="Others">Others</option>
              </select>
            </div>
            {form.siteProject === "Others" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Custom Site *</label>
                <input type="text" value={customSite} onChange={(e) => setCustomSite(e.target.value)} required placeholder="Enter site name" className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
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
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (optional)</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Assign Users (click to toggle)</label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-3">
              {users.filter(u => u.role === "USER").map((u) => (
                <label key={u.id} className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${assignedToIds.includes(u.id) ? "bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-400" : "hover:bg-gray-100 dark:hover:bg-gray-700 border border-transparent"}`}>
                  <input type="checkbox" checked={assignedToIds.includes(u.id)} onChange={() => toggleUser(u.id)} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                  <span className="text-sm dark:text-white">{u.username}</span>
                </label>
              ))}
              {users.filter(u => u.role === "USER").length === 0 && <p className="text-sm text-gray-400 col-span-2">No users available</p>}
            </div>
            {assignedToIds.length > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{assignedToIds.length} user(s) selected</p>
            )}
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50">
              {saving ? "Creating..." : "Create Task"}
            </button>
            <button type="button" onClick={() => router.back()} className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
