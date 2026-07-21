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
    let remarks = "";
    let attachmentUrl = "";
    let attachmentType = "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      remarks = (formData.get("remarks") as string) || "";
      const file = formData.get("file") as File | null;
      if (file && file.size > 0) {
        const bytes = await file.arrayBuffer();
        const base64 = Buffer.from(bytes).toString("base64");
        attachmentUrl = `data:${file.type};base64,${base64}`;
        attachmentType = file.type;
      }
    } else {
      const body = await request.json();
      remarks = body.remarks || "";
      attachmentUrl = body.attachmentUrl || "";
      attachmentType = body.attachmentType || "";
    }

    if (!remarks || !remarks.trim()) {
      return NextResponse.json({ error: "Remarks are required" }, { status: 400 });
    }

    const taskRef = ref(db, `tasks/${id}`);
    const snapshot = await get(taskRef);
    if (!snapshot.exists()) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    const task = snapshot.val();
    if (task.assignedToId !== user.id && !(task.assignedToIds || []).includes(user.id)) return NextResponse.json({ error: "Not your task" }, { status: 403 });
    if (task.locked) return NextResponse.json({ error: "Task is locked" }, { status: 400 });
    if (task.status !== "IN_PROGRESS" && task.status !== "ASSIGNED")
      return NextResponse.json({ error: "Task cannot be completed" }, { status: 400 });

    const adminSnapshot = await get(ref(db, `users/${task.createdById}`));
    const adminName = adminSnapshot.exists() ? adminSnapshot.val().username : "Admin";

    const updateData: Record<string, any> = {
      status: "COMPLETED",
      completedRemarks: remarks.trim(),
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (attachmentUrl) {
      updateData.completedAttachmentUrl = attachmentUrl;
      updateData.completedAttachmentType = attachmentType;
    }

    await update(taskRef, updateData);
    await createNotification(
      task.createdById,
      `${user.username} has completed the job "${task.name}". Remarks: "${remarks.trim()}"`,
      "COMPLETED",
      id
    );

    const updated = (await get(taskRef)).val();
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
