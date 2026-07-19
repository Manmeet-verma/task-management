import { NextResponse } from "next/server";
import { db, ref, get, update, remove } from "@/lib/firebase";
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
    const siteRef = ref(db, `sites/${id}`);
    const snapshot = await get(siteRef);
    if (!snapshot.exists()) return NextResponse.json({ error: "Site not found" }, { status: 404 });

    const body = await request.json();
    const updates: Record<string, any> = { updatedAt: new Date().toISOString() };
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.repositoryUrl !== undefined) updates.repositoryUrl = body.repositoryUrl;
    if (body.status !== undefined) updates.status = body.status;

    await update(siteRef, updates);
    const updated = (await get(siteRef)).val();
    return NextResponse.json(updated);
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
    const siteRef = ref(db, `sites/${id}`);
    const snapshot = await get(siteRef);
    if (!snapshot.exists()) return NextResponse.json({ error: "Site not found" }, { status: 404 });

    await remove(siteRef);
    return NextResponse.json({ message: "Site deleted" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
