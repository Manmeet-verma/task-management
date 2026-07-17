import { NextResponse } from "next/server";
import { db, ref, get } from "@/lib/firebase";
import { verifyAuth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = verifyAuth(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const notifRef = ref(db, "notifications");
    const snapshot = await get(notifRef);
    if (!snapshot.exists()) return NextResponse.json([]);

    const all = Object.values(snapshot.val() as Record<string, any>);
    const mine = all
      .filter((n: any) => n.userId === user.id)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(mine);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
