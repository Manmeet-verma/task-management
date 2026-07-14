import { NextResponse } from "next/server";
import { db, ref, get } from "@/lib/firebase";
import { verifyAuth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = verifyAuth(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "ADMIN") return NextResponse.json({ error: "Admin access required" }, { status: 403 });

    const tasksRef = ref(db, "tasks");
    const snapshot = await get(tasksRef);

    if (!snapshot.exists()) return NextResponse.json([]);

    const tasksData = snapshot.val() as Record<string, any>;
    const tasks = Object.values(tasksData).filter((t: any) => t.status === "PENDING_RESUBMIT");

    const usersSnapshot = await get(ref(db, "users"));
    const users = usersSnapshot.exists() ? (usersSnapshot.val() as Record<string, any>) : {};

    const submissionsSnapshot = await get(ref(db, "submissions"));
    const allSubs = submissionsSnapshot.exists()
      ? Object.values(submissionsSnapshot.val() as Record<string, any>)
      : [];

    const enriched = tasks.map((task: any) => {
      const taskSubs = allSubs
        .filter((s: any) => s.taskId === task.id && s.status === "PENDING_RESUBMIT")
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return {
        ...task,
        createdBy: users[task.createdById]
          ? { id: task.createdById, username: users[task.createdById].username }
          : null,
        assignedTo:
          task.assignedToId && users[task.assignedToId]
            ? { id: task.assignedToId, username: users[task.assignedToId].username }
            : null,
        submissions: taskSubs,
      };
    });

    enriched.sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return NextResponse.json(enriched);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
