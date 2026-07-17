import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db, ref, get, push, set } from "@/lib/firebase";
import { verifyAuth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = verifyAuth(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "ADMIN") return NextResponse.json({ error: "Admin access required" }, { status: 403 });

    const usersRef = ref(db, "users");
    const snapshot = await get(usersRef);

    if (!snapshot.exists()) return NextResponse.json([]);

    const users = snapshot.val() as Record<string, any>;
    const usersList = Object.values(users).map((u: any) => ({
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

export async function POST(request: Request) {
  try {
    const user = verifyAuth(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "ADMIN") return NextResponse.json({ error: "Admin access required" }, { status: 403 });

    const { username, email, password, role, isMaster } = await request.json();

    if (!username || !email || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const emailKey = email.replace(/\./g, ",");
    const emailIndexRef = ref(db, `emailIndex/${emailKey}`);
    const emailSnapshot = await get(emailIndexRef);
    if (emailSnapshot.exists()) {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 });
    }

    const usernameRef = ref(db, `usernameIndex/${username}`);
    const usernameSnapshot = await get(usernameRef);
    if (usernameSnapshot.exists()) {
      return NextResponse.json({ error: "Username already exists" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUserRef = push(ref(db, "users"));
    const userId = newUserRef.key!;

    const newUser = {
      id: userId,
      username,
      email,
      password: hashedPassword,
      role: role === "ADMIN" ? "ADMIN" : "USER",
      isMaster: isMaster || false,
      createdAt: new Date().toISOString(),
    };

    await set(newUserRef, newUser);
    await set(emailIndexRef, { userId, email });
    await set(usernameRef, { userId, username });

    return NextResponse.json({
      id: userId,
      username,
      email,
      role: newUser.role,
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
