import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db, ref, get, update } from "@/lib/firebase";

export async function POST(request: Request) {
  try {
    const { email, newPassword } = await request.json();

    if (!email || !newPassword) {
      return NextResponse.json({ error: "Email and new password are required" }, { status: 400 });
    }

    const emailKey = email.replace(/\./g, ",");
    const emailIndexRef = ref(db, `emailIndex/${emailKey}`);
    const indexSnapshot = await get(emailIndexRef);

    if (!indexSnapshot.exists()) {
      return NextResponse.json({ error: "No account found with this email" }, { status: 404 });
    }

    const { userId } = indexSnapshot.val();
    const userRef = ref(db, `users/${userId}`);
    const userSnapshot = await get(userRef);

    if (!userSnapshot.exists()) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await update(userRef, { password: hashedPassword });

    return NextResponse.json({ message: "Password reset successful" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
