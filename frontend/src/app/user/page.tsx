"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { api, type Task } from "@/lib/api";
import Navbar from "@/components/Navbar";
import TaskCard from "@/components/TaskCard";

export default function UserPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [tab, setTab] = useState<"available" | "mine">("available");
  const [loadingData, setLoadingData] = useState(true);
  const [claimingTaskId, setClaimingTaskId] = useState<string | null>(null);
  const [deadline, setDeadline] = useState("");

  useEffect(() => {
    if (!loading && (!user || user.role !== "USER")) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.role === "USER") {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setLoadingData(true);
    try {
      const [a, m] = await Promise.all([
        api.tasks.getAvailable(),
        api.tasks.getMine(),
      ]);
      setAvailableTasks(a);
      setMyTasks(m);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleClaim = async (id: string) => {
    if (!deadline) {
      alert("Please select your deadline first");
      return;
    }
    try {
      setClaimingTaskId(id);
      await api.tasks.claim(id, deadline);
      setDeadline("");
      setClaimingTaskId(null);
      loadData();
    } catch (err) {
      console.error(err);
      setClaimingTaskId(null);
    }
  };

  if (loading || !user) return null;

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">My Dashboard</h1>

        <div className="flex gap-4 mb-6 border-b border-gray-200">
          <button
            onClick={() => setTab("available")}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              tab === "available"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Available Tasks ({availableTasks.length})
          </button>
          <button
            onClick={() => setTab("mine")}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              tab === "mine"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            My Tasks ({myTasks.length})
          </button>
        </div>

        {loadingData ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : tab === "available" ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {availableTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                action={
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Set Your Deadline
                      </label>
                      <input
                        type="date"
                        value={claimingTaskId === task.id ? deadline : ""}
                        onChange={(e) => {
                          setClaimingTaskId(task.id);
                          setDeadline(e.target.value);
                        }}
                        className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleClaim(task.id);
                      }}
                      disabled={claimingTaskId === task.id && !deadline}
                      className="w-full bg-indigo-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {claimingTaskId === task.id ? "Claiming..." : "Select & Claim"}
                    </button>
                  </div>
                }
              />
            ))}
            {availableTasks.length === 0 && (
              <p className="text-gray-500 col-span-full text-center py-8">
                No available tasks.
              </p>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {myTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                href={`/user/tasks/${task.id}`}
              />
            ))}
            {myTasks.length === 0 && (
              <p className="text-gray-500 col-span-full text-center py-8">
                You haven&apos;t claimed any tasks yet.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
