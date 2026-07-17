import { NextResponse } from "next/server";
import { db, ref, get, push, set } from "@/lib/firebase";
import { verifyAuth } from "@/lib/auth";

async function createNotification(userId: string, message: string, type: string, taskId: string) {
  const notifRef = push(ref(db, "notifications"));
  await set(notifRef, {
    id: notifRef.key,
    userId, message, type, taskId,
    read: false,
    createdAt: new Date().toISOString(),
  });
}

export async function GET(request: Request) {
  try {
    const user = verifyAuth(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const snapshot = await get(ref(db, "tasks"));
    if (!snapshot.exists()) return NextResponse.json([]);

    const tasksData = snapshot.val() as Record<string, any>;
    const tasks = Object.values(tasksData);

    const usersSnapshot = await get(ref(db, "users"));
    const users = usersSnapshot.exists() ? (usersSnapshot.val() as Record<string, any>) : {};

    const enriched = tasks.map((task: any) => ({
      ...task,
      createdBy: users[task.createdById] ? { id: task.createdById, username: users[task.createdById].username } : null,
      assignedTo: task.assignedToId && users[task.assignedToId] ? { id: task.assignedToId, username: users[task.assignedToId].username } : null,
    }));
    enriched.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return NextResponse.json(enriched);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = verifyAuth(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "ADMIN") return NextResponse.json({ error: "Admin access required" }, { status: 403 });

    const { name, category, siteProject, deadline, priority, description, assignedToId } = await request.json();
    const newTaskRef = push(ref(db, "tasks"));
    const taskId = newTaskRef.key!;

    const status = assignedToId ? "ASSIGNED" : "AVAILABLE";
    const task: Record<string, any> = {
      id: taskId,
      name,
      category,
      siteProject,
      deadline: new Date(deadline).toISOString(),
      priority: priority || "MEDIUM",
      description,
      status,
      extensionCount: 0,
      locked: false,
      createdById: user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (assignedToId) {
      task.assignedToId = assignedToId;
      task.assignedAt = new Date().toISOString();
      await createNotification(assignedToId, `You have been assigned "${name}" by admin.`, "ASSIGNED", taskId);
    }

    await set(newTaskRef, task);
    return NextResponse.json(task, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
