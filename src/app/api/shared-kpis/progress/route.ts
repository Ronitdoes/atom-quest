import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { db } from "@/lib/db/db";
import { safeErrorResponse } from "@/lib/security/api";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { z } from "zod";

const progressSchema = z.object({
  cycleId: z.string(),
  quarter: z.number().min(1).max(4),
  achievements: z.array(
    z.object({
      goalId: z.string(),
      value: z.number(),
      status: z.string(),
      notes: z.string().optional(),
    })
  ),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    await assertRateLimit(`shared-kpis:progress:${session.user.id}`, 30, 60);

    const body = await req.json();
    const validated = progressSchema.parse(body);
    const { cycleId, quarter, achievements } = validated;

    // Verify Goal Sheet exists and is approved
    const sheet = await db.goalSheet.findUnique({
      where: {
        userId_cycleId: { userId: session.user.id, cycleId },
      },
      include: {
        goals: true,
      },
    });

    if (!sheet || sheet.status !== "APPROVED") {
      return new NextResponse("Goal sheet must be APPROVED to update shared KPIs.", { status: 400 });
    }

    // Fetch assigned shared goals
    const assignedSharedGoals = await db.sharedGoalAssignment.findMany({
      where: { userId: session.user.id },
      include: { sharedGoal: true },
    });
    const assignedSharedGoalIds = new Set(assignedSharedGoals.map(a => a.sharedGoalId));

    // Verify all goals are indeed shared goals that belong to this user
    const allowedGoalIds = new Set(sheet.goals.filter(g => g.sharedGoalId).map(g => g.id));
    
    for (const ach of achievements) {
      if (ach.goalId.startsWith("shared-")) {
        const sharedGoalId = ach.goalId.replace("shared-", "");
        if (!assignedSharedGoalIds.has(sharedGoalId)) {
          return new NextResponse("One or more goals are not assigned shared KPIs.", { status: 403 });
        }
      } else if (!allowedGoalIds.has(ach.goalId)) {
        return new NextResponse("One or more goals are not assigned shared KPIs.", { status: 403 });
      }
    }

    // Perform database transaction
    await db.$transaction(async (tx) => {
      for (let ach of achievements) {
        let finalGoalId = ach.goalId;

        // Lazily create the Goal if it's a virtual goal
        if (ach.goalId.startsWith("shared-")) {
          const sharedGoalId = ach.goalId.replace("shared-", "");
          // Check if it was already created by a concurrent request
          let existingGoal = await tx.goal.findFirst({
            where: { goalSheetId: sheet.id, sharedGoalId }
          });

          if (!existingGoal) {
            const assignment = assignedSharedGoals.find(a => a.sharedGoalId === sharedGoalId);
            if (!assignment) throw new Error("Missing assignment");
            
            existingGoal = await tx.goal.create({
              data: {
                goalSheetId: sheet.id,
                thrustArea: assignment.sharedGoal.thrustArea,
                title: assignment.sharedGoal.title,
                description: assignment.sharedGoal.description,
                uomType: assignment.sharedGoal.uomType,
                target: assignment.sharedGoal.target,
                weightage: 0,
                sharedGoalId: assignment.sharedGoal.id,
              }
            });
          }
          finalGoalId = existingGoal.id;
        }

        const existingAch = await tx.goalAchievement.findFirst({
          where: {
            goalId: finalGoalId,
            quarter,
          },
        });

        if (existingAch) {
          await tx.goalAchievement.update({
            where: { id: existingAch.id },
            data: {
              value: ach.value,
              status: ach.status,
              notes: ach.notes || null,
            },
          });
        } else {
          await tx.goalAchievement.create({
            data: {
              goalId: finalGoalId,
              quarter,
              value: ach.value,
              status: ach.status,
              notes: ach.notes || null,
            },
          });
        }
      }

      // We do not require a CheckIn record, so we skip CheckIn creation.
      // Log the action
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "SHARED_KPI_UPDATE",
          entityType: "GoalSheet",
          entityId: sheet.id,
          newValue: JSON.parse(JSON.stringify({ quarter, achievements })),
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SHARED_KPIS_PROGRESS]", error);
    return safeErrorResponse(error, "Internal Server Error");
  }
}
