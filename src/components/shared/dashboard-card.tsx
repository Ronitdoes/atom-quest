import { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DashboardCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    isUp: boolean;
  };
  className?: string;
}

export function DashboardCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
}: DashboardCardProps) {
  return (
    <Card className={cn("overflow-hidden border-none shadow-md bg-white dark:bg-neutral-900/50 ring-1 ring-border", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
          {title}
        </CardTitle>
        {Icon && (
          <div className="p-2 rounded-lg bg-neutral-50 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
          {value}
        </div>
        {(description || trend) && (
          <div className="flex items-center mt-1 space-x-2">
            {trend && (
              <span
                className={cn(
                  "text-xs font-medium px-1.5 py-0.5 rounded-md",
                  trend.isUp 
                    ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400" 
                    : "text-rose-700 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400"
                )}
              >
                {trend.isUp ? "+" : "-"}{Math.abs(trend.value)}%
              </span>
            )}
            {description && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {description}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

