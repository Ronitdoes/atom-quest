"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Loader2, Users } from "lucide-react";

interface User {
  id: string;
  name: string | null;
  email: string;
}

interface SharedGoalAssignmentDialogProps {
  sharedGoal: { id: string; title: string } | null;
  isOpen: boolean;
  onClose: () => void;
  teamMembers: User[];
  onAssign: (userIds: string[]) => Promise<void>;
}

export function SharedGoalAssignmentDialog({
  sharedGoal,
  isOpen,
  onClose,
  teamMembers,
  onAssign,
}: SharedGoalAssignmentDialogProps) {
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleAssign = async () => {
    if (selectedUserIds.length === 0) {
      toast.error("Please select at least one team member");
      return;
    }

    try {
      setIsSubmitting(true);
      await onAssign(selectedUserIds);
      toast.success("Shared goal assigned successfully");
      onClose();
      setSelectedUserIds([]);
    } catch (error) {
      console.error(error);
      toast.error("Failed to assign shared goal");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-neutral-500" />
            Assign Shared Goal
          </DialogTitle>
          <DialogDescription>
            Push "{sharedGoal?.title}" to selected team members.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-4">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center space-x-3 space-y-0"
                >
                  <Checkbox
                    id={`user-${member.id}`}
                    checked={selectedUserIds.includes(member.id)}
                    onCheckedChange={() => toggleUser(member.id)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label
                      htmlFor={`user-${member.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {member.name || "Unnamed User"}
                    </Label>
                    <p className="text-xs text-neutral-500">{member.email}</p>
                  </div>
                </div>
              ))}
              {teamMembers.length === 0 && (
                <p className="text-center text-sm text-neutral-500 py-8">
                  No team members found.
                </p>
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Assign to {selectedUserIds.length} members
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
