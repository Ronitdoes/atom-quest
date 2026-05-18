"use client";

import { useState, useMemo, useEffect } from "react";
import { GoalFormData, goalSheetSchema } from "@/lib/validators/goal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { GoalForm } from "./goal-form";
import { Plus, Pencil, Trash2, AlertTriangle, CheckCircle2, Save, Send, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useSession } from "next-auth/react";

interface GoalSheetEditorProps {
  initialGoals?: GoalFormData[];
  status?: string;
  managerComment?: string | null;
  onSaveDraft: (goals: GoalFormData[]) => Promise<void>;
  onSubmit: (goals: GoalFormData[]) => Promise<void>;
  isLoading?: boolean;
}

export function GoalSheetEditor({
  initialGoals = [],
  status = "DRAFT",
  managerComment = null,
  onSaveDraft,
  onSubmit,
  isLoading = false,
}: GoalSheetEditorProps) {
  const [goals, setGoals] = useState<GoalFormData[]>(() =>
    initialGoals.map(g => ({
      ...g,
      description: g.description || "",
    }))
  );
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Authentication & Isolation Keys
  const { data: session } = useSession();
  const userId = session?.user?.id || session?.user?.email;

  const storageKey = useMemo(() => {
    if (!userId) return "";
    const sanitized = userId.includes("@") 
      ? btoa(userId).replace(/=/g, "") 
      : userId;
    return `atomquest_draft_goals_${sanitized}`;
  }, [userId]);

  const [localDraft, setLocalDraft] = useState<GoalFormData[] | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  const [showRestoreBanner, setShowRestoreBanner] = useState(false);

  const totalWeightage = useMemo(() => 
    goals.reduce((sum, g) => sum + g.weightage, 0), 
  [goals]);

  const validation = goalSheetSchema.safeParse({ goals });
  const isValid = validation.success;
  const errors = !validation.success ? validation.error.flatten().fieldErrors : {};

  const isLocked = status !== "DRAFT" && status !== "REWORK_REQUIRED";

  useEffect(() => {
    if (!validation.success) {
      console.log("Goal Sheet Validation Failed:", validation.error.format());
    }
  }, [goals, validation]);

  // Clear any existing localStorage drafts on mount to disable the recovery banner
  useEffect(() => {
    if (storageKey) {
      localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  // Auto-save changes to localStorage
  useEffect(() => {
    if (!storageKey || isLocked) return;

    // Do not save if goals list is identical to initial goals (to prevent useless saves)
    if (JSON.stringify(goals) === JSON.stringify(initialGoals)) {
      return;
    }

    if (goals.length > 8) return;

    const envelope = {
      version: 1,
      savedAt: Date.now(),
      goals: goals.map(g => ({
        thrustArea: g.thrustArea,
        title: g.title,
        description: g.description || "",
        target: g.target,
        uomType: g.uomType,
        weightage: g.weightage,
        sharedGoalId: g.sharedGoalId || undefined,
      })), // Restrict to dynamic editable draft fields only
    };

    try {
      localStorage.setItem(storageKey, JSON.stringify(envelope));
    } catch (error) {
      console.warn("Storage quota exceeded or private browsing active, autosave failed.", error);
    }
  }, [goals, storageKey, initialGoals, isLocked]);

  // Cross-tab storage synchronization
  useEffect(() => {
    if (!storageKey || isLocked) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === storageKey && e.newValue) {
        try {
          const envelope = JSON.parse(e.newValue);
          const validationResult = goalSheetSchema.safeParse({ goals: envelope.goals });
          if (validationResult.success) {
            if (JSON.stringify(envelope.goals) !== JSON.stringify(goals)) {
              setGoals(envelope.goals);
              toast.info("Draft synchronized from another open tab.");
            }
          }
        } catch {
          // Ignore tab synchronization errors gracefully
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [storageKey, goals, isLocked]);

  const handleSaveDraft = async () => {
    try {
      await onSaveDraft(goals);
      if (storageKey) {
        localStorage.removeItem(storageKey);
        setShowRestoreBanner(false);
      }
    } catch {
      // Handled by parent
    }
  };

  const handleSubmit = async () => {
    try {
      await onSubmit(goals);
      if (storageKey) {
        localStorage.removeItem(storageKey);
        setShowRestoreBanner(false);
      }
    } catch {
      // Handled by parent
    }
  };

  const handleAddGoal = (data: GoalFormData) => {
    if (goals.length >= 8) {
      toast.error("Maximum 8 goals allowed.");
      return;
    }
    setGoals([...goals, data]);
    setIsModalOpen(false);
    toast.success("Goal added to sheet.");
  };

  const handleUpdateGoal = (data: GoalFormData) => {
    if (editingIndex !== null) {
      const newGoals = [...goals];
      newGoals[editingIndex] = data;
      setGoals(newGoals);
      setEditingIndex(null);
      setIsModalOpen(false);
      toast.success("Goal updated.");
    }
  };

  const handleRemoveGoal = (index: number) => {
    setGoals(goals.filter((_, i) => i !== index));
    toast.info("Goal removed.");
  };

  const openEditModal = (index: number) => {
    setEditingIndex(index);
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setEditingIndex(null);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-zinc-900 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black tracking-tight text-zinc-100 bg-gradient-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">Performance Goal Sheet</h2>
            {storageKey && !isLocked && (
              <span className="text-[9px] bg-zinc-900/60 text-zinc-400 border border-zinc-800 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 font-mono select-none backdrop-blur-md">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                autosaved
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-450 mt-1 leading-relaxed">Define your strategic key performance indicators and balance weightages for this evaluation window.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          {!isLocked && (
            <>
              <Button 
                variant="outline" 
                onClick={handleSaveDraft}
                disabled={isLoading || goals.length === 0}
                className="border-zinc-800 bg-zinc-950/40 text-zinc-300 hover:bg-zinc-900/80 hover:text-white rounded-xl shadow-lg transition-all duration-200 h-10 px-5 flex-1 md:flex-initial"
              >
                <Save className="w-4 h-4 mr-2 opacity-75" />
                Save Draft
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={isLoading || !isValid}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-[0_4px_20px_rgba(37,99,235,0.15)] hover:shadow-[0_4px_20px_rgba(37,99,235,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 h-10 px-6 flex-1 md:flex-initial flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Submit for Approval
              </Button>
            </>
          )}
        </div>
      </div>



      {/* Locked Sheet Banner */}
      {isLocked && (
        <div className="bg-zinc-950/60 border border-blue-500/20 rounded-xl p-5 flex gap-3.5 text-zinc-300 shadow-lg">
          <div className="size-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xs leading-relaxed space-y-0.5">
            <p className="font-bold text-zinc-200 text-sm">Goal Sheet Locked</p>
            <p>Your performance goals have been submitted/approved and are locked for direct editing. Contact your manager or portal admin for revision requests.</p>
          </div>
        </div>
      )}

      {/* Enhanced Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-zinc-950/40 border border-zinc-850 rounded-xl p-6 shadow-md transition-all duration-300 hover:border-zinc-800 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-zinc-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-zinc-500/10 transition-colors" />
          
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs font-bold text-zinc-550 uppercase tracking-widest">
              <span>Total Goals</span>
              <span className="text-[10px] bg-zinc-900 border border-zinc-850 px-2 py-0.5 rounded-full font-mono text-zinc-400">{goals.length} / 8</span>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-black text-zinc-100">{goals.length} <span className="text-xs text-zinc-500 font-normal uppercase tracking-wider">KPIs Added</span></div>
              <div className="bg-zinc-900/60 h-1.5 rounded-full overflow-hidden border border-zinc-900">
                <div 
                  className="bg-gradient-to-r from-zinc-500 to-zinc-300 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${(goals.length / 8) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-zinc-950/40 border border-zinc-850 rounded-xl p-6 shadow-md transition-all duration-300 hover:border-zinc-800 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-zinc-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-zinc-500/10 transition-colors" />
          
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs font-bold text-zinc-550 uppercase tracking-widest">
              <span>Total Weightage</span>
              <span className={`text-[10px] border px-2 py-0.5 rounded-full font-mono font-bold ${totalWeightage === 100 ? "bg-emerald-950/50 border-emerald-900 text-emerald-400" : "bg-amber-950/50 border-amber-900 text-amber-400"}`}>{totalWeightage}% / 100%</span>
            </div>
            <div className="space-y-2">
              <div className={`text-3xl font-black ${totalWeightage === 100 ? "text-emerald-400" : "text-amber-500"}`}>
                {totalWeightage}% <span className="text-xs text-zinc-500 font-normal uppercase tracking-wider">Distributed</span>
              </div>
              <div className="bg-zinc-900/60 h-1.5 rounded-full overflow-hidden border border-zinc-900">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${totalWeightage === 100 ? "bg-gradient-to-r from-emerald-500 to-teal-400" : "bg-gradient-to-r from-amber-500 to-orange-400"}`} 
                  style={{ width: `${Math.min(totalWeightage, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-zinc-950/40 border border-zinc-850 rounded-xl p-6 shadow-md transition-all duration-300 hover:border-zinc-800 relative overflow-hidden group flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-zinc-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-zinc-500/10 transition-colors" />
          
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs font-bold text-zinc-550 uppercase tracking-widest">
              <span>Sheet Status</span>
            </div>
            <div className="flex items-center gap-3">
              <Badge 
                variant={
                  status === "DRAFT" ? "outline" : 
                  status === "APPROVED" ? "default" : 
                  status === "REWORK_REQUIRED" ? "destructive" : "secondary"
                } 
                className={`text-xs py-1 px-3.5 rounded-lg border font-black ${
                  status === "APPROVED" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : 
                  status === "DRAFT" ? "border-zinc-800 bg-zinc-900/40 text-zinc-300" : ""
                }`}
              >
                {status}
              </Badge>
              <span className="text-[10px] text-zinc-550 font-mono">active period</span>
            </div>
          </div>
        </div>
      </div>

      {/* Manager Feedback for Rework */}
      {status === "REWORK_REQUIRED" && managerComment && (
        <div className="bg-rose-950/30 border border-rose-500/20 rounded-xl p-5 flex gap-4 text-zinc-350 shadow-md">
          <div className="size-9 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-rose-450 animate-pulse" />
          </div>
          <div className="text-xs space-y-1.5 leading-relaxed flex-1">
            <p className="font-bold text-rose-400 text-sm">Manager Feedback (Rework Required)</p>
            <div className="bg-zinc-900/60 border border-zinc-850 p-3.5 rounded-lg text-zinc-300 text-sm italic font-medium leading-relaxed shadow-inner">
              "{managerComment}"
            </div>
          </div>
        </div>
      )}

      {/* Validation Panel (Semi-Translucent Glass Layout) */}
      {!isLocked && !isValid && goals.length > 0 && (
        <div className="bg-zinc-950/80 border border-amber-500/20 rounded-xl p-5 flex gap-4 text-zinc-300 shadow-md backdrop-blur-md">
          <div className="size-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-xs space-y-1.5 leading-relaxed">
            <p className="font-bold text-zinc-200 text-sm">Action Required for Submission</p>
            <ul className="space-y-1 text-zinc-400">
              {totalWeightage !== 100 && (
                <li className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Total goal weightage must sum up to exactly <span className="font-semibold text-zinc-200">100%</span> (currently at {totalWeightage}%)
                </li>
              )}
              {goals.length < 1 && (
                <li className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  At least one strategic goal must be added
                </li>
              )}
              {goals.some(g => g.weightage < 10) && (
                <li className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Each performance indicator must have a minimum of <span className="font-semibold text-zinc-200">10%</span> weightage
                </li>
              )}
              {!validation.success && validation.error.issues.map((issue, idx) => {
                // Skip the custom refined 100% weightage check, since we already show a custom readable message for it above
                if (issue.code === "custom" && issue.message.includes("100%")) return null;
                
                const goalNum = typeof issue.path[1] === "number" ? `Goal ${issue.path[1] + 1} (${goals[issue.path[1]]?.title || "Indicator"}): ` : "";
                return (
                  <li key={idx} className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    <span>{goalNum}{issue.message}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {!isLocked && isValid && status === "DRAFT" && (
        <div className="bg-zinc-950/80 border border-emerald-500/20 rounded-xl p-5 flex gap-4 text-zinc-300 shadow-md backdrop-blur-md">
          <div className="size-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-xs space-y-1 leading-relaxed">
            <p className="font-bold text-zinc-250 text-sm">Goal Sheet Compliant!</p>
            <p className="text-zinc-400">All weightage parameters and KPI conditions are met. You are clear to submit your performance sheet for manager review.</p>
          </div>
        </div>
      )}

      {/* Goals Card Grid (Modern row items instead of a simple HTML table) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-900 pb-2.5">
          <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-550">Active KPI Specifications</h3>
          <span className="text-[10px] text-zinc-500 font-mono font-medium">{goals.length} target areas</span>
        </div>

        {goals.length === 0 ? (
          /* Sleek Empty State Card */
          <div className="border border-dashed border-zinc-800 bg-zinc-950/10 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-5">
            <div className="size-14 rounded-full bg-zinc-900 border border-zinc-850 flex items-center justify-center shadow-inner relative group pointer-events-none">
              <Plus className="w-5 h-5 text-zinc-550" />
              <div className="absolute inset-0 bg-zinc-500/5 rounded-full blur-sm" />
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-zinc-200">No Indicators Defined</h4>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed">
                Click 'Add New Goal' below to define your first key performance indicator, thrust area, and evaluation targets.
              </p>
            </div>
          </div>
        ) : (
          /* Premium Goal Card Rows */
          <div className="grid grid-cols-1 gap-4">
            {goals.map((goal, index) => (
              <div 
                key={index}
                className="bg-zinc-950/60 border border-zinc-850/80 rounded-xl p-5 hover:border-zinc-800 transition-all duration-200 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-5 relative overflow-hidden group"
              >
                {/* Visual Accent bar */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-zinc-700/60 group-hover:bg-zinc-500 transition-colors" />

                <div className="flex-1 space-y-3.5 pl-2.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-350 bg-zinc-900 border border-zinc-800/80 px-2 py-0.5 rounded">
                      {goal.thrustArea}
                    </span>
                    {goal.sharedGoalId && (
                      <span className="text-[8px] bg-zinc-900 border border-zinc-800 text-zinc-550 px-1.5 py-0.2 rounded uppercase font-extrabold">
                        Shared Template
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-zinc-150 group-hover:text-white transition-colors">{goal.title}</h4>
                    <p className="text-xs text-zinc-450 leading-relaxed max-w-3xl">
                      {goal.description || "No specific qualitative notes provided for this goal."}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap md:flex-nowrap items-center gap-6 w-full md:w-auto justify-between md:justify-end pl-2.5 md:pl-0 pt-3 md:pt-0 border-t border-zinc-900/60 md:border-none">
                  {/* Target Details */}
                  <div className="space-y-1 text-left md:text-right">
                    <span className="text-[10px] text-zinc-550 uppercase font-bold tracking-wider block">Evaluation Target</span>
                    <span className="font-mono text-xs text-zinc-300 bg-zinc-900/60 border border-zinc-850 px-2.5 py-1 rounded-lg">
                      {goal.target} <span className="text-[9px] text-zinc-550 uppercase font-bold ml-1">{goal.uomType}</span>
                    </span>
                  </div>

                  {/* Weightage Details */}
                  <div className="space-y-1 text-left md:text-right min-w-[70px]">
                    <span className="text-[10px] text-zinc-550 uppercase font-bold tracking-wider block">Weightage</span>
                    <span className="text-xs font-black text-zinc-200 bg-zinc-900 border border-zinc-850 px-2.5 py-1 rounded-lg">
                      {goal.weightage}%
                    </span>
                  </div>

                  {/* Quick Action Controls */}
                  {!isLocked && (
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => openEditModal(index)}
                        className="h-9 w-9 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {!goal.sharedGoalId && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleRemoveGoal(index)}
                          className="h-9 w-9 text-red-500 hover:text-red-400 hover:bg-red-950/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add New Goal Trigger Dropzone */}
      {!isLocked && (
        <div className="flex justify-center pt-2">
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger 
              render={
                <Button 
                  variant="outline" 
                  className="w-full border-2 border-dashed border-zinc-850 bg-zinc-950/20 hover:bg-zinc-950/40 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 py-7 rounded-xl flex items-center justify-center gap-2 group transition-all duration-200 shadow-sm" 
                  onClick={openAddModal} 
                />
              }
            >
              <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
              Add New Performance Indicator
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-zinc-950 border border-zinc-850 rounded-2xl text-zinc-150">
              <DialogHeader>
                <DialogTitle className="text-zinc-100 font-extrabold text-lg">{editingIndex !== null ? "Edit Goal Indicator" : "Add Performance Indicator"}</DialogTitle>
              </DialogHeader>
              <GoalForm 
                initialData={editingIndex !== null ? goals[editingIndex] : undefined}
                isShared={editingIndex !== null ? !!goals[editingIndex].sharedGoalId : false}
                onSubmit={editingIndex !== null ? handleUpdateGoal : handleAddGoal}
                onCancel={() => setIsModalOpen(false)}
                title=""
                description=""
              />
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}

