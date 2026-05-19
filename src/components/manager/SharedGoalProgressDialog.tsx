"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, RefreshCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SharedGoalProgressDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sharedGoal: { id: string; title: string; target: number } | null;
}

interface EmployeeProgress {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string;
  quarter: number;
  value: number;
  status: string;
  notes: string | null;
  updatedAt: string;
}

export function SharedGoalProgressDialog({ isOpen, onClose, sharedGoal }: SharedGoalProgressDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [quarter, setQuarter] = useState<number>(1);
  const [progressData, setProgressData] = useState<EmployeeProgress[]>([]);

  useEffect(() => {
    if (isOpen && sharedGoal) {
      fetchProgress();
    }
  }, [isOpen, sharedGoal, quarter]);

  const fetchProgress = async () => {
    if (!sharedGoal) return;
    try {
      setIsLoading(true);
      const res = await fetch(`/api/shared-goals/${sharedGoal.id}/progress?quarter=${quarter}`);
      if (!res.ok) throw new Error("Failed to load progress");
      const data = await res.json();
      setProgressData(data);
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch employee progress");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 gap-4 border-b border-zinc-150 dark:border-zinc-850">
          <div>
            <DialogTitle className="text-xl font-bold pr-8 sm:pr-0">Progress: {sharedGoal?.title}</DialogTitle>
            <p className="text-xs text-zinc-500 mt-1">Target Value: <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{sharedGoal?.target}</span></p>
          </div>
          <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto sm:pr-8">
            <Select value={quarter.toString()} onValueChange={(v) => setQuarter(parseInt(v || "1"))}>
              <SelectTrigger className="w-32 h-8 text-xs shrink-0">
                <SelectValue placeholder="Quarter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Quarter 1</SelectItem>
                <SelectItem value="2">Quarter 2</SelectItem>
                <SelectItem value="3">Quarter 3</SelectItem>
                <SelectItem value="4">Quarter 4</SelectItem>
              </SelectContent>
            </Select>
            <button onClick={fetchProgress} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors shrink-0" title="Refresh Data">
              <RefreshCcw className={`w-4 h-4 text-zinc-500 shrink-0 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </DialogHeader>

        <div className="pt-4">
          {isLoading && progressData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
              <Loader2 className="w-8 h-8 animate-spin mb-4" />
              <p className="text-sm">Loading employee progress...</p>
            </div>
          ) : progressData.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-xl border-zinc-200 dark:border-zinc-800">
              <p className="text-sm text-zinc-500">No employees have logged progress for Q{quarter} yet.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-x-auto">
              <Table className="min-w-[600px]">
                <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50">
                  <TableRow>
                    <TableHead className="font-semibold">Employee</TableHead>
                    <TableHead className="text-right font-semibold">Achievement</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Notes</TableHead>
                    <TableHead className="text-right font-semibold">Last Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {progressData.map((prog) => (
                    <TableRow key={prog.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20">
                      <TableCell>
                        <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100">{prog.userName || "Unknown"}</p>
                        <p className="text-xs text-zinc-500">{prog.userEmail}</p>
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                        {prog.value}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`
                          ${prog.status === 'Completed' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : ''}
                          ${prog.status === 'On Track' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : ''}
                          ${prog.status === 'Behind Schedule' ? 'border-amber-500 text-amber-600 dark:text-amber-400' : ''}
                          ${prog.status === 'Not Started' ? 'border-zinc-300 text-zinc-500 dark:border-zinc-700' : ''}
                        `}>
                          {prog.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs text-zinc-600 dark:text-zinc-400" title={prog.notes || ""}>
                        {prog.notes || "-"}
                      </TableCell>
                      <TableCell className="text-right text-xs text-zinc-500">
                        {new Date(prog.updatedAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
