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
  Hourglass,
  ArrowRight,
  TrendingUp
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
  value: number | string;
  status: string;
  notes: string;
}

export function SharedKpiModule() {
  const [quarter, setQuarter] = useState<number>(1);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [achievements, setAchievements] = useState<Record<string, AchievementState>>({});
  const [status, setStatus] = useState<string>("LOADING");
  const [reason, setReason] = useState<string>("Loading check-in workspace...");
  const [sheetStatus, setSheetStatus] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

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
          const sharedGoals = (data.goals || []).filter((g: any) => g.sharedGoalId);
          setGoals(sharedGoals);

          // Initialize achievements inputs from saved values or defaults
          const loadedAchievements: Record<string, AchievementState> = {};
          sharedGoals.forEach((g: Goal) => {
            const matched = data.achievements?.find((a: any) => a.goalId === g.id);
            loadedAchievements[g.id] = {
              value: matched && matched.value !== null && matched.value !== undefined ? matched.value : "",
              status: matched ? matched.status : "Not Started",
              notes: matched ? (matched.notes || "") : "",
            };
          });
          setAchievements(loadedAchievements);
          setIsSubmitted(data.achievements && data.achievements.length > 0);
          // Shared KPIs do not use global checkInNotes or managerComment
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
    setIsSubmitted(false);
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
        const goal = goals.find(g => g.id === goalId);
        const parsedVal = parseFloat(state.value as any);
        if (isNaN(parsedVal)) {
          throw new Error("All goal achievements must have numeric values.");
        }
        if (goal && parsedVal > goal.target) {
          throw new Error(`Actual value for goal "${goal.title}" cannot exceed the numeric max target of ${goal.target}.`);
        }
        return {
          goalId,
          value: parsedVal,
          status: state.status,
          notes: state.notes,
        };
      });

      const response = await fetch("/api/shared-kpis/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cycleId,
          quarter,
          achievements: formattedAchievements,
        }),
      });

      if (response.ok) {
        toast.success(`Q${quarter} Shared KPI progress updated successfully!`);
        setIsSubmitted(true);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update progress.");
      }
    } catch (error: any) {
      console.error("Failed to save progress:", error);
      toast.error(error.message || "Error updating Shared KPI progress.");
    } finally {
      setIsSaving(false);
    }
  };

  // Helper to color-code status options inside Select triggers dynamically
  const getStatusColor = (val: string) => {
    switch (val) {
      case "Completed":
        return "text-emerald-400 bg-emerald-950/45 border-emerald-900/60 shadow-[0_2px_10px_rgba(16,185,129,0.05)]";
      case "On Track":
        return "text-amber-450 bg-amber-950/45 border-amber-900/60 shadow-[0_2px_10px_rgba(245,158,11,0.05)]";
      case "Not Started":
      default:
        return "text-zinc-400 bg-zinc-900/60 border-zinc-800";
    }
  };

  const hasValidationErrors = goals.some((goal) => {
    const state = achievements[goal.id];
    if (!state) return false;
    const parsedVal = parseFloat(state.value as any);
    return !isNaN(parsedVal) && parsedVal > goal.target;
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[45vh] space-y-4 animate-in fade-in-50 duration-300">
        <div className="relative flex items-center justify-center">
          <div className="h-12 w-12 rounded-full border-2 border-zinc-800 border-t-blue-500 animate-spin" />
          <Target className="w-5 h-5 text-blue-500 absolute animate-pulse" />
        </div>
        <div className="space-y-1 text-center">
          <p className="text-sm font-bold text-zinc-200">Loading Workspace</p>
          <p className="text-xs text-zinc-500">Retrieving quarterly key performance indicators...</p>
        </div>
      </div>
    );
  }

  // Handle Locked/Awaiting Approval Empty State
  if (status === "LOCKED") {
    return (
      <div className="animate-in fade-in-50 slide-in-from-bottom-4 duration-300">
        <Card className="border border-zinc-850 bg-zinc-950/40 shadow-xl max-w-2xl mx-auto mt-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
          <CardContent className="flex flex-col items-center justify-center p-12 text-center space-y-6">
            <div className="size-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300">
              <AlertCircle className="w-8 h-8 text-amber-500 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black tracking-tight text-zinc-100 bg-gradient-to-r from-white to-zinc-450 bg-clip-text text-transparent">
                Check-ins Temporarily Locked
              </h3>
              <p className="text-xs text-zinc-450 max-w-md leading-relaxed">
                {reason || "Your performance goals must be fully approved by your manager before quarterly check-ins can be initiated."}
              </p>
            </div>
            <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest px-3.5 py-1.5 font-mono border-zinc-800 bg-zinc-900/60 text-zinc-300 backdrop-blur-md">
              Goal Sheet Status: {sheetStatus || "NOT STARTED"}
            </Badge>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300">
      {/* Header Info & Selector */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-zinc-900 pb-6">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-zinc-100 bg-gradient-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
            Shared KPI Progress
          </h2>
          <p className="text-xs text-zinc-450 mt-1 leading-relaxed">
            Record actual metrics and document outcomes for your assigned Shared KPIs for cycle {cycleId}.
          </p>
        </div>
        
        <div className="flex items-center gap-2 bg-zinc-950/40 border border-zinc-850 p-1.5 rounded-xl backdrop-blur-md">
          {[1, 2, 3, 4].map((q) => (
            <Button
              key={q}
              variant={quarter === q ? "default" : "ghost"}
              size="sm"
              onClick={() => setQuarter(q)}
              className={cn(
                "rounded-lg px-4 h-9 font-black text-xs uppercase tracking-wider transition-all duration-200",
                quarter === q 
                  ? "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_2px_10px_rgba(37,99,235,0.2)]"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
              )}
            >
              Q{q}
            </Button>
          ))}
        </div>
      </div>


      {/* Goal Check-in Form */}
      <div className="grid gap-6">
        {goals.map((goal, index) => {
          const state = achievements[goal.id] || { value: 0, status: "Not Started", notes: "" };
          
          return (
            <div 
              key={goal.id} 
              className="bg-zinc-950/40 border border-zinc-850 rounded-xl p-6 shadow-md transition-all duration-300 hover:border-zinc-800 relative overflow-hidden group space-y-6"
            >
              {/* Subtle background glow on group hover */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-zinc-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-zinc-500/10 transition-all duration-300" />
              
              {/* Header Panel */}
              <div className="flex flex-col md:flex-row justify-between items-start gap-4 pb-5 border-b border-zinc-900 relative z-10">
                <div className="space-y-2 max-w-[80%]">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-zinc-900 text-zinc-300 border border-zinc-800 text-[9px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 hover:bg-zinc-900">
                      {goal.thrustArea}
                    </Badge>
                  </div>
                  <h3 className="text-lg font-black text-zinc-100 tracking-tight mt-1.5 leading-snug">
                    {goal.title}
                  </h3>
                  {goal.description && (
                    <p className="text-xs text-zinc-450 font-medium leading-relaxed">
                      {goal.description}
                    </p>
                  )}
                </div>
                
                {/* Goal Targets */}
                <div className="md:text-right shrink-0">
                  <span className="text-[10px] uppercase font-black tracking-widest text-zinc-550 block">Target Metric</span>
                  <div className="text-xl font-black text-zinc-100 font-mono mt-1">
                    {goal.target} <span className="text-xs font-bold text-zinc-450 uppercase font-sans tracking-wide ml-1">{goal.uomType.replace(/_/g, " ")}</span>
                  </div>
                </div>
              </div>
              
              {/* Inputs Panel */}
              <div className="grid gap-6 md:grid-cols-12 relative z-10">
                {/* Achievement Input */}
                <div className="space-y-2 md:col-span-3">
                  <Label htmlFor={`val-${goal.id}`} className="text-xs font-bold uppercase tracking-widest text-zinc-450">
                    Q{quarter} Actual Value
                  </Label>
                  <Input
                    id={`val-${goal.id}`}
                    type="number"
                    step="0.01"
                    className="font-mono bg-zinc-900/60 border-zinc-800 text-zinc-100 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 rounded-xl h-11 px-4 text-sm transition-all shadow-inner disabled:opacity-75 disabled:cursor-not-allowed"
                    value={state.value}
                    onChange={(e) => handleAchievementChange(goal.id, "value", e.target.value)}
                  />
                  {state.value !== "" && Number(state.value) > goal.target && (
                    <span className="text-[10px] text-rose-400 font-extrabold block mt-1 animate-in fade-in-50 duration-200">
                      Exceeds target max of {goal.target}
                    </span>
                  )}
                </div>

                {/* Progress Status */}
                <div className="space-y-2 md:col-span-3">
                  <Label className="text-xs font-bold uppercase tracking-widest text-zinc-450">
                    Status
                  </Label>
                  <Select
                    value={state.status}
                    onValueChange={(val) => handleAchievementChange(goal.id, "status", val)}
                  >
                    <SelectTrigger className={cn("font-black h-11 rounded-xl transition-all border", getStatusColor(state.status))}>
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-200">
                      <SelectItem value="Not Started" className="text-zinc-400 focus:bg-zinc-900 focus:text-white">Not Started</SelectItem>
                      <SelectItem value="On Track" className="text-amber-400 focus:bg-zinc-900 focus:text-white">On Track</SelectItem>
                      <SelectItem value="Completed" className="text-emerald-400 focus:bg-zinc-900 focus:text-white">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Achievement Notes */}
                <div className="space-y-2 md:col-span-6">
                  <Label htmlFor={`notes-${goal.id}`} className="text-xs font-bold uppercase tracking-widest text-zinc-450 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-zinc-500" />
                    Check-In Comments / Notes
                  </Label>
                  <Textarea
                    id={`notes-${goal.id}`}
                    placeholder="Describe specific key achievements, metrics, or blockages..."
                    className="min-h-[90px] text-sm bg-zinc-900/60 border-zinc-800 text-zinc-100 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 rounded-xl p-3.5 leading-relaxed transition-all shadow-inner disabled:opacity-75 disabled:cursor-not-allowed"
                    value={state.notes}
                    onChange={(e) => handleAchievementChange(goal.id, "notes", e.target.value)}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>


      {/* Actions Panel */}
      <div className="flex justify-end pt-4 gap-3">
        <Button
          onClick={handleSubmitCheckIn}
          disabled={isSaving || hasValidationErrors}
          className={cn(
            "rounded-xl font-bold h-12 px-8 flex items-center justify-center gap-2 transition-all duration-200",
            isSubmitted && !isSaving
              ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_4px_20px_rgba(16,185,129,0.15)] hover:shadow-[0_4px_20px_rgba(16,185,129,0.3)] hover:scale-[1.02] active:scale-[0.98]"
              : "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_4px_20px_rgba(37,99,235,0.15)] hover:shadow-[0_4px_20px_rgba(37,99,235,0.3)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none"
          )}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              Updating Progress...
            </>
          ) : isSubmitted ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Already Submitted
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Progress
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
