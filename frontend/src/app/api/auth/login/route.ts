import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db, ref, get, set } from "@/lib/firebase";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    const emailIndexRef = ref(db, `emailIndex/${email.replace(/\./g, ",")}`);
    const indexSnapshot = await get(emailIndexRef);

    if (!indexSnapshot.exists()) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
    }

    const { userId } = indexSnapshot.val();
    const userRef = ref(db, `users/${userId}`);
    const userSnapshot = await get(userRef);

    if (!userSnapshot.exists()) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
    }

    const user = userSnapshot.val();

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    return NextResponse.json({
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role, isMaster: user.isMaster || false },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
