import { NextResponse } from "next/server";
import { db, ref, get, push, set } from "@/lib/firebase";
import { verifyAuth } from "@/lib/auth";

async function createNotification(userId: string, message: string, type: string, taskId: string) {
  const notifRef = push(ref(db, "notifications"));
  await set(notifRef, {
    id: notifRef.key,
    userId, message, type, taskId,
    read: false,
    createdAt: new Date().toISOString(),
  });
}

export async function GET(request: Request) {
  try {
    const user = verifyAuth(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const snapshot = await get(ref(db, "tasks"));
    if (!snapshot.exists()) return NextResponse.json([]);

    const tasksData = snapshot.val() as Record<string, any>;
    const tasks = Object.values(tasksData);

    const usersSnapshot = await get(ref(db, "users"));
    const users = usersSnapshot.exists() ? (usersSnapshot.val() as Record<string, any>) : {};

    const enriched = tasks.map((task: any) => {
      const assignedToIds = task.assignedToIds || [];
      return {
        ...task,
        createdBy: users[task.createdById] ? { id: task.createdById, username: users[task.createdById].username } : null,
        assignedTo: task.assignedToId && users[task.assignedToId] ? { id: task.assignedToId, username: users[task.assignedToId].username } : null,
        assignedToUsers: assignedToIds
          .map((uid: string) => (users[uid] ? { id: uid, username: users[uid].username } : null))
          .filter(Boolean),
        assignedByName: users[task.createdById] ? users[task.createdById].username : null,
      };
    });
    enriched.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return NextResponse.json(enriched);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = verifyAuth(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const contentType = request.headers.get("content-type") || "";
    let taskData: any = {};

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      taskData.name = formData.get("name") as string;
      taskData.category = formData.get("category") as string;
      taskData.siteProject = formData.get("siteProject") as string;
      taskData.deadline = formData.get("deadline") as string;
      taskData.priority = formData.get("priority") as string;
      taskData.description = formData.get("description") as string;
      taskData.assignedToId = formData.get("assignedToId") as string;

      const file = formData.get("file") as File | null;
      if (file && file.size > 0) {
        const bytes = await file.arrayBuffer();
        const base64 = Buffer.from(bytes).toString("base64");
        taskData.attachmentUrl = `data:${file.type};base64,${base64}`;
        taskData.attachmentType = file.type;
      }
    } else {
      taskData = await request.json();
    }

    const { name, category, siteProject, deadline, priority, description, assignedToId, attachmentUrl, attachmentType } = taskData;
    const newTaskRef = push(ref(db, "tasks"));
    const taskId = newTaskRef.key!;

    const ids = assignedToId ? [assignedToId] : [];
    const status = ids.length > 0 ? "ASSIGNED" : "AVAILABLE";
    const task: Record<string, any> = {
      id: taskId,
      name,
      category,
      siteProject,
      deadline: new Date(deadline).toISOString(),
      priority: priority || "MEDIUM",
      description: description || "",
      status,
      extensionCount: 0,
      locked: false,
      assignedToIds: ids,
      createdById: user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (attachmentUrl) {
      task.attachmentUrl = attachmentUrl;
      task.attachmentType = attachmentType || "";
    }

    if (ids.length > 0) {
      task.assignedToId = ids[0];
      task.assignedAt = new Date().toISOString();
      task.assignedByName = user.username;
      for (const uid of ids) {
        await createNotification(uid, `You have been assigned "${name}" by ${user.username}.`, "ASSIGNED", taskId);
      }
    }

    await set(newTaskRef, task);
    return NextResponse.json(task, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
