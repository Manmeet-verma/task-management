import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db, ref, get, push, set } from "@/lib/firebase";

export async function POST(request: Request) {
  try {
    const { username, email, password } = await request.json();

    const usersRef = ref(db, "users");
    const snapshot = await get(usersRef);

    if (snapshot.exists()) {
      const users = snapshot.val();
      const exists = Object.values(users as Record<string, any>).find(
        (u: any) => u.email === email || u.username === username
      );
      if (exists) {
        return NextResponse.json({ error: "User already exists" }, { status: 400 });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUserRef = push(ref(db, "users"));
    const userId = newUserRef.key!;

    const user = {
      id: userId,
      username,
      email,
      password: hashedPassword,
      role: "USER",
      createdAt: new Date().toISOString(),
    };

    await set(newUserRef, user);

    const token = jwt.sign(
      { id: userId, username, role: "USER" },
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
