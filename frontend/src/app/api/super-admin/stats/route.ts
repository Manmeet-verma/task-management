import { NextResponse } from "next/server";
import { db, ref, get } from "@/lib/firebase";
import { verifyAuth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = verifyAuth(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userSnapshot = await get(ref(db, `users/${user.id}`));
    const userData = userSnapshot.exists() ? userSnapshot.val() : null;
    if (user.role !== "ADMIN" || !userData?.isMaster) {
      return NextResponse.json({ error: "Super admin access required" }, { status: 403 });
    }

    const tasksSnapshot = await get(ref(db, "tasks"));
    const usersSnapshot = await get(ref(db, "users"));

    const tasks = tasksSnapshot.exists() ? Object.values(tasksSnapshot.val() as Record<string, any>) : [];
    const users = usersSnapshot.exists() ? Object.values(usersSnapshot.val() as Record<string, any>) : [];

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t: any) => t.status === "COMPLETED").length;
    const allPendingTasks = tasks.filter((t: any) => t.status !== "LOCKED" && t.status !== "VERIFIED" && !t.locked);
    const pendingTasks = allPendingTasks.length;
    const isOverdue = (t: any) => {
      const deadline = new Date(t.deadline);
      return new Date(deadline.getTime() + 24 * 60 * 60 * 1000) < new Date() && t.status !== "COMPLETED" && t.status !== "LOCKED" && t.status !== "VERIFIED";
    };
    const overdueTasks = allPendingTasks.filter((t: any) => t.status !== "COMPLETED" && isOverdue(t) && !t.reassignReason && t.extendStatus !== "PENDING").length;
    const extensionRequests = allPendingTasks.filter((t: any) => t.status !== "COMPLETED" && t.extendStatus === "PENDING").length;
    const inProgressTasks = tasks.filter((t: any) => t.status === "IN_PROGRESS").length;
    const lockedTasks = tasks.filter((t: any) => t.status === "LOCKED").length;

    const totalUsers = users.length;
    const totalAdmins = users.filter((u: any) => u.role === "ADMIN").length;
    const totalRegularUsers = users.filter((u: any) => u.role === "USER").length;

    // Tasks per admin
    const tasksByAdmin: Record<string, { username: string; taskCount: number; completedCount: number }> = {};
    tasks.forEach((t: any) => {
      const adminId = t.createdById;
      if (!tasksByAdmin[adminId]) {
        const admin = users.find((u: any) => u.id === adminId);
        tasksByAdmin[adminId] = { username: admin?.username || "Unknown", taskCount: 0, completedCount: 0 };
      }
      tasksByAdmin[adminId].taskCount++;
      if (t.status === "COMPLETED" || t.status === "LOCKED") {
        tasksByAdmin[adminId].completedCount++;
      }
    });

    return NextResponse.json({
      totalTasks,
      completedTasks,
      pendingTasks,
      inProgressTasks,
      extensionRequests,
      overdueTasks,
      lockedTasks,
      totalUsers,
      totalAdmins,
      totalRegularUsers,
      tasksByAdmin: Object.entries(tasksByAdmin).map(([id, data]) => ({ adminId: id, ...data })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
