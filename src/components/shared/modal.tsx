import { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: ModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={cn("sm:max-w-[500px]", className)}>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription className="text-neutral-500 dark:text-neutral-400">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="py-4">
          {children}
        </div>
        {footer && (
          <DialogFooter className="gap-2 sm:gap-0">
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

