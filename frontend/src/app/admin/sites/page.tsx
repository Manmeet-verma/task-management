"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { api, type Site } from "@/lib/api";
import Navbar from "@/components/Navbar";
import Link from "next/link";

export default function AdminSitesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sites, setSites] = useState<Site[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [newSite, setNewSite] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    if (!loading && (!user || user.role !== "ADMIN")) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.role === "ADMIN") loadSites();
  }, [user]);

  const loadSites = async () => {
    setLoadingData(true);
    try {
      const data = await api.sites.getAll();
      setSites(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleAdd = async () => {
    if (!newSite.trim()) return;
    try {
      await api.sites.create({ name: newSite.trim() });
      setNewSite("");
      loadSites();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed");
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await api.sites.update(id, { name: editName.trim() });
      setEditingId(null);
      setEditName("");
      loadSites();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this site?")) return;
    try {
      await api.sites.delete(id);
      loadSites();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed");
    }
  };

  const handleToggleStatus = async (site: Site) => {
    const newStatus = site.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await api.sites.update(site.id, { status: newStatus });
      loadSites();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed");
    }
  };

  if (loading || !user) return null;

  return (
    <div className="min-h-screen dark:bg-gray-900">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold dark:text-white">Manage Sites</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Create and manage sites for task assignment
            </p>
          </div>
          <Link
            href="/admin"
            className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 text-sm"
          >
            Back to Admin
          </Link>
        </div>

        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={newSite}
            onChange={(e) => setNewSite(e.target.value)}
            placeholder="New site name..."
            className="flex-1 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <button onClick={handleAdd} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm">
            Add Site
          </button>
        </div>

        {loadingData ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading...</div>
        ) : sites.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">No sites yet. Add one above.</p>
        ) : (
          <div className="space-y-2">
            {sites.map((site) => (
              <div
                key={site.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex-1">
                  {editingId === site.id ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 bg-white dark:bg-gray-700 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        onKeyDown={(e) => e.key === "Enter" && handleUpdate(site.id)}
                        autoFocus
                      />
                      <button onClick={() => handleUpdate(site.id)} className="text-xs bg-indigo-600 text-white px-3 py-1 rounded">Save</button>
                      <button onClick={() => { setEditingId(null); setEditName(""); }} className="text-xs text-gray-500 px-2">Cancel</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="font-medium dark:text-white">{site.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${site.status === "ACTIVE" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"}`}>
                        {site.status}
                      </span>
                      <p className="text-xs text-gray-400">Created: {new Date(site.createdAt).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
                {editingId !== site.id && (
                  <div className="flex gap-2 ml-4">
                    <button onClick={() => handleToggleStatus(site)} className={`text-xs px-3 py-1 rounded ${site.status === "ACTIVE" ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300" : "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300"}`}>
                      {site.status === "ACTIVE" ? "Deactivate" : "Activate"}
                    </button>
                    <button onClick={() => { setEditingId(site.id); setEditName(site.name); }} className="text-sm text-indigo-600 hover:text-indigo-800">Edit</button>
                    <button onClick={() => handleDelete(site.id)} className="text-sm text-red-600 hover:text-red-800">Delete</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
