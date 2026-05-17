import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TableWrapperProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function TableWrapper({
  title,
  description,
  actions,
  children,
  footer,
  className,
}: TableWrapperProps) {
  return (
    <div className={cn("bg-white dark:bg-background rounded-xl border border-border shadow-sm overflow-hidden", className)}>
      {(title || description || actions) && (
        <div className="px-6 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            {title && (
              <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
                {title}
              </h3>
            )}
            {description && (
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      )}
      
      <div className="overflow-x-auto">
        {children}
      </div>

      {footer && (
        <div className="px-6 py-3 bg-neutral-50/50 dark:bg-neutral-900/50 border-t border-neutral-100 dark:border-neutral-800">
          {footer}
        </div>
      )}
    </div>
  );
}

