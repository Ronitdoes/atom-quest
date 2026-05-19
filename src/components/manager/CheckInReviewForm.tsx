"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProgressCalculator } from "@/lib/services/progress-calculator";
import { UomType } from "@prisma/client";
import { 
  ArrowLeft, 
  Check, 
  AlertCircle, 
  Calendar, 
  BookOpen, 
  TrendingUp, 
  Loader2, 
  Award, 
  User, 
  Mail,
  ChevronRight,
  ClipboardList
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface CheckInReviewFormProps {
  checkInData: {
    status: "DRAFT" | "SUBMITTED" | "NOT_STARTED";
    goals: any[];
    achievements: any[];
    checkIn: any | null;
  };
  employeeName: string;
  employeeEmail: string;
  quarter: number;
  userId: string;
}

export function CheckInReviewForm({
  checkInData,
  employeeName,
  employeeEmail,
  quarter,
  userId,
}: CheckInReviewFormProps) {
  const router = useRouter();
  const [managerComment, setManagerComment] = useState<string>(
    checkInData.checkIn?.managerComment || ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinalized, setIsFinalized] = useState<boolean>(
    checkInData.checkIn?.managerComment !== null && checkInData.checkIn?.managerComment !== undefined
  );

  const { goals: allGoals, achievements, checkIn } = checkInData;
  const goals = allGoals.filter((g: any) => !g.sharedGoalId);
  const isReviewComplete = isFinalized || (checkIn?.managerComment !== null && checkIn?.managerComment !== undefined);

  // Map achievements for rapid lookup
  const getGoalAchievement = (goalId: string) => {
    const ach = achievements.find((a) => a.goalId === goalId);
    return {
      value: ach ? ach.value : 0,
      notes: ach ? ach.notes : "",
      status: ach ? ach.status : "Not Started",
    };
  };

  // Prepare goal-with-achievement mapping for overall calculations
  const calculatedGoals = goals.map((goal) => {
    const ach = getGoalAchievement(goal.id);
    return {
      uomType: goal.uomType as UomType,
      target: goal.target,
      achievementValue: ach.value,
      weightage: goal.weightage,
    };
  });

  const overallProgress = ProgressCalculator.calculateWeightedProgress(calculatedGoals);

  const handleSaveReview = async () => {
    if (!checkIn?.id) {
      toast.error("Check-in record does not exist yet.");
      return;
    }
    if (isReviewComplete) {
      toast.error("This review has already been finalized.");
      return;
    }
    if (!managerComment.trim()) {
      toast.error("Please provide qualitative feedback comments before completing the review.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/check-ins/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          checkInId: checkIn.id,
          managerComment,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to submit review feedback.");
      }

      toast.success("Check-in review feedback saved successfully!");
      setIsFinalized(true);
      router.refresh();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "An error occurred while saving feedback.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 100) return "bg-emerald-950/30 text-emerald-400 border-emerald-900/65";
    if (percent >= 75) return "bg-blue-950/30 text-blue-400 border-blue-900/65";
    if (percent >= 50) return "bg-amber-950/30 text-amber-400 border-amber-900/65";
    return "bg-rose-950/30 text-rose-400 border-rose-900/65";
  };

  const getProgressBadgeLabel = (percent: number) => {
    if (percent >= 100) return "Target Exceeded";
    if (percent >= 75) return "On Track";
    if (percent >= 50) return "Needs Attention";
    return "Off Track";
  };

  const formatUOM = (uom: string) => {
    return uom.replace("_", " ").toLowerCase();
  };

  return (
    <div className="space-y-6">
      {/* Top Header Actions */}
      <div className="flex items-center justify-between">
        <Link
          href="/manager"
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-100 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-zinc-500" />
          Back to Dashboard
        </Link>
        <span className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-widest bg-zinc-900/60 border border-zinc-850 px-3.5 py-1.5 rounded-full">
          Cycle: 2026 • Q{quarter} Performance Review
        </span>
      </div>

      {/* Grid Layout */}
      <div className="grid gap-8 lg:grid-cols-12">
        
        {/* Left Column: Subordinate details & Review feedback */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Subordinate info card */}
          <div className="bg-zinc-950/40 border border-zinc-850 rounded-2xl p-5 shadow-xl relative overflow-hidden group transition-all duration-300 hover:border-zinc-800">
            <div className="absolute top-0 right-0 w-24 h-24 bg-zinc-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-zinc-500/10 transition-all duration-300" />
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 shadow-inner group-hover:scale-105 transition-all duration-300">
                <User className="w-6 h-6 text-blue-400" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] uppercase font-black tracking-widest text-zinc-500 block">Employee Profile</span>
                <h3 className="font-black text-base text-zinc-100 leading-snug group-hover:text-white transition-colors">
                  {employeeName}
                </h3>
                <p className="text-xs text-zinc-400 flex items-center gap-1.5 font-medium">
                  <Mail className="w-3.5 h-3.5 text-zinc-500" />
                  {employeeEmail}
                </p>
              </div>
            </div>

            <div className="border-t border-zinc-900 my-4" />

            <div className="space-y-3 relative z-10">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Review Period:</span>
                <Badge className="bg-zinc-900 text-zinc-300 border border-zinc-800 text-[10px] font-mono px-2.5 py-0.5 hover:bg-zinc-900">
                  Q{quarter} Review
                </Badge>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Submission Status:</span>
                <span className={cn(
                  "px-3 py-1 rounded-full font-black text-[10px] tracking-wide border uppercase",
                  checkInData.status === "SUBMITTED"
                    ? "bg-emerald-950/30 text-emerald-400 border-emerald-900/65"
                    : "bg-amber-950/30 text-amber-400 border-amber-900/65"
                )}>
                  {checkInData.status === "SUBMITTED" ? "Submitted" : "Draft Saved"}
                </span>
              </div>
            </div>
          </div>

          {/* Employee general notes */}
          <div className="bg-zinc-950/40 border border-zinc-850 rounded-2xl p-5 shadow-xl relative overflow-hidden group transition-all duration-300 hover:border-zinc-800">
            <div className="absolute top-0 right-0 w-24 h-24 bg-zinc-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-zinc-500/10 transition-all duration-300" />
            <h4 className="font-black text-xs uppercase tracking-wider text-zinc-200 flex items-center gap-2 pb-3 border-b border-zinc-900 relative z-10">
              <ClipboardList className="w-4 h-4 text-blue-400" />
              Employee Q{quarter} Comments
            </h4>
            <div className="bg-zinc-900/60 border border-zinc-850 p-4 rounded-xl text-xs leading-relaxed text-zinc-300 italic font-medium min-h-[90px] shadow-inner mt-3 relative z-10">
              {checkIn?.notes ? (
                <p className="whitespace-pre-line not-italic leading-relaxed">{checkIn.notes}</p>
              ) : (
                <span className="text-zinc-500">No overall comments submitted by the employee.</span>
              )}
            </div>
          </div>

          {/* Manager feedback feedback form */}
          <div className="bg-zinc-950/40 border border-zinc-850 rounded-2xl p-5 shadow-xl relative overflow-hidden group transition-all duration-300 hover:border-zinc-800">
            <div className="absolute top-0 right-0 w-24 h-24 bg-zinc-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-zinc-500/10 transition-all duration-300" />
            <h4 className="font-black text-xs uppercase tracking-wider text-zinc-200 flex items-center gap-2 pb-3 border-b border-zinc-900 relative z-10">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              Manager's Qualitative Feedback
            </h4>
            
            <p className="text-xs text-zinc-400 leading-relaxed pt-3 relative z-10">
              Provide reviews on achievement progression and outline directives for next quarter.
            </p>

            <textarea
              className="w-full h-36 text-sm p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 outline-none text-zinc-100 placeholder-zinc-500 resize-none transition-all shadow-inner relative z-10 mt-3.5 leading-relaxed disabled:opacity-75 disabled:cursor-not-allowed"
              placeholder="Provide comments, observations, or directives..."
              value={managerComment}
              onChange={(e) => setManagerComment(e.target.value)}
              disabled={isReviewComplete}
            />

            {isReviewComplete && (
              <div className="bg-emerald-950/20 border border-emerald-900/50 rounded-xl p-3.5 mt-3 relative z-10 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  <span className="font-bold text-emerald-400">Review Complete:</span> This check-in has been finalized and cannot be modified. The feedback is now active on the employee's portal.
                </p>
              </div>
            )}

            <div className="pt-2.5 relative z-10">
              <button
                onClick={handleSaveReview}
                disabled={isSubmitting || !checkIn?.id || isReviewComplete}
                className={cn(
                  "w-full h-12 rounded-xl text-white font-bold text-xs transition-all duration-200 flex items-center justify-center gap-2 disabled:pointer-events-none active:scale-[0.98]",
                  isReviewComplete
                    ? "bg-zinc-900 border border-zinc-800 text-zinc-500 shadow-none cursor-not-allowed opacity-80"
                    : "bg-blue-600 hover:bg-blue-500 shadow-[0_4px_20px_rgba(37,99,235,0.15)] hover:shadow-[0_4px_20px_rgba(37,99,235,0.3)] hover:scale-[1.01] disabled:opacity-50"
                )}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    Saving Feedback...
                  </>
                ) : isReviewComplete ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    Q{quarter} Review Finalized
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    Complete Q{quarter} Review
                  </>
                )}
              </button>
              {!checkIn?.id && (
                <p className="text-[10px] text-rose-400 font-extrabold text-center mt-2.5 flex items-center justify-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Employee must save a check-in draft before feedback can be saved.
                </p>
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Goal-by-goal list and calculated metrics */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Progress Banner */}
          <div className="bg-zinc-950/40 border border-zinc-850 rounded-2xl p-6 shadow-xl relative overflow-hidden group flex flex-col md:flex-row items-center md:justify-between gap-5 transition-all duration-300 hover:border-zinc-800">
            <div className="absolute top-0 right-0 w-36 h-36 bg-zinc-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-zinc-500/10 transition-all duration-300" />
            
            <div className="space-y-2 text-center md:text-left relative z-10">
              <span className="text-[9px] font-black text-zinc-500 tracking-widest uppercase block">
                Aggregated Analytics
              </span>
              <h3 className="font-black text-lg text-zinc-100 flex items-center gap-2.5">
                <TrendingUp className="w-5.5 h-5.5 text-blue-400 animate-pulse" />
                Sheet Weighted Progress
              </h3>
            </div>
            
            <div className="flex items-center gap-5 relative z-10">
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-4xl font-black font-mono tracking-tight text-zinc-100">
                  {overallProgress}%
                </span>
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                  Target Completion Ratio
                </span>
              </div>
              <div className="w-14 h-14 rounded-xl border border-zinc-850 bg-zinc-900/60 flex items-center justify-center shadow-inner group-hover:scale-105 transition-all duration-300">
                <Award className="w-6 h-6 text-amber-400" />
              </div>
            </div>
          </div>

          {/* Goal-by-goal list */}
          <div className="space-y-5">
            <h4 className="font-black text-xs uppercase tracking-wider text-zinc-400 px-1">
              Subordinate Goals & Target Achievements ({goals.length})
            </h4>

            {goals.map((goal, index) => {
              const ach = getGoalAchievement(goal.id);
              const progressObj = ProgressCalculator.calculate(
                goal.uomType as UomType,
                goal.target,
                ach.value
              );

              return (
                <div
                  key={goal.id}
                  className="bg-zinc-950/40 border border-zinc-850 rounded-2xl p-6 shadow-xl space-y-5 hover:border-zinc-800 transition-all duration-300 relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-zinc-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-zinc-500/10 transition-all duration-300" />
                  
                  {/* Goal Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-900 relative z-10">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[9px] font-mono font-bold bg-zinc-900 border border-zinc-850 px-2 py-0.5 rounded text-zinc-400">
                          Goal #{index + 1}
                        </span>
                        {goal.thrustArea && (
                          <Badge className="bg-zinc-900 text-zinc-300 border border-zinc-800 text-[9px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 hover:bg-zinc-900">
                            {goal.thrustArea}
                          </Badge>
                        )}
                        <Badge className="bg-blue-950/30 text-blue-400 border border-blue-900/65 text-[9px] font-mono px-2 py-0.5 hover:bg-blue-950/30">
                          Weightage: {goal.weightage}%
                        </Badge>
                      </div>
                      <h5 className="font-black text-base text-zinc-100 tracking-tight leading-snug">
                        {goal.title}
                      </h5>
                    </div>

                    <div className="flex flex-col sm:items-end gap-1">
                      <span className={cn(
                        "text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-wide border",
                        getProgressColor(progressObj.clamped)
                      )}>
                        {progressObj.clamped}% ({getProgressBadgeLabel(progressObj.clamped)})
                      </span>
                    </div>
                  </div>

                  {/* Goal Description */}
                  {goal.description && (
                    <p className="text-xs text-zinc-400 leading-relaxed bg-zinc-900/40 border border-zinc-900 p-3.5 rounded-xl relative z-10">
                      {goal.description}
                    </p>
                  )}

                  {/* Quantitative metrics grid */}
                  <div className="grid grid-cols-3 gap-4 bg-zinc-900/60 border border-zinc-850 rounded-xl p-4 text-center relative z-10 shadow-inner">
                    <div>
                      <span className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                        Target Value
                      </span>
                      <span className="text-lg font-black font-mono text-zinc-100 mt-1 block">
                        {goal.target}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                        Achievement
                      </span>
                      <span className="text-lg font-black font-mono text-zinc-100 mt-1 block">
                        {ach.value}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                        UOM Type
                      </span>
                      <span className="text-[10px] font-black text-blue-400 uppercase tracking-wide mt-2 block">
                        {formatUOM(goal.uomType)}
                      </span>
                    </div>
                  </div>

                  {/* Clamped progress meter */}
                  <div className="space-y-2 relative z-10">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      <span>Clamped Progress (0-100%)</span>
                      <span className="font-mono">{progressObj.clamped}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-zinc-900 border border-zinc-850 overflow-hidden shadow-inner">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          progressObj.clamped >= 100 
                            ? "bg-emerald-500" 
                            : progressObj.clamped >= 50 
                            ? "bg-amber-500" 
                            : "bg-rose-500"
                        )}
                        style={{ width: `${progressObj.clamped}%` }}
                      />
                    </div>
                    {progressObj.raw > progressObj.clamped && (
                      <p className="text-[10px] font-extrabold text-emerald-400 flex items-center gap-1.5 animate-pulse mt-1">
                        ✨ Overachieved! Raw Progress is {progressObj.raw}%
                      </p>
                    )}
                  </div>

                  {/* Qualitative comments from employee */}
                  <div className="space-y-2 pt-1 relative z-10">
                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 block">
                      Employee Goal Comment
                    </span>
                    <div className="bg-zinc-900/60 border border-zinc-850 rounded-xl p-3.5 text-xs text-zinc-300 italic font-medium leading-relaxed shadow-inner">
                      {ach.notes ? (
                        <span className="not-italic leading-relaxed">{ach.notes}</span>
                      ) : (
                        <span className="text-zinc-500">No comment provided for this goal.</span>
                      )}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>

        </div>

      </div>
    </div>
  );
}
