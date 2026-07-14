import { NextResponse } from "next/server";
import { db, ref, get, update } from "@/lib/firebase";
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
    if (task.status !== "ACCEPTED")
      return NextResponse.json({ error: "Task must be accepted by admin first" }, { status: 400 });

    await update(taskRef, { status: "COMPLETED", updatedAt: new Date().toISOString() });
    const updated = (await get(taskRef)).val();
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
