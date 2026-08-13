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
    const taskRef = ref(db, `tasks/${id}`);
    const snapshot = await get(taskRef);
    if (!snapshot.exists()) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    const task = snapshot.val();

    const userSnapshot = await get(ref(db, `users/${user.id}`));
    const userData = userSnapshot.exists() ? userSnapshot.val() : null;
    const isMaster = userData?.isMaster === true;

    if (task.createdById !== user.id && !isMaster) {
      return NextResponse.json({ error: "Only the person who created this task can reject it" }, { status: 403 });
    }

    if (task.status !== "COMPLETED")
      return NextResponse.json({ error: "Task is not in COMPLETED status" }, { status: 400 });

    const body = await request.json();
    const reason = body.reason;
    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: "Rejection reason is required" }, { status: 400 });
    }

    const adminName = userData?.username || "Admin";

    const existingHistory = task.history || [];
    const historyEntry = {
      date: new Date().toISOString(),
      action: "COMPLETION_REJECTED",
      details: `Work completion rejected by ${adminName}. Reason: ${reason.trim()}`,
      performedBy: adminName,
    };

    await update(taskRef, {
      status: "REJECTED",
      rejectReason: reason.trim(),
      rejectedBy: adminName,
      rejectedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      history: [...existingHistory, historyEntry],
    });

    if (task.assignedToId) {
      await createNotification(
        task.assignedToId,
        `Your work completion request for "${task.name}" has been rejected by ${adminName}. Reason: ${reason.trim()}`,
        "COMPLETION_REJECTED",
        id
      );
    }

    const updated = (await get(taskRef)).val();
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
