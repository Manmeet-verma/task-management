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
    if (user.role !== "ADMIN") return NextResponse.json({ error: "Admin access required" }, { status: 403 });

    const { id } = await params;
    const body = await request.json();
    const { action, adminComments } = body;

    const subRef = ref(db, `submissions/${id}`);
    const subSnapshot = await get(subRef);
    if (!subSnapshot.exists())
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });

    const submission = subSnapshot.val();
    const taskRef = ref(db, `tasks/${submission.taskId}`);

    if (action === "accept") {
      await update(subRef, {
        status: "ACCEPTED",
        adminComments: adminComments || "",
        updatedAt: new Date().toISOString(),
      });
      await update(taskRef, { status: "ACCEPTED", updatedAt: new Date().toISOString() });
    } else if (action === "reject") {
      await update(subRef, {
        status: "REJECTED",
        adminComments: adminComments || "",
        updatedAt: new Date().toISOString(),
      });
      await update(taskRef, { status: "REWORK", updatedAt: new Date().toISOString() });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ message: `Submission ${action}ed` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
