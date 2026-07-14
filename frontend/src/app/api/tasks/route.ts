import { NextResponse } from "next/server";
import { db, ref, get, push, set } from "@/lib/firebase";
import { verifyAuth } from "@/lib/auth";

async function enrichTasks(tasks: any[]) {
  const usersSnapshot = await get(ref(db, "users"));
  const users = usersSnapshot.exists() ? (usersSnapshot.val() as Record<string, any>) : {};

  return tasks.map((task) => ({
    ...task,
    createdBy: users[task.createdById]
      ? { id: task.createdById, username: users[task.createdById].username }
      : null,
    assignedTo:
      task.assignedToId && users[task.assignedToId]
        ? { id: task.assignedToId, username: users[task.assignedToId].username }
        : null,
  }));
}

export async function GET(request: Request) {
  try {
    const user = verifyAuth(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tasksRef = ref(db, "tasks");
    const snapshot = await get(tasksRef);

    if (!snapshot.exists()) return NextResponse.json([]);

    const tasksData = snapshot.val() as Record<string, any>;
    const tasks = Object.values(tasksData);
    const enriched = await enrichTasks(tasks);
    enriched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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

    const { name, category, siteProject, deadline, priority, description } = await request.json();
    const newTaskRef = push(ref(db, "tasks"));
    const taskId = newTaskRef.key!;

    const task = {
      id: taskId,
      name,
      category,
      siteProject,
      deadline: new Date(deadline).toISOString(),
      priority: priority || "MEDIUM",
      description,
      status: "AVAILABLE",
      createdById: user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await set(newTaskRef, task);
    return NextResponse.json(task, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
