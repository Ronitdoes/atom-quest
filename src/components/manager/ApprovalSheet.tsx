"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/shared/status-badge";
import { CheckCircle2, XCircle, Save, ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
          className="gap-2"
          nativeButton={false}
          render={(props) => (
            <Link {...props} href="/manager">
              <ArrowLeft className="w-4 h-4" />
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
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject & Rework
              </Button>
              <Button 
                onClick={handleApprove}
                disabled={isSubmitting || totalWeightage !== 100}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Approve Goals
              </Button>
            </>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl">Goal Sheet Review: {sheet.user.name}</CardTitle>
              <CardDescription>{sheet.user.email} • Cycle {sheet.cycleId}</CardDescription>
            </div>
            <StatusBadge status={sheet.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-neutral-500" />
                Manager Comments
              </h3>
              <Textarea 
                placeholder="Enter feedback or reasons for rework..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={isApproved || isSubmitting}
                className="min-h-[120px] resize-none"
              />
              <p className="text-xs text-neutral-500">
                Comments are required if you reject the goal sheet.
              </p>
            </div>
            <div className="bg-neutral-50 dark:bg-neutral-900/50 p-6 rounded-xl border border-neutral-100 dark:border-neutral-800 flex flex-col justify-center items-center text-center">
              <p className="text-sm text-neutral-500 mb-1">Total Weightage</p>
              <p className={`text-4xl font-black ${totalWeightage === 100 ? "text-emerald-600" : "text-amber-600"}`}>
                {totalWeightage}%
              </p>
              <p className="text-xs mt-2 text-neutral-400">Must equal 100% for approval</p>
            </div>
          </div>

          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-neutral-50 dark:bg-neutral-900/50">
                  <TableHead className="w-[150px]">Thrust Area</TableHead>
                  <TableHead>Goal Details</TableHead>
                  <TableHead className="w-[120px] text-right">Target</TableHead>
                  <TableHead className="w-[120px] text-right">Weightage (%)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {goals.map((goal) => (
                  <TableRow key={goal.id}>
                    <TableCell className="font-medium align-top">{goal.thrustArea}</TableCell>
                    <TableCell className="align-top">
                      <div className="font-semibold">{goal.title}</div>
                      <div className="text-sm text-neutral-500 mt-1">{goal.description || "No description"}</div>
                      <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                        UOM: {goal.uomType}
                      </div>
                    </TableCell>
                    <TableCell className="text-right align-top">
                      <Input 
                        type="number" 
                        value={goal.target}
                        onChange={(e) => handleUpdateGoal(goal.id, "target", e.target.value)}
                        disabled={isApproved || isSubmitting}
                        className="text-right font-mono text-sm h-9"
                      />
                    </TableCell>
                    <TableCell className="text-right align-top">
                      <Input 
                        type="number" 
                        value={goal.weightage}
                        onChange={(e) => handleUpdateGoal(goal.id, "weightage", e.target.value)}
                        disabled={isApproved || isSubmitting}
                        className="text-right font-bold text-sm h-9"
                      />
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

