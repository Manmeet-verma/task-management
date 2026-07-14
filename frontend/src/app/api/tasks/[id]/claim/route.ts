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
    const body = await request.json();
    const { userDeadline } = body;

    const taskRef = ref(db, `tasks/${id}`);
    const snapshot = await get(taskRef);

    if (!snapshot.exists()) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    const task = snapshot.val();
    if (task.status !== "AVAILABLE")
      return NextResponse.json({ error: "Task is not available" }, { status: 400 });

    const updates: Record<string, any> = {
      assignedToId: user.id,
      status: "IN_PROGRESS",
      updatedAt: new Date().toISOString(),
    };
    if (userDeadline) updates.userDeadline = new Date(userDeadline).toISOString();

    await update(taskRef, updates);
    const updated = (await get(taskRef)).val();
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
