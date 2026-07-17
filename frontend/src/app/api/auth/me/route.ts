import { NextResponse } from "next/server";
import { db, ref, get } from "@/lib/firebase";
import { verifyAuth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRef = ref(db, `users/${user.id}`);
    const snapshot = await get(userRef);

    if (!snapshot.exists()) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = snapshot.val();

    if (user.sessionId && userData.sessionId && user.sessionId !== userData.sessionId) {
      return NextResponse.json({ error: "Session expired. Logged in from another device." }, { status: 401 });
    }

    return NextResponse.json({
      id: userData.id,
      username: userData.username,
      email: userData.email,
      role: userData.role,
      isMaster: userData.isMaster || false,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
