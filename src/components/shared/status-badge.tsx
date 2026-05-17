import { cn } from "@/lib/utils";

export type GoalStatus = "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REWORK_REQUIRED" | "COMPLETED" | "LOCKED";

interface StatusBadgeProps {
  status: GoalStatus | string;
  className?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  DRAFT: {
    label: "Draft",
    className: "bg-neutral-100 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700",
  },
  SUBMITTED: {
    label: "Submitted",
    className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  },
  UNDER_REVIEW: {
    label: "Under Review",
    className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
  },
  APPROVED: {
    label: "Approved",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
  },
  REWORK_REQUIRED: {
    label: "Rework Required",
    className: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800",
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-neutral-50 text-neutral-700 border-neutral-200 dark:bg-neutral-900/30 dark:text-neutral-400 dark:border-neutral-800",
  },
  LOCKED: {
    label: "Locked",
    className: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status,
    className: "bg-gray-100 text-gray-700 border-gray-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors duration-200",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}

