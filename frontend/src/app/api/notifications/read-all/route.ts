import { NextResponse } from "next/server";
import { db, ref, get, update } from "@/lib/firebase";
import { verifyAuth } from "@/lib/auth";

export async function PUT(request: Request) {
  try {
    const user = verifyAuth(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const notifRef = ref(db, "notifications");
    const snapshot = await get(notifRef);
    if (!snapshot.exists()) return NextResponse.json({ message: "Done" });

    const all = snapshot.val() as Record<string, any>;
    const updates: Record<string, any> = {};
    for (const [key, val] of Object.entries(all)) {
      if ((val as any).userId === user.id && !(val as any).read) {
        updates[`${key}/read`] = true;
      }
    }
    if (Object.keys(updates).length > 0) {
      await update(notifRef, updates);
    }

    return NextResponse.json({ message: "All marked as read" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
