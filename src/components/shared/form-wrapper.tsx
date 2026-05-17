import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FormWrapperProps {
  title?: string;
  description?: string;
  children: ReactNode;
  onSubmit: (e: any) => void | Promise<void>;
  submitLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
  isLoading?: boolean;
  className?: string;
}

export function FormWrapper({
  title,
  description,
  children,
  onSubmit,
  submitLabel = "Save Changes",
  cancelLabel = "Cancel",
  onCancel,
  isLoading,
  className,
}: FormWrapperProps) {
  return (
    <form onSubmit={onSubmit} className={cn("space-y-6", className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {description}
            </p>
          )}
        </div>
      )}
      
      <div className="space-y-4">
        {children}
      </div>

      <div className="flex items-center justify-end space-x-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
        )}
        <Button type="submit" disabled={isLoading} className="min-w-[100px]">
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Saving...</span>
            </div>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </form>
  );
}

