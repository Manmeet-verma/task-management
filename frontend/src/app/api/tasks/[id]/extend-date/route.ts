import { NextResponse } from "next/server";
import { db, ref, get, update, push, set } from "@/lib/firebase";
import { verifyAuth } from "@/lib/auth";

async function createNotification(userId: string, message: string, type: string, taskId: string) {
  const notifRef = push(ref(db, "notifications"));
  await set(notifRef, {
    id: notifRef.key,
    userId,
    message,
    type,
    taskId,
    read: false,
    createdAt: new Date().toISOString(),
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = verifyAuth(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { newDeadline, reason } = body;

    const taskRef = ref(db, `tasks/${id}`);
    const snapshot = await get(taskRef);
    if (!snapshot.exists()) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    const task = snapshot.val();
    if (task.assignedToId !== user.id) return NextResponse.json({ error: "Not your task" }, { status: 403 });
    if (task.locked) return NextResponse.json({ error: "Task is locked" }, { status: 400 });
    if (!newDeadline) return NextResponse.json({ error: "New deadline is required" }, { status: 400 });

    await update(taskRef, {
      extendDeadline: newDeadline,
      extendReason: reason || "",
      extendStatus: "PENDING",
      updatedAt: new Date().toISOString(),
    });
    await createNotification(task.createdById, `${user.username} requested deadline extension for "${task.name}" to ${newDeadline}${reason ? `: ${reason}` : ""}`, "EXTEND_REQUEST", id);

    const updated = (await get(taskRef)).val();
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
