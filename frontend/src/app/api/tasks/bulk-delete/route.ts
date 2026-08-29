import { NextResponse } from "next/server";
import { db, ref, get, remove } from "@/lib/firebase";
import { verifyAuth } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const user = verifyAuth(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "ADMIN") return NextResponse.json({ error: "Admin access required" }, { status: 403 });

    const currentUserRef = ref(db, `users/${user.id}`);
    const currentUserSnap = await get(currentUserRef);
    const currentUser = currentUserSnap.exists() ? currentUserSnap.val() : null;

    if (!currentUser?.isMaster) {
      return NextResponse.json({ error: "Only Super Admin can delete tasks" }, { status: 403 });
    }

    const body = await request.json();
    const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
    if (ids.length === 0) {
      return NextResponse.json({ error: "No task ids provided" }, { status: 400 });
    }

    let deleted = 0;
    for (const id of ids) {
      const taskRef = ref(db, `tasks/${id}`);
      const snapshot = await get(taskRef);
      if (snapshot.exists()) {
        await remove(taskRef);
        deleted++;
      }
    }

    return NextResponse.json({ message: `${deleted} task(s) deleted`, deleted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}