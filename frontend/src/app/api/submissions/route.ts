import { NextResponse } from "next/server";
import { db, ref, get } from "@/lib/firebase";
import { verifyAuth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = verifyAuth(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "ADMIN") return NextResponse.json({ error: "Admin access required" }, { status: 403 });

    const subsRef = ref(db, "submissions");
    const snapshot = await get(subsRef);

    if (!snapshot.exists()) return NextResponse.json([]);

    const allSubs = Object.values(snapshot.val() as Record<string, any>);

    const usersSnapshot = await get(ref(db, "users"));
    const users = usersSnapshot.exists() ? (usersSnapshot.val() as Record<string, any>) : {};

    const tasksSnapshot = await get(ref(db, "tasks"));
    const tasks = tasksSnapshot.exists() ? (tasksSnapshot.val() as Record<string, any>) : {};

    const enriched = allSubs
      .filter((s: any) => tasks[s.taskId])
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((s: any) => ({
        ...s,
        task: { id: s.taskId, name: tasks[s.taskId].name },
        user: users[s.userId] ? { id: s.userId, username: users[s.userId].username } : null,
      }));

    return NextResponse.json(enriched);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
