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

  const { goals, achievements, checkIn } = checkInData;

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
      router.refresh();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "An error occurred while saving feedback.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 100) return "bg-emerald-500 text-emerald-500 dark:bg-emerald-500/20 dark:text-emerald-400";
    if (percent >= 50) return "bg-amber-500 text-amber-500 dark:bg-amber-500/20 dark:text-amber-400";
    return "bg-rose-500 text-rose-500 dark:bg-rose-500/20 dark:text-rose-400";
  };

  const getProgressBorderColor = (percent: number) => {
    if (percent >= 100) return "border-emerald-200 dark:border-emerald-900/30";
    if (percent >= 50) return "border-amber-200 dark:border-amber-900/30";
    return "border-rose-200 dark:border-rose-900/30";
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
          className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        <span className="text-xs text-neutral-400 dark:text-neutral-500">
          Cycle: 2026 • Quarter {quarter} Review
        </span>
      </div>

      {/* Grid Layout */}
      <div className="grid gap-8 lg:grid-cols-12">
        
        {/* Left Column: Subordinate details & Review feedback */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Subordinate info card */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-neutral-900 dark:text-neutral-100 leading-snug">
                  {employeeName}
                </h3>
                <p className="text-xs text-neutral-500 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" />
                  {employeeEmail}
                </p>
              </div>
            </div>

            <hr className="border-neutral-150 dark:border-neutral-850" />

            <div className="flex justify-between items-center text-xs">
              <span className="text-neutral-400">Quarter:</span>
              <span className="font-semibold text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded">
                Q{quarter} Review
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-neutral-400">Submission Status:</span>
              <span className={cn(
                "px-2 py-0.5 rounded font-semibold",
                checkInData.status === "SUBMITTED"
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
                  : "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400"
              )}>
                {checkInData.status === "SUBMITTED" ? "Submitted" : "Draft Saved"}
              </span>
            </div>
          </div>

          {/* Employee general notes */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm space-y-3">
            <h4 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-neutral-400" />
              Employee's Q{quarter} Comments
            </h4>
            <div className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-150 dark:border-neutral-850/50 rounded-lg p-3 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400 min-h-[80px]">
              {checkIn?.notes ? (
                <p className="whitespace-pre-line">{checkIn.notes}</p>
              ) : (
                <span className="italic text-neutral-400">No overall comments submitted.</span>
              )}
            </div>
          </div>

          {/* Manager feedback feedback form */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm space-y-4">
            <h4 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-neutral-400" />
              Manager's Qualitative Feedback
            </h4>
            
            <p className="text-xs text-neutral-500">
              Provide reviews on achievement progression and outline directives for next quarter.
            </p>

            <textarea
              className="w-full h-32 text-xs p-3 rounded-lg bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400 outline-none text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 resize-none transition-all"
              placeholder="Provide comments, observations, or directives..."
              value={managerComment}
              onChange={(e) => setManagerComment(e.target.value)}
            />

            <button
              onClick={handleSaveReview}
              disabled={isSubmitting || !checkIn?.id}
              className="w-full py-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-850 dark:bg-neutral-50 dark:hover:bg-neutral-200 text-white dark:text-black font-semibold text-xs transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving Feedback...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Complete Q{quarter} Review
                </>
              )}
            </button>
            {!checkIn?.id && (
              <p className="text-[10px] text-rose-500 text-center">
                Employee must save a check-in draft before you can add feedback.
              </p>
            )}
          </div>

        </div>

        {/* Right Column: Goal-by-goal list and calculated metrics */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Progress Banner */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm flex flex-col md:flex-row items-center md:justify-between gap-4">
            <div className="space-y-1 text-center md:text-left">
              <span className="text-[10px] font-bold text-neutral-400 tracking-wider uppercase">
                Aggregated Analytics
              </span>
              <h3 className="font-bold text-lg text-neutral-900 dark:text-neutral-50 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-neutral-400" />
                Sheet Weighted Progress
              </h3>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end gap-1">
                <span className="text-3xl font-extrabold text-neutral-950 dark:text-white">
                  {overallProgress}%
                </span>
                <span className="text-[10px] font-semibold text-neutral-400">
                  Target Completion Ratio
                </span>
              </div>
              <div className="w-12 h-12 rounded-full border-4 border-neutral-100 dark:border-neutral-800 flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
                <Award className="w-5 h-5 text-neutral-400" />
              </div>
            </div>
          </div>

          {/* Goal-by-goal list */}
          <div className="space-y-4">
            <h4 className="font-bold text-sm text-neutral-900 dark:text-neutral-100 px-1">
              Subordinate Goals & Target Achievements ({goals.length})
            </h4>

            {goals.map((goal) => {
              const ach = getGoalAchievement(goal.id);
              const progressObj = ProgressCalculator.calculate(
                goal.uomType as UomType,
                goal.target,
                ach.value
              );

              return (
                <div
                  key={goal.id}
                  className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm space-y-4 hover:border-neutral-350 dark:hover:border-neutral-750 transition-all duration-200"
                >
                  {/* Goal Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {goal.thrustArea && (
                          <span className="px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700/50">
                            {goal.thrustArea}
                          </span>
                        )}
                        <span className="px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                          Weight: {goal.weightage}%
                        </span>
                      </div>
                      <h5 className="font-bold text-sm text-neutral-900 dark:text-neutral-50 leading-tight">
                        {goal.title}
                      </h5>
                    </div>

                    <div className="flex flex-col sm:items-end gap-1">
                      <span className={cn(
                        "text-xs px-2.5 py-0.5 rounded-full font-bold border",
                        getProgressColor(progressObj.clamped),
                        getProgressBorderColor(progressObj.clamped)
                      )}>
                        {progressObj.clamped}% ({getProgressBadgeLabel(progressObj.clamped)})
                      </span>
                    </div>
                  </div>

                  {/* Goal Description */}
                  {goal.description && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed bg-neutral-50/50 dark:bg-neutral-950/20 p-2.5 rounded-lg border border-neutral-100 dark:border-neutral-800/40">
                      {goal.description}
                    </p>
                  )}

                  {/* Quantitative metrics grid */}
                  <div className="grid grid-cols-3 gap-4 bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-150 dark:border-neutral-850/60 rounded-lg p-3 text-center">
                    <div>
                      <span className="block text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                        Target Value
                      </span>
                      <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                        {goal.target}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                        Achievement
                      </span>
                      <span className="text-xs font-bold text-neutral-950 dark:text-white">
                        {ach.value}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                        UOM Type
                      </span>
                      <span className="text-[10px] font-bold text-neutral-700 dark:text-neutral-300 capitalize">
                        {formatUOM(goal.uomType)}
                      </span>
                    </div>
                  </div>

                  {/* Clamped progress meter */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-semibold text-neutral-400">
                      <span>Clamped Progress (0-100%)</span>
                      <span>{progressObj.clamped}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
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
                      <p className="text-[10px] font-medium text-emerald-500 flex items-center gap-1">
                        ✨ Overachieved! Raw Progress is {progressObj.raw}%
                      </p>
                    )}
                  </div>

                  {/* Qualitative comments from employee */}
                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] font-semibold text-neutral-400 block">
                      Employee Goal Comment
                    </span>
                    <div className="bg-neutral-50/50 dark:bg-neutral-950/20 border border-neutral-150 dark:border-neutral-850/50 rounded-lg p-2.5 text-xs text-neutral-600 dark:text-neutral-400 italic">
                      {ach.notes ? (
                        <span className="not-italic leading-relaxed">{ach.notes}</span>
                      ) : (
                        <span>No comment provided.</span>
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
