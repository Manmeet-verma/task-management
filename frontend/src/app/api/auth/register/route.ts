import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db, ref, get, set, push } from "@/lib/firebase";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const { username, email, password } = await request.json();

    const emailKey = email.replace(/\./g, ",");
    const emailIndexRef = ref(db, `emailIndex/${emailKey}`);
    const emailSnapshot = await get(emailIndexRef);

    if (emailSnapshot.exists()) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 });
    }

    const usernameRef = ref(db, `usernameIndex/${username}`);
    const usernameSnapshot = await get(usernameRef);

    if (usernameSnapshot.exists()) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUserRef = push(ref(db, "users"));
    const userId = newUserRef.key!;
    const sessionId = crypto.randomUUID();

    const user = {
      id: userId,
      username,
      email,
      password: hashedPassword,
      role: "USER",
      sessionId,
      createdAt: new Date().toISOString(),
    };

    await set(newUserRef, user);
    await set(emailIndexRef, { userId, email });
    await set(usernameRef, { userId, username });

    const token = jwt.sign(
      { id: userId, username, role: "USER", sessionId },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    return NextResponse.json({
      token,
      user: { id: userId, username, email, role: "USER" },
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
