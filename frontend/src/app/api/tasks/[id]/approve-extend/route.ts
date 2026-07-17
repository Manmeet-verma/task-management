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
    if (user.role !== "ADMIN") return NextResponse.json({ error: "Admin access required" }, { status: 403 });

    const { id } = await params;
    const taskRef = ref(db, `tasks/${id}`);
    const snapshot = await get(taskRef);
    if (!snapshot.exists()) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    const task = snapshot.val();
    if (task.extendStatus !== "PENDING")
      return NextResponse.json({ error: "No pending extension request" }, { status: 400 });

    const newCount = (task.extensionCount || 0) + 1;
    const extReason = task.extendReason || "";
    const extDeadline = task.extendDeadline;

    await update(taskRef, {
      deadline: extDeadline,
      extensionCount: newCount,
      extendStatus: "APPROVED",
      lastExtReason: extReason,
      extendDeadline: null,
      extendReason: null,
      updatedAt: new Date().toISOString(),
    });
    if (task.assignedToId) {
      await createNotification(task.assignedToId, `Your deadline extension for "${task.name}" has been approved. New deadline: ${extDeadline}`, "EXTEND_APPROVED", id);
    }

    const updated = (await get(taskRef)).val();
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
