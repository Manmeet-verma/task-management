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
    const body = await request.json().catch(() => ({}));
    const { reason } = body;

    const taskRef = ref(db, `tasks/${id}`);
    const snapshot = await get(taskRef);
    if (!snapshot.exists()) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    const task = snapshot.val();

    const userSnapshot = await get(ref(db, `users/${user.id}`));
    const userData = userSnapshot.exists() ? userSnapshot.val() : null;
    const isMaster = userData?.isMaster === true;

    if (task.createdById !== user.id && !isMaster) {
      return NextResponse.json({ error: "Only the admin who assigned this task can reject extensions" }, { status: 403 });
    }

    if (task.extendStatus !== "PENDING")
      return NextResponse.json({ error: "No pending extension request" }, { status: 400 });

    const extReason = task.extendReason || "";
    const adminName = userData?.username || "Admin";

    await update(taskRef, {
      extendStatus: "REJECTED",
      lastExtReason: extReason,
      extendDeadline: null,
      extendReason: null,
      extRejectReason: reason || "",
      extRejectedBy: adminName,
      updatedAt: new Date().toISOString(),
    });
    if (task.assignedToId) {
      await createNotification(task.assignedToId, `Your deadline extension request for "${task.name}" has been rejected by ${adminName}.${reason ? ` Reason: ${reason}` : ""}`, "EXTEND_REJECTED", id);
    }

    const updated = (await get(taskRef)).val();
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
