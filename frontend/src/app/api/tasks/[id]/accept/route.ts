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
    if (user.role !== "ADMIN") return NextResponse.json({ error: "Admin access required" }, { status: 403 });

    const { id } = await params;
    const taskRef = ref(db, `tasks/${id}`);
    const snapshot = await get(taskRef);

    if (!snapshot.exists()) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    const task = snapshot.val();
    if (task.status !== "IN_PROGRESS")
      return NextResponse.json({ error: "Task is not in review" }, { status: 400 });

    await update(taskRef, { status: "ACCEPTED", updatedAt: new Date().toISOString() });

    const updated = (await get(taskRef)).val();
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
