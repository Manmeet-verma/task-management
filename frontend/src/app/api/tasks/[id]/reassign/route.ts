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
    const body = await request.json();
    const { assignedToId } = body;

    const taskRef = ref(db, `tasks/${id}`);
    const snapshot = await get(taskRef);
    if (!snapshot.exists()) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    const task = snapshot.val();

    const userSnapshot = await get(ref(db, `users/${user.id}`));
    const userData = userSnapshot.exists() ? userSnapshot.val() : null;
    const isMaster = userData?.isMaster === true;

    if (task.createdById !== user.id && !isMaster) {
      return NextResponse.json({ error: "Only the admin who assigned this task can reassign it" }, { status: 403 });
    }

    const usersSnapshot = await get(ref(db, `users/${assignedToId}`));
    if (!usersSnapshot.exists()) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const oldAssignedId = task.assignedToId;
    await update(taskRef, {
      assignedToId,
      status: "ASSIGNED",
      assignedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await createNotification(assignedToId, `You have been assigned "${task.name}" by admin.`, "ASSIGNED", id);
    if (oldAssignedId && oldAssignedId !== assignedToId) {
      const assignee = usersSnapshot.val();
      await createNotification(oldAssignedId, `"${task.name}" has been reassigned to ${assignee.username}.`, "REASSIGNED", id);
    }

    const updated = (await get(taskRef)).val();
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
