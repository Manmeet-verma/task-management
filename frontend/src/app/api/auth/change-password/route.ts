import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db, ref, get, update } from "@/lib/firebase";
import { verifyAuth } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const authUser = verifyAuth(request);
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Current password and new password are required" }, { status: 400 });
    }

    if (newPassword.length < 4) {
      return NextResponse.json({ error: "New password must be at least 4 characters" }, { status: 400 });
    }

    const userRef = ref(db, `users/${authUser.id}`);
    const userSnapshot = await get(userRef);
    if (!userSnapshot.exists()) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const userData = userSnapshot.val();
    const isMatch = await bcrypt.compare(currentPassword, userData.password);
    if (!isMatch) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await update(userRef, { password: hashedPassword });

    return NextResponse.json({ message: "Password changed successfully" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
