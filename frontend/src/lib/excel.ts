export function downloadExcel(data: Record<string, any>[], filename: string) {
  if (!data || data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvRows: string[] = [];

  csvRows.push(headers.join(","));

  for (const row of data) {
    const values = headers.map((h) => {
      let val = row[h];
      if (val === null || val === undefined) val = "";
      val = String(val).replace(/"/g, '""');
      if (String(val).includes(",") || String(val).includes('"') || String(val).includes("\n")) {
        val = `"${val}"`;
      }
      return val;
    });
    csvRows.push(values.join(","));
  }

  const csv = csvRows.join("\n");
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function tasksToExcelRows(tasks: any[], users: any[] = []) {
  return tasks.map((t, i) => ({
    "#": i + 1,
    "Task Name": t.name || "",
    "Category": t.category || "",
    "Site": t.siteProject || "",
    "Priority": t.priority || "",
    "Deadline": t.deadline ? new Date(t.deadline).toLocaleDateString() : "",
    "Status": t.status || "",
    "Assigned To": t.assignedTo?.username || "",
    "Assigned By": t.assignedByName || t.createdBy?.username || "",
    "Created At": t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "",
    "Completed Remarks": t.completedRemarks || "",
    "Reassign Reason": t.reassignReason || "",
    "Extension Reason": t.extendReason || "",
    "Pending Reason": t.pendingReason || "",
    "Admin Remarks": t.adminRemarks || "",
    "Has Attachment": t.attachmentUrl ? "Yes" : "No",
    "Has Completion Attachment": t.completedAttachmentUrl ? "Yes" : "No",
    "Locked": t.locked ? "Yes" : "No",
  }));
}

export function usersToExcelRows(users: any[]) {
  return users.map((u, i) => ({
    "#": i + 1,
    "Username": u.username || "",
    "Email": u.email || "",
    "Role": u.role || "",
    "Super Admin": u.isMaster ? "Yes" : "No",
    "PAN Card": u.panCard || "",
    "Aadhar Card": u.aadharCard || "",
    "GST": u.gst || "",
  }));
}
