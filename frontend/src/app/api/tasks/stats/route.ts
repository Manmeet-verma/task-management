import { NextResponse } from "next/server";
import { db, ref, get } from "@/lib/firebase";
import { verifyAuth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = verifyAuth(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tasksSnapshot = await get(ref(db, "tasks"));
    if (!tasksSnapshot.exists()) {
      return NextResponse.json({
        totalTasks: 0, completedTasks: 0, pendingTasks: 0,
        inProgressTasks: 0, extensionRequests: 0, overdueTasks: 0,
      });
    }

    const tasks = Object.values(tasksSnapshot.val() as Record<string, any>);
    const now = new Date();

    const stats = {
      totalTasks: tasks.length,
      completedTasks: tasks.filter((t: any) => t.status === "COMPLETED" || t.status === "LOCKED").length,
      pendingTasks: tasks.filter((t: any) => t.status === "PENDING").length,
      inProgressTasks: tasks.filter((t: any) => t.status === "IN_PROGRESS" || t.status === "ASSIGNED").length,
      extensionRequests: tasks.filter((t: any) => t.extendStatus === "PENDING").length,
      overdueTasks: tasks.filter((t: any) => new Date(t.deadline) < now && t.status !== "COMPLETED" && t.status !== "LOCKED").length,
    };

    return NextResponse.json(stats);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
