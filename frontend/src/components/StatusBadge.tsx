const statusStyles: Record<string, string> = {
  AVAILABLE: "bg-green-100 text-green-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  SUBMITTED: "bg-yellow-100 text-yellow-800",
  ACCEPTED: "bg-emerald-100 text-emerald-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  REWORK: "bg-red-100 text-red-800",
  REJECTED: "bg-red-100 text-red-800",
  PENDING_RESUBMIT: "bg-orange-100 text-orange-800",
};

const statusLabels: Record<string, string> = {
  PENDING_RESUBMIT: "Pending Resubmit",
};

export default function StatusBadge({ status }: { status: string }) {
  const style = statusStyles[status] || "bg-gray-100 text-gray-800";
  const label = statusLabels[status] || status.replace("_", " ");
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style}`}
    >
      {label}
    </span>
  );
}
