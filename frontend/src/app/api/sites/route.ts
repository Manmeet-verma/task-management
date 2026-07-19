import { NextResponse } from "next/server";
import { db, ref, get, push, set, update, remove } from "@/lib/firebase";
import { verifyAuth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = verifyAuth(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const snapshot = await get(ref(db, "sites"));
    if (!snapshot.exists()) return NextResponse.json([]);

    const data = snapshot.val() as Record<string, any>;
    const sites = Object.values(data).sort(
      (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return NextResponse.json(sites);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = verifyAuth(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "ADMIN") return NextResponse.json({ error: "Admin access required" }, { status: 403 });

    const { name, description, repositoryUrl } = await request.json();
    if (!name) return NextResponse.json({ error: "Site name is required" }, { status: 400 });

    const snapshot = await get(ref(db, "sites"));
    if (snapshot.exists()) {
      const existing = Object.values(snapshot.val() as Record<string, any>);
      if (existing.some((s: any) => s.name.toLowerCase() === name.toLowerCase())) {
        return NextResponse.json({ error: "Site already exists" }, { status: 400 });
      }
    }

    const newRef = push(ref(db, "sites"));
    const site = {
      id: newRef.key,
      name,
      description: description || "",
      repositoryUrl: repositoryUrl || "",
      status: "ACTIVE",
      createdById: user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await set(newRef, site);
    return NextResponse.json(site, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = verifyAuth(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "ADMIN") return NextResponse.json({ error: "Admin access required" }, { status: 403 });

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

    await remove(ref(db, `sites/${id}`));
    return NextResponse.json({ message: "Site deleted" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
