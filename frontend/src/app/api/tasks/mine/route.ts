import { NextResponse } from "next/server";
import { db, ref, get } from "@/lib/firebase";
import { verifyAuth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = verifyAuth(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tasksRef = ref(db, "tasks");
    const snapshot = await get(tasksRef);

    if (!snapshot.exists()) return NextResponse.json([]);

    const tasksData = snapshot.val() as Record<string, any>;
    const tasks = Object.values(tasksData).filter((t: any) => {
      const assignedToIds = t.assignedToIds || [];
      return t.assignedToId === user.id || assignedToIds.includes(user.id);
    });

    const usersSnapshot = await get(ref(db, "users"));
    const users = usersSnapshot.exists() ? (usersSnapshot.val() as Record<string, any>) : {};

    const enriched = tasks.map((task: any) => {
      const assignedToIds = task.assignedToIds || [];
      return {
        ...task,
        createdBy: users[task.createdById]
          ? { id: task.createdById, username: users[task.createdById].username }
          : null,
        assignedTo: users[task.assignedToId]
          ? { id: task.assignedToId, username: users[task.assignedToId].username }
          : null,
        assignedToUsers: assignedToIds
          .map((uid: string) => (users[uid] ? { id: uid, username: users[uid].username } : null))
          .filter(Boolean),
        assignedByName: users[task.createdById] ? users[task.createdById].username : null,
      };
    });

    enriched.sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return NextResponse.json(enriched);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
