import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db, ref, get, update } from "@/lib/firebase";
import { verifyAuth } from "@/lib/auth";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = verifyAuth(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "ADMIN") return NextResponse.json({ error: "Admin access required" }, { status: 403 });

    const { id } = await params;
    const body = await request.json();

    const userRef = ref(db, `users/${id}`);
    const snapshot = await get(userRef);
    if (!snapshot.exists()) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const updates: Record<string, any> = {};
    if (body.username) updates.username = body.username;
    if (body.email) updates.email = body.email;
    if (body.role) updates.role = body.role;
    if (body.password) updates.password = await bcrypt.hash(body.password, 10);

    await update(userRef, updates);
    const updated = (await get(userRef)).val();

    return NextResponse.json({
      id: updated.id,
      username: updated.username,
      email: updated.email,
      role: updated.role,
    });
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

    const userRef = ref(db, `users/${id}`);
    const snapshot = await get(userRef);
    if (!snapshot.exists()) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const userData = snapshot.val();
    const emailKey = userData.email.replace(/\./g, ",");

    const { remove } = await import("@/lib/firebase");
    await remove(ref(db, `users/${id}`));
    await remove(ref(db, `emailIndex/${emailKey}`));
    await remove(ref(db, `usernameIndex/${userData.username}`));

    return NextResponse.json({ message: "User deleted" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
