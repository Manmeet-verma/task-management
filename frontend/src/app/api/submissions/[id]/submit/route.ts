import { NextResponse } from "next/server";
import { db, ref, get, push, set, update } from "@/lib/firebase";
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
    const taskSnapshot = await get(taskRef);
    if (!taskSnapshot.exists())
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    const task = taskSnapshot.val();

    if (task.assignedToId !== user.id)
      return NextResponse.json({ error: "Not your task" }, { status: 403 });
    if (
      task.status !== "IN_PROGRESS" &&
      task.status !== "REWORK" &&
      task.status !== "PENDING_RESUBMIT"
    ) {
      return NextResponse.json(
        { error: "Task cannot be submitted in current status" },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const comments = (formData.get("comments") as string) || "";
    const file = formData.get("report") as File | null;

    let reportUrl: string | null = null;
    if (file) {
      const bytes = await file.arrayBuffer();
      const base64 = Buffer.from(bytes).toString("base64");
      reportUrl = `data:${file.type};base64,${base64}`;
    }

    const newSubRef = push(ref(db, "submissions"));
    const submission = {
      id: newSubRef.key,
      taskId: id,
      userId: user.id,
      reportUrl,
      comments,
      status: "SUBMITTED",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await set(newSubRef, submission);
    await update(taskRef, {
      status: "SUBMITTED",
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json(submission);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
