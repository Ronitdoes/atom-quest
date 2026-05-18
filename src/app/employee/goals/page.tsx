"use client";

import { useState, useEffect } from "react";
import { GoalSheetEditor } from "@/components/goals/goal-sheet-editor";
import { CheckInModule } from "@/components/goals/check-in-module";
import { GoalFormData } from "@/lib/validators/goal";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, Target, ClipboardCheck, ArrowLeft } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Header } from "@/components/shared/header";
import { Button } from "@/components/ui/button";
import Loading from "@/app/loading";

export default function EmployeeGoalsPage() {
  const [goals, setGoals] = useState<GoalFormData[]>([]);
  const [status, setStatus] = useState<string>("DRAFT");
  const [managerComment, setManagerComment] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  // For MVP, we use a fixed cycle ID
  const cycleId = "2026";

  useEffect(() => {
    const fetchGoals = async () => {
      try {
        const response = await fetch(`/api/goals?cycleId=${cycleId}`);
        if (response.ok) {
          const data = await response.json();
          if (data) {
            setGoals(data.goals || []);
            setStatus(data.status || "DRAFT");
            setManagerComment(data.managerComment || null);
          }
        }
      } catch (error) {
        console.error("Failed to fetch goals:", error);
        toast.error("Could not load your goals.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchGoals();
  }, [cycleId]);

  const handleSaveDraft = async (updatedGoals: GoalFormData[]) => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/goals/save-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goals: updatedGoals, cycleId }),
      });

      if (response.ok) {
        toast.success("Draft saved successfully!");
        setStatus("DRAFT");
      } else {
        throw new Error("Failed to save draft");
      }
    } catch (error) {
      toast.error("Error saving draft.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (updatedGoals: GoalFormData[]) => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/goals/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goals: updatedGoals, cycleId }),
      });

      if (response.ok) {
        toast.success("Goal sheet submitted for approval!");
        setStatus("SUBMITTED");
        router.refresh();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to submit goals.");
      }
    } catch (error) {
      toast.error("Error submitting goals.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <Loading />;
  }

  // Determine initial tab based on Goal Sheet Approval status
  const defaultTab = status === "APPROVED" ? "check-ins" : "goal-setting";

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50/50 dark:bg-background">
      <Header 
        title="Goals & Check-Ins" 
        breadcrumb="My Workspace"
      />
      
      <main className="flex-1 p-6 space-y-6 max-w-5xl mx-auto w-full">
        <Tabs defaultValue={defaultTab} className="w-full">
          <div className="flex justify-between items-center mb-6">
            <TabsList>
              <TabsTrigger value="goal-setting" className="gap-2">
                <Target className="w-4 h-4" />
                Goal Setting
              </TabsTrigger>
              <TabsTrigger value="check-ins" className="gap-2">
                <ClipboardCheck className="w-4 h-4" />
                Quarterly Check-Ins
              </TabsTrigger>
            </TabsList>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/employee")}
              className="gap-2 bg-transparent border-neutral-200 dark:border-zinc-800 text-neutral-900 dark:text-zinc-200 hover:bg-neutral-100 dark:hover:bg-zinc-900 shadow-sm transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </div>

          <TabsContent value="goal-setting" className="mt-0">
            <GoalSheetEditor 
              initialGoals={goals}
              status={status}
              managerComment={managerComment}
              onSaveDraft={handleSaveDraft}
              onSubmit={handleSubmit}
              isLoading={isSaving}
            />
          </TabsContent>

          <TabsContent value="check-ins" className="mt-0">
            <CheckInModule />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

