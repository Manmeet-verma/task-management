import { NextResponse } from "next/server";
import { db, ref, get, update, push, set } from "@/lib/firebase";
import { verifyAuth } from "@/lib/auth";

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
    const { reason } = body;

    const taskRef = ref(db, `tasks/${id}`);
    const snapshot = await get(taskRef);

    if (!snapshot.exists()) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    const task = snapshot.val();
    if (task.status !== "IN_PROGRESS")
      return NextResponse.json({ error: "Task is not in review" }, { status: 400 });
    if (!reason)
      return NextResponse.json({ error: "Rejection reason is required" }, { status: 400 });

    await update(taskRef, { status: "REJECTED", rejectReason: reason, updatedAt: new Date().toISOString() });

    const newSubRef = push(ref(db, "submissions"));
    await set(newSubRef, {
      id: newSubRef.key,
      taskId: id,
      userId: task.assignedToId,
      status: "REJECTED",
      adminComments: reason,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const updated = (await get(taskRef)).val();
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
