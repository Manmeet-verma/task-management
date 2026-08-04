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
    const contentType = request.headers.get("content-type") || "";

    let newDeadline = "";
    let reason = "";
    const extendAttachments: string[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      newDeadline = (formData.get("newDeadline") as string) || "";
      reason = (formData.get("reason") as string) || "";

      const files = formData.getAll("files") as File[];
      for (const file of files) {
        if (file && file.size > 0) {
          const bytes = await file.arrayBuffer();
          const base64 = Buffer.from(bytes).toString("base64");
          extendAttachments.push(`data:${file.type};base64,${base64}`);
        }
      }
    } else {
      const body = await request.json();
      newDeadline = body.newDeadline || "";
      reason = body.reason || "";
    }

    const taskRef = ref(db, `tasks/${id}`);
    const snapshot = await get(taskRef);
    if (!snapshot.exists()) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    const task = snapshot.val();
    if (task.assignedToId !== user.id && !(task.assignedToIds || []).includes(user.id)) return NextResponse.json({ error: "Not your task" }, { status: 403 });
    if (task.locked || task.status === "LOCKED") return NextResponse.json({ error: "Task is locked" }, { status: 400 });
    if (task.status === "COMPLETED") return NextResponse.json({ error: "Cannot request extension on completed task" }, { status: 400 });
    if (!newDeadline) return NextResponse.json({ error: "New deadline is required" }, { status: 400 });

    const updateData: Record<string, any> = {
      extendDeadline: newDeadline,
      extendReason: reason || "",
      extendStatus: "PENDING",
      updatedAt: new Date().toISOString(),
    };

    if (extendAttachments.length > 0) {
      updateData.extendAttachments = extendAttachments;
    }

    const existingHistory = task.history || [];
    const historyEntry = {
      date: new Date().toISOString(),
      action: "EXTEND_REQUEST",
      details: `Extension requested to ${newDeadline}${reason ? `. Reason: ${reason}` : ""}`,
      performedBy: user.username,
    };
    updateData.history = [...existingHistory, historyEntry];

    await update(taskRef, updateData);
    await createNotification(task.createdById, `${user.username} requested deadline extension for "${task.name}" to ${newDeadline}${reason ? `: ${reason}` : ""}`, "EXTEND_REQUEST", id);

    const updated = (await get(taskRef)).val();
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
