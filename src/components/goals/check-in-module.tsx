"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Loader2, 
  Target, 
  Calendar, 
  ClipboardCheck, 
  MessageSquare, 
  AlertCircle, 
  Sparkles, 
  CheckCircle2, 
  Save, 
  Hourglass
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface AchievementState {
  value: number;
  status: string;
  notes: string;
}

export function CheckInModule() {
  const [quarter, setQuarter] = useState<number>(1);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [achievements, setAchievements] = useState<Record<string, AchievementState>>({});
  const [checkInNotes, setCheckInNotes] = useState<string>("");
  const [managerComment, setManagerComment] = useState<string>("");
  const [status, setStatus] = useState<string>("LOADING");
  const [reason, setReason] = useState<string>("");
  const [sheetStatus, setSheetStatus] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const cycleId = "2026";

  // Fetch check-in details whenever selected quarter changes
  useEffect(() => {
    const fetchCheckInData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/check-ins?cycleId=${cycleId}&quarter=${quarter}`);
        if (response.ok) {
          const data = await response.json();
          setStatus(data.status);
          setReason(data.reason || "");
          setSheetStatus(data.sheetStatus || "");
          setGoals(data.goals || []);

          // Initialize achievements inputs from saved values or defaults
          const loadedAchievements: Record<string, AchievementState> = {};
          data.goals.forEach((g: Goal) => {
            const matched = data.achievements?.find((a: any) => a.goalId === g.id);
            loadedAchievements[g.id] = {
              value: matched ? matched.value : 0,
              status: matched ? matched.status : "Not Started",
              notes: matched ? (matched.notes || "") : "",
            };
          });
          setAchievements(loadedAchievements);
          setCheckInNotes(data.checkIn?.notes || "");
          setManagerComment(data.checkIn?.managerComment || "");
        } else {
          throw new Error("Failed to load details");
        }
      } catch (error) {
        console.error("Failed to load check-in data:", error);
        toast.error("Error retrieving check-in data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCheckInData();
  }, [quarter, cycleId]);

  const handleAchievementChange = (goalId: string, field: keyof AchievementState, value: any) => {
    setAchievements((prev) => ({
      ...prev,
      [goalId]: {
        ...prev[goalId],
        [field]: value,
      },
    }));
  };

  const handleSubmitCheckIn = async () => {
    setIsSaving(true);
    try {
      // Validate inputs locally first
      const formattedAchievements = Object.entries(achievements).map(([goalId, state]) => {
        const parsedVal = parseFloat(state.value as any);
        if (isNaN(parsedVal)) {
          throw new Error("All goal achievements must have numeric values.");
        }
        return {
          goalId,
          value: parsedVal,
          status: state.status,
          notes: state.notes,
        };
      });

      const response = await fetch("/api/check-ins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cycleId,
          quarter,
          notes: checkInNotes,
          achievements: formattedAchievements,
        }),
      });

      if (response.ok) {
        toast.success(`Q${quarter} performance check-in submitted successfully!`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to submit check-in.");
      }
    } catch (error: any) {
      console.error("Failed to save check-in:", error);
      toast.error(error.message || "Error submitting quarterly check-in.");
    } finally {
      setIsSaving(false);
    }
  };

  // Helper to color-code status options
  const getStatusColor = (val: string) => {
    switch (val) {
      case "Completed":
        return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
      case "On Track":
        return "text-amber-500 bg-amber-500/10 border-amber-500/20";
      case "Not Started":
      default:
        return "text-neutral-500 bg-neutral-500/10 border-neutral-500/20";
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-neutral-400" />
        <p className="text-sm text-neutral-400">Loading check-in workspace...</p>
      </div>
    );
  }

  // Handle Locked/Awaiting Approval Empty State
  if (status === "LOCKED") {
    return (
      <Card className="border border-dashed border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm max-w-2xl mx-auto mt-8">
        <CardContent className="flex flex-col items-center justify-center p-12 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-amber-500" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-xl font-bold">Check-ins Currently Locked</CardTitle>
            <CardDescription className="text-neutral-500 dark:text-neutral-400 max-w-md">
              {reason || "Your performance goals must be approved before you can start check-ins."}
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs uppercase px-3 py-1 font-mono font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
            Goal Status: {sheetStatus || "NOT STARTED"}
          </Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-neutral-100 dark:border-neutral-800 pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">Quarterly Check-In Workspace</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Provide actual progress metrics, performance statuses, and qualitative details for cycle {cycleId}.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-900 p-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800">
          {[1, 2, 3, 4].map((q) => (
            <Button
              key={q}
              variant={quarter === q ? "default" : "ghost"}
              size="sm"
              onClick={() => setQuarter(q)}
              className={cn(
                "rounded-lg px-4 h-9 font-bold text-xs uppercase tracking-wider transition-all duration-200",
                quarter === q 
                  ? "bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-950 shadow-md"
                  : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
              )}
            >
              Q{q}
            </Button>
          ))}
        </div>
      </div>

      {/* Manager Feedback Banner (if reviewed) */}
      {managerComment && (
        <Card className="border border-indigo-200 dark:border-indigo-950/40 bg-indigo-50/30 dark:bg-indigo-950/10 backdrop-blur-sm shadow-sm overflow-hidden">
          <CardContent className="p-5 flex gap-3">
            <div className="shrink-0 mt-0.5 w-8 h-8 rounded-lg bg-indigo-150 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider">
                Manager's Feedback & Review
              </h4>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed italic">
                "{managerComment}"
              </p>
            </div>
          </CardContent>
        </Card>
      )}
 
      {/* Goal Check-in Form */}
      <div className="grid gap-6">
        {goals.map((goal) => {
          const state = achievements[goal.id] || { value: 0, status: "Not Started", notes: "" };
          
          return (
            <Card key={goal.id} className="overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardHeader className="bg-neutral-50/50 dark:bg-neutral-900/50 border-b border-neutral-100 dark:border-neutral-800 p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1 max-w-[70%]">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-neutral-200/50 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 font-semibold text-[10px] uppercase">
                        {goal.thrustArea}
                      </Badge>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        Weightage: {goal.weightage}%
                      </Badge>
                    </div>
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mt-1">{goal.title}</h3>
                    {goal.description && (
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">{goal.description}</p>
                    )}
                  </div>
                  
                  {/* Goal Targets */}
                  <div className="text-right shrink-0">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 dark:text-neutral-500">Target Metric</span>
                    <div className="text-lg font-extrabold text-neutral-900 dark:text-neutral-50 font-mono mt-0.5">
                      {goal.target} <span className="text-xs font-normal text-neutral-500 dark:text-neutral-400 uppercase">{goal.uomType.replace(/_/g, " ")}</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-6 grid gap-6 md:grid-cols-12">
                {/* Achievement Input */}
                <div className="space-y-2 md:col-span-3">
                  <Label htmlFor={`val-${goal.id}`} className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Q{quarter} Actual Value
                  </Label>
                  <Input
                    id={`val-${goal.id}`}
                    type="number"
                    step="0.01"
                    className="font-mono dark:bg-neutral-950"
                    placeholder="0.00"
                    value={state.value}
                    onChange={(e) => handleAchievementChange(goal.id, "value", e.target.value)}
                  />
                </div>

                {/* Progress Status */}
                <div className="space-y-2 md:col-span-3">
                  <Label className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Status
                  </Label>
                  <Select
                    value={state.status}
                    onValueChange={(val) => handleAchievementChange(goal.id, "status", val)}
                  >
                    <SelectTrigger className={cn("font-medium dark:bg-neutral-950", getStatusColor(state.status))}>
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Not Started" className="text-neutral-500">Not Started</SelectItem>
                      <SelectItem value="On Track" className="text-amber-500">On Track</SelectItem>
                      <SelectItem value="Completed" className="text-emerald-500">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Achievement Notes */}
                <div className="space-y-2 md:col-span-6">
                  <Label htmlFor={`notes-${goal.id}`} className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Check-In Comments / Notes
                  </Label>
                  <Textarea
                    id={`notes-${goal.id}`}
                    placeholder="Describe specific key achievements, metrics, or blockages..."
                    className="min-h-[80px] text-sm dark:bg-neutral-950"
                    value={state.notes}
                    onChange={(e) => handleAchievementChange(goal.id, "notes", e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Overall Quarter Notes Card */}
      <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm mt-6">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-3">
            <Sparkles className="w-5 h-5 text-neutral-500" />
            <h3 className="text-md font-bold text-neutral-900 dark:text-neutral-100">Overall Q{quarter} Review Summary</h3>
          </div>
          <div className="space-y-2">
            <Label htmlFor="overall-notes" className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Provide an overall quarterly summary for your manager
            </Label>
            <Textarea
              id="overall-notes"
              placeholder="Highlight general performance achievements, obstacles, development points, or overall feedback..."
              className="min-h-[120px] dark:bg-neutral-950"
              value={checkInNotes}
              onChange={(e) => setCheckInNotes(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end pt-4 gap-3">
        <Button
          onClick={handleSubmitCheckIn}
          disabled={isSaving}
          className="bg-neutral-800 hover:bg-neutral-700 text-white dark:bg-neutral-200 dark:hover:bg-neutral-100 dark:text-neutral-950 font-bold px-8 h-12 text-sm shadow-md flex items-center gap-2"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <ClipboardCheck className="w-4 h-4" />
              Submit Q{quarter} Check-In
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
