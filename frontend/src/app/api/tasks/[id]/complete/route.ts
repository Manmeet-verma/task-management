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

    const { id } = await params;
    const taskRef = ref(db, `tasks/${id}`);
    const snapshot = await get(taskRef);

    if (!snapshot.exists()) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    const task = snapshot.val();
    if (task.assignedToId !== user.id)
      return NextResponse.json({ error: "Not your task" }, { status: 403 });
    if (task.status === "COMPLETED" || task.status === "AVAILABLE")
      return NextResponse.json({ error: "Task cannot be completed in current status" }, { status: 400 });

    await update(taskRef, { status: "COMPLETED", updatedAt: new Date().toISOString() });

    const newSubRef = push(ref(db, "submissions"));
    await set(newSubRef, {
      id: newSubRef.key,
      taskId: id,
      userId: user.id,
      status: "COMPLETED",
      comments: "Task marked as completed by user",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const updated = (await get(taskRef)).val();
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
