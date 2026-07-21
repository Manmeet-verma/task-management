"use client";

import { useState, useEffect, useRef } from "react";
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
  const [assignedToId, setAssignedToId] = useState("");
  const [customSite, setCustomSite] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [taskFile, setTaskFile] = useState<File | null>(null);
  const [taskFilePreview, setTaskFilePreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && (!user || (user.role !== "ADMIN" && user.role !== "USER"))) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      api.users.getAll().then((u) => setUsers(u)).catch(() => {});
      api.categories.getAll().then(setCategories).catch(() => {});
      api.sites.getAll().then(setSites).catch(() => {});
    }
  }, [user]);

  if (loading || !user) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTaskFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setTaskFilePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("category", form.category);
      formData.append("siteProject", form.siteProject === "Others" ? customSite : form.siteProject);
      formData.append("deadline", form.deadline);
      formData.append("priority", form.priority);
      formData.append("description", form.description || "");
      if (assignedToId) formData.append("assignedToId", assignedToId);
      if (taskFile) formData.append("file", taskFile);

      const token = localStorage.getItem("token");
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create task");
      router.push(user.role === "ADMIN" ? "/admin" : "/user");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setSaving(false);
    }
  };

  const redirectBack = () => router.push(user.role === "ADMIN" ? "/admin" : "/user");

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
                {sites.length === 0 && <>
                  <option value="Site A">Site A</option>
                  <option value="Site B">Site B</option>
                  <option value="Head Office">Head Office</option>
                </>}
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assign To (single user) *</label>
            <select value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)} required className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Select user</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.username} ({u.role}{u.isMaster ? " / Master" : ""})</option>
              ))}
              {users.length === 0 && <option value="" disabled>No users available</option>}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Attach File (optional)</label>
            <div className="flex gap-2">
              <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileSelect} className="hidden" />
              <button type="button" onClick={() => fileInputRef.current?.click()} className="bg-blue-500 text-white px-3 py-2 rounded-md hover:bg-blue-600 text-sm">
                Upload PDF/Image
              </button>
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" />
              <button type="button" onClick={() => cameraInputRef.current?.click()} className="bg-purple-500 text-white px-3 py-2 rounded-md hover:bg-purple-600 text-sm">
                Camera
              </button>
            </div>
            {taskFile && (
              <div className="mt-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">Selected: {taskFile.name}</p>
                {taskFilePreview && taskFile.type.startsWith("image/") && (
                  <img src={taskFilePreview} alt="Preview" className="mt-2 max-h-32 rounded border border-gray-200 dark:border-gray-700" />
                )}
                <button type="button" onClick={() => { setTaskFile(null); setTaskFilePreview(""); }} className="text-xs text-red-600 hover:underline mt-1">Remove</button>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50">
              {saving ? "Creating..." : "Create Task"}
            </button>
            <button type="button" onClick={redirectBack} className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
