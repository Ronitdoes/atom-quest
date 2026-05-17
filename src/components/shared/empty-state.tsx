import { LucideIcon, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center border-2 border-dashed rounded-xl bg-neutral-50/50 dark:bg-neutral-900/20 border-neutral-200 dark:border-neutral-800",
        className
      )}
    >
      <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-400">
        <Icon size={24} />
      </div>
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="outline" className="mt-6">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

