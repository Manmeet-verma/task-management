import { NextResponse } from "next/server";
import { db, ref, get, push, set, remove } from "@/lib/firebase";
import { verifyAuth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = verifyAuth(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const snapshot = await get(ref(db, "categories"));
    if (!snapshot.exists()) return NextResponse.json([]);

    const data = snapshot.val() as Record<string, any>;
    const categories = Object.values(data).sort((a: any, b: any) => a.name.localeCompare(b.name));
    return NextResponse.json(categories);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = verifyAuth(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "ADMIN") return NextResponse.json({ error: "Admin access required" }, { status: 403 });

    const { name } = await request.json();
    if (!name) return NextResponse.json({ error: "Category name is required" }, { status: 400 });

    const snapshot = await get(ref(db, "categories"));
    if (snapshot.exists()) {
      const existing = Object.values(snapshot.val() as Record<string, any>);
      if (existing.some((c: any) => c.name.toLowerCase() === name.toLowerCase())) {
        return NextResponse.json({ error: "Category already exists" }, { status: 400 });
      }
    }

    const newRef = push(ref(db, "categories"));
    const category = {
      id: newRef.key,
      name,
      createdAt: new Date().toISOString(),
    };
    await set(newRef, category);
    return NextResponse.json(category, { status: 201 });
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

    await remove(ref(db, `categories/${id}`));
    return NextResponse.json({ message: "Category deleted" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
