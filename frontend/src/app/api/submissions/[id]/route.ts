import { NextResponse } from "next/server";
import { db, ref, get } from "@/lib/firebase";
import { verifyAuth } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = verifyAuth(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const subsRef = ref(db, "submissions");
    const snapshot = await get(subsRef);

    if (!snapshot.exists()) return NextResponse.json([]);

    const allSubs = Object.values(snapshot.val() as Record<string, any>);
    const taskSubs = allSubs
      .filter((s: any) => s.taskId === id)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const usersSnapshot = await get(ref(db, "users"));
    const users = usersSnapshot.exists() ? (usersSnapshot.val() as Record<string, any>) : {};

    const enriched = taskSubs.map((s: any) => ({
      ...s,
      user: users[s.userId] ? { id: s.userId, username: users[s.userId].username } : null,
    }));

    return NextResponse.json(enriched);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
