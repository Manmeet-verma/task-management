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
      const allSubs = submissionsSnapshot.val() as Record<string, any>;
      submissions = Object.values(allSubs)
        .filter((s: any) => s.taskId === id)
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map((s: any) => ({
          ...s,
          user: users[s.userId] ? { id: s.userId, username: users[s.userId].username } : null,
        }));
    }

    const assignedToIds = task.assignedToIds || [];
    const assignedToUsers = assignedToIds
      .map((uid: string) => (users[uid] ? { id: uid, username: users[uid].username } : null))
      .filter(Boolean);

    return NextResponse.json({
      ...task,
      createdBy: users[task.createdById] ? { id: task.createdById, username: users[task.createdById].username } : null,
      assignedTo: task.assignedToId && users[task.assignedToId] ? { id: task.assignedToId, username: users[task.assignedToId].username } : null,
      assignedToUsers,
      assignedByName: users[task.createdById] ? users[task.createdById].username : null,
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

    const task = snapshot.val();
    const userSnapshot = await get(ref(db, `users/${user.id}`));
    const userData = userSnapshot.exists() ? userSnapshot.val() : null;
    const isMaster = userData?.isMaster === true;

    if (task.createdById !== user.id && !isMaster) {
      return NextResponse.json({ error: "Only the admin who assigned this task can edit it" }, { status: 403 });
    }

    const body = await request.json();
    const updates: Record<string, any> = { updatedAt: new Date().toISOString() };

    if (body.name !== undefined) updates.name = body.name;
    if (body.category !== undefined) updates.category = body.category;
    if (body.siteProject !== undefined) updates.siteProject = body.siteProject;
    if (body.deadline !== undefined) updates.deadline = new Date(body.deadline).toISOString();
    if (body.priority !== undefined) updates.priority = body.priority;
    if (body.description !== undefined) updates.description = body.description;
    if (body.status !== undefined) updates.status = body.status;

    if (body.assignedToIds !== undefined) {
      updates.assignedToIds = body.assignedToIds;
      updates.assignedToId = body.assignedToIds.length > 0 ? body.assignedToIds[0] : null;
      const currentTask = snapshot.val();
      if (body.assignedToIds.length > 0 && (!currentTask.assignedToId || currentTask.status === "AVAILABLE")) {
        updates.status = "ASSIGNED";
      }
    }

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
