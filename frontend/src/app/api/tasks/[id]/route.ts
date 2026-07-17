import { NextResponse } from "next/server";
import { db, ref, get, update, remove } from "@/lib/firebase";
import { verifyAuth } from "@/lib/auth";

export async function DELETE(
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

    const userSnapshot = await get(ref(db, `users/${user.id}`));
    const userData = userSnapshot.exists() ? userSnapshot.val() : null;
    const isMaster = userData?.isMaster === true;

    if (task.createdById !== user.id && !isMaster) {
      return NextResponse.json({ error: "Only the admin who assigned this task can delete it" }, { status: 403 });
    }

    await remove(ref(db, `tasks/${id}`));

    const subsSnapshot = await get(ref(db, "submissions"));
    if (subsSnapshot.exists()) {
      const allSubs = subsSnapshot.val() as Record<string, any>;
      for (const [key, sub] of Object.entries(allSubs)) {
        if ((sub as any).taskId === id) {
          await remove(ref(db, `submissions/${key}`));
        }
      }
    }

    return NextResponse.json({ message: "Task deleted" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
