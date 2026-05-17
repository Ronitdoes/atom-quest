"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface SharedGoalSyncDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sharedGoal: { id: string; title: string } | null;
}

export function SharedGoalSyncDialog({ isOpen, onClose, sharedGoal }: SharedGoalSyncDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    quarter: 1,
    value: 0,
    status: "On Track",
    notes: "",
  });

  const handleSync = async () => {
    if (!sharedGoal) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/shared-goals/${sharedGoal.id}/sync-achievement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to sync achievement");
      }

      const result = await response.json();
      toast.success(`Achievement synced successfully to ${result.updatedCount} employees.`);
      onClose();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to sync achievement");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Sync Progress: {sharedGoal?.title}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="quarter">Quarter</Label>
            <Select 
              value={formData.quarter.toString()} 
              onValueChange={(v) => {
                if (v) {
                  setFormData({ ...formData, quarter: parseInt(v) });
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select quarter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Quarter 1</SelectItem>
                <SelectItem value="2">Quarter 2</SelectItem>
                <SelectItem value="3">Quarter 3</SelectItem>
                <SelectItem value="4">Quarter 4</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="value">Achievement Value</Label>
            <Input
              id="value"
              type="number"
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="status">Status</Label>
            <Select 
              value={formData.status} 
              onValueChange={(v) => {
                if (v) {
                  setFormData({ ...formData, status: v });
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Not Started">Not Started</SelectItem>
                <SelectItem value="On Track">On Track</SelectItem>
                <SelectItem value="Behind Schedule">Behind Schedule</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Enter progress notes here..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSync} disabled={isLoading} className="gap-2">
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            Sync to All Employees
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
