import { NextResponse } from "next/server";
import { db, ref, get, update } from "@/lib/firebase";
import { verifyAuth } from "@/lib/auth";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = verifyAuth(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await update(ref(db, `notifications/${id}`), { read: true });

    return NextResponse.json({ message: "Marked as read" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
