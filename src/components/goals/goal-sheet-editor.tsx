"use client";

import { useState, useMemo } from "react";
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
import { Plus, Pencil, Trash2, AlertTriangle, CheckCircle2, Save, Send } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface GoalSheetEditorProps {
  initialGoals?: GoalFormData[];
  status?: string;
  onSaveDraft: (goals: GoalFormData[]) => Promise<void>;
  onSubmit: (goals: GoalFormData[]) => Promise<void>;
  isLoading?: boolean;
}

export function GoalSheetEditor({
  initialGoals = [],
  status = "DRAFT",
  onSaveDraft,
  onSubmit,
  isLoading = false,
}: GoalSheetEditorProps) {
  const [goals, setGoals] = useState<GoalFormData[]>(initialGoals);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const totalWeightage = useMemo(() => 
    goals.reduce((sum, g) => sum + g.weightage, 0), 
  [goals]);

  const validation = goalSheetSchema.safeParse({ goals });
  const isValid = validation.success;
  const errors = !validation.success ? validation.error.flatten().fieldErrors : {};

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

  const isLocked = status !== "DRAFT" && status !== "REWORK_REQUIRED";

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Performance Goal Sheet</h2>
          <p className="text-neutral-500">Define your goals and weightages for the current cycle.</p>
        </div>
        <div className="flex gap-2">
          {!isLocked && (
            <>
              <Button 
                variant="outline" 
                onClick={() => onSaveDraft(goals)}
                disabled={isLoading || goals.length === 0}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Draft
              </Button>
              <Button 
                onClick={() => onSubmit(goals)}
                disabled={isLoading || !isValid}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Send className="w-4 h-4 mr-2" />
                Submit for Approval
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Status Banner */}
      {isLocked && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3 text-blue-800">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-semibold text-blue-900">Sheet Locked</p>
            <p>Your goal sheet has been {status.toLowerCase()} and is now locked for editing. Please contact your manager or admin for changes.</p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Total Goals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{goals.length} / 8</div>
            <Progress value={(goals.length / 8) * 100} className="h-1 mt-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Total Weightage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalWeightage === 100 ? "text-green-600" : "text-amber-600"}`}>
              {totalWeightage}% / 100%
            </div>
            <Progress 
              value={totalWeightage} 
              className={`h-1 mt-2 ${totalWeightage > 100 ? "bg-red-100 [&>div]:bg-red-500" : ""}`} 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Sheet Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge 
              variant={
                status === "DRAFT" ? "outline" : 
                status === "APPROVED" ? "default" : 
                status === "REWORK_REQUIRED" ? "destructive" : "secondary"
              } 
              className={`text-sm ${status === "APPROVED" ? "bg-green-600 hover:bg-green-700" : ""}`}
            >
              {status}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Validation Alerts */}
      {!isLocked && !isValid && goals.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3 text-amber-800">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">Validation Required:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              {totalWeightage !== 100 && (
                <li>Total weightage must sum up to exactly 100% (currently {totalWeightage}%)</li>
              )}
              {goals.length < 1 && <li>At least one goal is required</li>}
              {goals.some(g => g.weightage < 10) && <li>Each goal must have at least 10% weightage</li>}
            </ul>
          </div>
        </div>
      )}

      {!isLocked && isValid && status === "DRAFT" && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3 text-green-800">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">Ready to Submit!</p>
            <p>All validation rules met. You can now submit your goal sheet for manager approval.</p>
          </div>
        </div>
      )}

      {/* Goals Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Thrust Area</TableHead>
                <TableHead>Goal Title</TableHead>
                <TableHead className="text-right">Target</TableHead>
                <TableHead className="text-right">Weightage</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {goals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-neutral-500">
                    No goals added yet. Click "Add New Goal" to start.
                  </TableCell>
                </TableRow>
              ) : (
                goals.map((goal, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{goal.thrustArea}</TableCell>
                    <TableCell>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{goal.title}</span>
                          {goal.sharedGoalId && (
                            <Badge variant="secondary" className="text-[10px] h-4 bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                              Shared
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-neutral-500 truncate max-w-[300px]">
                          {goal.description || "No description"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {goal.target} <span className="text-[10px] text-neutral-400 uppercase">{goal.uomType}</span>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {goal.weightage}%
                    </TableCell>
                    <TableCell>
                      {!isLocked && (
                        <div className="flex justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => openEditModal(index)}
                            className="h-8 w-8 text-neutral-600"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {!goal.sharedGoalId && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleRemoveGoal(index)}
                              className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {!isLocked && (
        <div className="flex justify-center">
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger 
              render={
                <Button variant="outline" className="border-dashed w-full py-8 text-neutral-500" onClick={openAddModal} />
              }
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Goal
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{editingIndex !== null ? "Edit Goal" : "Add New Goal"}</DialogTitle>
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

