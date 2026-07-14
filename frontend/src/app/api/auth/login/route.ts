import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db, ref, get, push, set } from "@/lib/firebase";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    const usersRef = ref(db, "users");
    const snapshot = await get(usersRef);

    if (!snapshot.exists()) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
    }

    const users = snapshot.val();
    const user = Object.values(users as Record<string, any>).find(
      (u: any) => u.email === email
    );
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
    }

    const valid = await bcrypt.compare(password, (user as any).password);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
    }

    const token = jwt.sign(
      { id: (user as any).id, username: (user as any).username, role: (user as any).role },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    return NextResponse.json({
      token,
      user: {
        id: (user as any).id,
        username: (user as any).username,
        email: (user as any).email,
        role: (user as any).role,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
