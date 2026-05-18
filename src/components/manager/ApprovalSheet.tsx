"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/shared/status-badge";
import { CheckCircle2, XCircle, Save, ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface Goal {
  id: string;
  thrustArea: string;
  title: string;
  description: string | null;
  uomType: string;
  target: number;
  weightage: number;
}

interface User {
  id: string;
  name: string | null;
  email: string;
}

interface GoalSheet {
  id: string;
  userId: string;
  cycleId: string;
  status: string;
  managerComment: string | null;
  user: User;
  goals: Goal[];
}

interface ApprovalSheetProps {
  sheet: GoalSheet;
}

export function ApprovalSheet({ sheet }: ApprovalSheetProps) {
  const [goals, setGoals] = useState(sheet.goals);
  const [comment, setComment] = useState(sheet.managerComment || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const totalWeightage = useMemo(() => 
    goals.reduce((sum, g) => sum + g.weightage, 0), 
  [goals]);

  const hasChanges = JSON.stringify(goals) !== JSON.stringify(sheet.goals);
  const isApproved = sheet.status === "APPROVED";

  const handleUpdateGoal = (id: string, field: "target" | "weightage", value: string) => {
    const numValue = parseFloat(value) || 0;
    setGoals(prev => prev.map(g => g.id === id ? { ...g, [field]: numValue } : g));
  };

  const handleSaveChanges = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/manager/update-goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetId: sheet.id, goals }),
      });

      if (response.ok) {
        toast.success("Goal modifications saved.");
        router.refresh();
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to save changes.");
      }
    } catch (error) {
      toast.error("Error saving changes.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (totalWeightage !== 100) {
      toast.error("Total weightage must be 100% before approval.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/manager/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetId: sheet.id }),
      });

      if (response.ok) {
        toast.success("Goal sheet approved successfully!");
        router.push("/manager");
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to approve.");
      }
    } catch (error) {
      toast.error("Error during approval.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!comment.trim()) {
      toast.error("Please provide a reason for rejection.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/manager/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetId: sheet.id, comment }),
      });

      if (response.ok) {
        toast.success("Goal sheet sent back for rework.");
        router.push("/manager");
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to reject.");
      }
    } catch (error) {
      toast.error("Error during rejection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button 
          variant="ghost" 
          className="gap-2 text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100/80 dark:hover:bg-neutral-800/80 group transition-all native-button-style"
          nativeButton={false}
          render={(props) => (
            <Link {...props} href="/manager">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-300" />
              Back to Dashboard
            </Link>
          )}
        />
        <div className="flex gap-3">
          {hasChanges && !isApproved && (
            <Button 
              variant="outline" 
              onClick={handleSaveChanges}
              disabled={isSubmitting}
              className="border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900 transition-colors"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save Edits
            </Button>
          )}
          {!isApproved && (
            <>
              <Button 
                variant="destructive" 
                onClick={handleReject}
                disabled={isSubmitting}
                className="bg-rose-600 hover:bg-rose-700 dark:bg-rose-700 dark:hover:bg-rose-800 text-white transition-all shadow-md shadow-rose-600/10 hover:shadow-rose-600/20 active:scale-[0.98]"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject & Rework
              </Button>
              <Button 
                onClick={handleApprove}
                disabled={isSubmitting || totalWeightage !== 100}
                className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-800 text-white transition-all shadow-md shadow-emerald-600/10 hover:shadow-emerald-600/20 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Approve Goals
              </Button>
            </>
          )}
        </div>
      </div>

      <Card className="border border-neutral-200/60 dark:border-neutral-800/60 shadow-lg shadow-neutral-100/20 dark:shadow-none bg-white dark:bg-neutral-950/80 backdrop-blur-sm">
        <CardHeader className="border-b border-neutral-100 dark:border-neutral-900 pb-5">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
                Goal Sheet Review: {sheet.user.name}
              </CardTitle>
              <CardDescription className="text-sm mt-1 text-neutral-500 dark:text-neutral-400">
                {sheet.user.email} • Cycle {sheet.cycleId}
              </CardDescription>
            </div>
            <StatusBadge status={sheet.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-8 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3.5">
              <h3 className="font-semibold text-sm tracking-wide uppercase text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                Manager Comments
              </h3>
              <Textarea 
                placeholder="Enter feedback or reasons for rework..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={isApproved || isSubmitting}
                className="min-h-[120px] resize-none border-neutral-200 focus:border-indigo-500 focus:ring-indigo-500/20 dark:border-neutral-800 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/20 transition-all text-sm rounded-xl"
              />
              <p className="text-xs text-neutral-400 dark:text-neutral-500">
                Comments are required if you reject the goal sheet.
              </p>
            </div>
            
            <div className={cn(
              "relative overflow-hidden p-6 rounded-2xl border flex flex-col justify-center items-center text-center transition-all duration-500",
              totalWeightage === 100
                ? "bg-gradient-to-br from-emerald-500/5 to-emerald-500/0 dark:from-emerald-500/10 dark:to-transparent border-emerald-500/20 dark:border-emerald-500/30 shadow-lg shadow-emerald-500/5"
                : "bg-gradient-to-br from-amber-500/5 to-amber-500/0 dark:from-amber-500/10 dark:to-transparent border-amber-500/20 dark:border-amber-500/30 shadow-lg shadow-amber-500/5"
            )}>
              {/* Decorative background glow */}
              <div className={cn(
                "absolute -right-16 -top-16 w-32 h-32 rounded-full blur-3xl opacity-20 pointer-events-none",
                totalWeightage === 100 ? "bg-emerald-500" : "bg-amber-500"
              )} />
              
              <p className="text-xs font-bold tracking-wider uppercase text-neutral-400 dark:text-neutral-500 mb-2">
                Total Weightage
              </p>
              
              <div className="relative flex items-baseline">
                <span className={cn(
                  "text-5xl font-black tracking-tight transition-all duration-300 drop-shadow-sm",
                  totalWeightage === 100 
                    ? "text-emerald-600 dark:text-emerald-400 animate-none" 
                    : "text-amber-600 dark:text-amber-400"
                )}>
                  {totalWeightage}%
                </span>
              </div>
              
              <div className="flex items-center gap-1.5 mt-3">
                {totalWeightage === 100 ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                    <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      Perfect weightage allocation!
                    </p>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                    <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                      Must equal exactly 100%
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200/60 dark:border-neutral-800/60 overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-neutral-50/75 dark:bg-neutral-900/40 border-b border-neutral-200/60 dark:border-neutral-800/60">
                  <TableHead className="w-[180px] font-semibold text-neutral-800 dark:text-neutral-200 py-3.5">Thrust Area</TableHead>
                  <TableHead className="font-semibold text-neutral-800 dark:text-neutral-200 py-3.5">Goal Details</TableHead>
                  <TableHead className="w-[140px] text-right font-semibold text-neutral-800 dark:text-neutral-200 py-3.5">Target</TableHead>
                  <TableHead className="w-[140px] text-right font-semibold text-neutral-800 dark:text-neutral-200 py-3.5">Weightage (%)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {goals.map((goal) => (
                  <TableRow 
                    key={goal.id} 
                    className="hover:bg-neutral-50/40 dark:hover:bg-neutral-900/20 border-b border-neutral-100 dark:border-neutral-800/50 transition-colors"
                  >
                    <TableCell className="font-semibold text-neutral-800 dark:text-neutral-200 align-top py-4">
                      <div className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200/40 dark:border-neutral-700/30">
                        {goal.thrustArea}
                      </div>
                    </TableCell>
                    <TableCell className="align-top py-4">
                      <div className="font-semibold text-neutral-900 dark:text-neutral-50">{goal.title}</div>
                      <div className="text-sm text-neutral-500 dark:text-neutral-400 mt-1.5 leading-relaxed max-w-2xl">
                        {goal.description || "No description provided."}
                      </div>
                      <div className="mt-3.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-neutral-100/80 dark:bg-neutral-800/80 border border-neutral-200/30 dark:border-neutral-700/20 text-neutral-600 dark:text-neutral-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 dark:bg-neutral-500" />
                        UOM: {goal.uomType}
                      </div>
                    </TableCell>
                    <TableCell className="text-right align-top py-4">
                      <div className="inline-block w-full max-w-[120px]">
                        <Input 
                          type="number" 
                          value={goal.target}
                          onChange={(e) => handleUpdateGoal(goal.id, "target", e.target.value)}
                          disabled={isApproved || isSubmitting}
                          className="text-right font-mono text-sm h-9 border-neutral-200/80 focus:border-indigo-500 focus:ring-indigo-500/20 dark:border-neutral-800 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/20 bg-transparent transition-all shadow-sm"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-right align-top py-4">
                      <div className="inline-block w-full max-w-[120px]">
                        <Input 
                          type="number" 
                          value={goal.weightage}
                          onChange={(e) => handleUpdateGoal(goal.id, "weightage", e.target.value)}
                          disabled={isApproved || isSubmitting}
                          className="text-right font-bold text-sm h-9 border-neutral-200/80 focus:border-indigo-500 focus:ring-indigo-500/20 dark:border-neutral-800 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/20 bg-transparent transition-all shadow-sm"
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

