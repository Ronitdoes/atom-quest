"use client";

import { useState, useEffect } from "react";
import { Plus, Users, Send, Target, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SharedGoalForm } from "./SharedGoalForm";
import { SharedGoalAssignmentDialog } from "./SharedGoalAssignmentDialog";
import { SharedGoalSyncDialog } from "./SharedGoalSyncDialog";
import { SharedGoalFormData } from "@/lib/validators/shared-goal";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface SharedGoal {
  id: string;
  thrustArea: string;
  title: string;
  uomType: string;
  target: number;
  _count: {
    assignments: number;
  };
}

interface TeamMember {
  id: string;
  name: string | null;
  email: string;
}

export function SharedGoalManager({ teamMembers }: { teamMembers: TeamMember[] }) {
  const [sharedGoals, setSharedGoals] = useState<SharedGoal[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isSyncOpen, setIsSyncOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<SharedGoal | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchSharedGoals();
  }, []);

  async function fetchSharedGoals() {
    try {
      const response = await fetch("/api/shared-goals");
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to load shared goals: ${response.status} ${errorText}`);
      }
      const result = await response.json();
      const goals = Array.isArray(result) ? result : result?.data ?? [];
      setSharedGoals(goals);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message);
    }
  }

  const handleCreate = async (data: SharedGoalFormData) => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/shared-goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Failed to create");

      toast.success("Shared goal created successfully");
      setIsCreateOpen(false);
      fetchSharedGoals();
    } catch (error) {
      console.error(error);
      toast.error("Failed to create shared goal");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssign = async (userIds: string[]) => {
    if (!selectedGoal) return;

    const response = await fetch("/api/shared-goals/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sharedGoalId: selectedGoal.id,
        userIds,
      }),
    });

    if (!response.ok) throw new Error("Failed to assign");
    
    fetchSharedGoals(); // Refresh counts
  };

  return (
    <Card className="border-neutral-200 dark:border-neutral-800">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="space-y-1">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Target className="h-5 w-5 text-neutral-500" />
            Shared Goals (Departmental KPIs)
          </CardTitle>
          <CardDescription>
            Create and push common performance goals to your team members.
          </CardDescription>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Shared Goal
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Thrust Area</TableHead>
              <TableHead>Goal Title</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Assignments</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sharedGoals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-neutral-500">
                  No shared goals created yet.
                </TableCell>
              </TableRow>
            ) : (
              sharedGoals.map((goal) => (
                <TableRow key={goal.id}>
                  <TableCell className="font-medium">{goal.thrustArea}</TableCell>
                  <TableCell>{goal.title}</TableCell>
                  <TableCell>{goal.target}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="gap-1">
                      <Users className="h-3 w-3" />
                      {goal._count.assignments} assigned
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2"
                      onClick={() => {
                        setSelectedGoal(goal);
                        setIsSyncOpen(true);
                      }}
                    >
                      <RefreshCw className="h-4 w-4" />
                      Sync Progress
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2"
                      onClick={() => {
                        setSelectedGoal(goal);
                        setIsAssignOpen(true);
                      }}
                    >
                      <Send className="h-4 w-4" />
                      Assign
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Shared Goal</DialogTitle>
          </DialogHeader>
          <SharedGoalForm 
            onSubmit={handleCreate} 
            onCancel={() => setIsCreateOpen(false)}
            isLoading={isLoading}
          />
        </DialogContent>
      </Dialog>

      {/* Assignment Dialog */}
      <SharedGoalAssignmentDialog
        isOpen={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        sharedGoal={selectedGoal}
        teamMembers={teamMembers}
        onAssign={handleAssign}
      />

      {/* Sync Dialog */}
      <SharedGoalSyncDialog
        isOpen={isSyncOpen}
        onClose={() => setIsSyncOpen(false)}
        sharedGoal={selectedGoal}
      />
    </Card>
  );
}
