import { NextResponse } from "next/server";
import { db, ref, get } from "@/lib/firebase";
import { verifyAuth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = verifyAuth(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const usersRef = ref(db, "users");
    const snapshot = await get(usersRef);

    if (!snapshot.exists()) return NextResponse.json([]);

    const users = snapshot.val() as Record<string, any>;
    const usersList = Object.values(users)
      .filter((u: any) => u.id !== user.id)
      .map((u: any) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        role: u.role,
        isMaster: u.isMaster || false,
        createdAt: u.createdAt,
      }));

    return NextResponse.json(usersList);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
