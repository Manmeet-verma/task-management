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
    const { reason } = body;

    const taskRef = ref(db, `tasks/${id}`);
    const snapshot = await get(taskRef);
    if (!snapshot.exists()) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    const task = snapshot.val();
    if (task.assignedToId !== user.id && !(task.assignedToIds || []).includes(user.id)) return NextResponse.json({ error: "Not your task" }, { status: 403 });
    if (task.locked) return NextResponse.json({ error: "Task is locked" }, { status: 400 });
    if (!reason) return NextResponse.json({ error: "Reason is required" }, { status: 400 });

    await update(taskRef, { status: "PENDING", pendingReason: reason, updatedAt: new Date().toISOString() });
    await createNotification(task.createdById, `${user.username} marked "${task.name}" as pending: ${reason}`, "PENDING", id);

    const updated = (await get(taskRef)).val();
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
