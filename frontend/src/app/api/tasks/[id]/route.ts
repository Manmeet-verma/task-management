import { NextResponse } from "next/server";
import { db, ref, get, update, remove } from "@/lib/firebase";
import { verifyAuth } from "@/lib/auth";

export async function GET(
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

    const usersSnapshot = await get(ref(db, "users"));
    const users = usersSnapshot.exists() ? (usersSnapshot.val() as Record<string, any>) : {};

    const submissionsSnapshot = await get(ref(db, "submissions"));
    let submissions: any[] = [];
    if (submissionsSnapshot.exists()) {
      submissions = Object.values(submissionsSnapshot.val() as Record<string, any>)
        .filter((s: any) => s.taskId === id)
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map((s: any) => ({
          ...s,
          user: users[s.userId] ? { id: s.userId, username: users[s.userId].username } : null,
        }));
    }

    return NextResponse.json({
      ...task,
      createdBy: users[task.createdById]
        ? { id: task.createdById, username: users[task.createdById].username }
        : null,
      assignedTo:
        task.assignedToId && users[task.assignedToId]
          ? { id: task.assignedToId, username: users[task.assignedToId].username }
          : null,
      submissions,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(
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

    const body = await request.json();
    const updates: Record<string, any> = { updatedAt: new Date().toISOString() };
    if (body.name) updates.name = body.name;
    if (body.category) updates.category = body.category;
    if (body.siteProject) updates.siteProject = body.siteProject;
    if (body.deadline) updates.deadline = new Date(body.deadline).toISOString();
    if (body.priority) updates.priority = body.priority;
    if (body.description) updates.description = body.description;
    if (body.status) updates.status = body.status;

    await update(taskRef, updates);
    const updated = (await get(taskRef)).val();
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = verifyAuth(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "ADMIN") return NextResponse.json({ error: "Admin access required" }, { status: 403 });

    const { id } = await params;
    await remove(ref(db, `tasks/${id}`));
    return NextResponse.json({ message: "Task deleted" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
