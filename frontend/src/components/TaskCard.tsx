import Link from "next/link";
import StatusBadge from "./StatusBadge";
import type { Task } from "@/lib/api";

const priorityStyles: Record<string, string> = {
  HIGH: "text-red-600",
  MEDIUM: "text-yellow-600",
  LOW: "text-green-600",
};

export default function TaskCard({
  task,
  href,
  action,
}: {
  task: Task;
  href?: string;
  action?: React.ReactNode;
}) {
  const content = (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-gray-900">{task.name}</h3>
        <StatusBadge status={task.status} />
      </div>
      <div className="text-sm text-gray-500 space-y-1">
        <p>
          <span className="font-medium">Category:</span> {task.category}
        </p>
        <p>
          <span className="font-medium">Project:</span> {task.siteProject}
        </p>
        <p>
          <span className="font-medium">Deadline:</span>{" "}
          {new Date(task.deadline).toLocaleDateString()}
        </p>
        {task.userDeadline && (
          <p>
            <span className="font-medium">Your Deadline:</span>{" "}
            {new Date(task.userDeadline).toLocaleDateString()}
          </p>
        )}
        <p>
          <span className="font-medium">Priority:</span>{" "}
          <span className={priorityStyles[task.priority] || ""}>
            {task.priority}
          </span>
        </p>
        {task.assignedTo && (
          <p>
            <span className="font-medium">Assigned to:</span>{" "}
            {task.assignedTo.username}
          </p>
        )}
      </div>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }
  return content;
}
