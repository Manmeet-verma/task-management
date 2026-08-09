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
  const [taskFiles, setTaskFiles] = useState<File[]>([]);
  const [taskFilePreviews, setTaskFilePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = user?.role === "ADMIN";
  const isUser = user?.role === "USER";

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
    const files = e.target.files;
    if (!files) return;
    const newFiles = Array.from(files);
    setTaskFiles(prev => [...prev, ...newFiles]);
    newFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => setTaskFilePreviews(prev => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const removeTaskFile = (index: number) => {
    setTaskFiles(prev => prev.filter((_, i) => i !== index));
    setTaskFilePreviews(prev => prev.filter((_, i) => i !== index));
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
      for (const file of taskFiles) {
        formData.append("files", file);
      }

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

  const availableUsers = isUser
    ? users.filter(u => u.id !== user.id)
    : user?.isMaster
      ? users.filter(u => u.id !== user.id)
      : users.filter(u => u.role === "USER");

  return (
    <div className="min-h-screen dark:bg-gray-900">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6 dark:text-white">
          {isUser ? "Create New Request" : "Create Task / Request"}
        </h1>
        {error && <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-md mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {isUser ? "Request Name *" : "Task / Request Name *"}
            </label>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {isUser ? "Send Request To *" : "Assign To (User) *"}
            </label>
            <select value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)} required className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">{isUser ? "Select user / admin" : "Select user"}</option>
              {availableUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.username} ({u.role}{u.isMaster ? " / Master" : ""})</option>
              ))}
              {availableUsers.length === 0 && <option value="" disabled>No {isUser ? "users" : "users"} available</option>}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Attach Files (optional)</label>
            <div className="flex gap-2 flex-wrap">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="bg-blue-500 text-white px-3 py-2 rounded-md hover:bg-blue-600 text-sm">
                + Add File (Any Type)
              </button>
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" multiple onChange={handleFileSelect} className="hidden" />
              <button type="button" onClick={() => cameraInputRef.current?.click()} className="bg-purple-500 text-white px-3 py-2 rounded-md hover:bg-purple-600 text-sm">
                Camera
              </button>
            </div>
            {taskFiles.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {taskFilePreviews.map((preview, i) => (
                  <div key={i} className="relative">
                    {taskFiles[i]?.type.startsWith("image/") ? (
                      <img src={preview} alt={`Preview ${i + 1}`} className="w-full h-24 object-cover rounded border border-gray-200 dark:border-gray-700" />
                    ) : (
                      <div className="w-full h-24 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400 text-center px-1">{taskFiles[i]?.name}</p>
                      </div>
                    )}
                    <button type="button" onClick={() => removeTaskFile(i)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600">
                      x
                    </button>
                  </div>
                ))}
              </div>
            )}
            {taskFiles.length > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{taskFiles.length} file(s) selected</p>
            )}
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50">
              {saving ? "Creating..." : isUser ? "Create Request" : "Create Task"}
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
