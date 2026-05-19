import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { db } from "@/lib/db/db";
import { safeErrorResponse } from "@/lib/security/api";
import { assertRateLimit } from "@/lib/security/rate-limit";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session || (session.user.role !== "MANAGER" && session.user.role !== "ADMIN")) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    await assertRateLimit(`shared-goals:progress:${session.user.id}`, 60, 60);

    const { searchParams } = new URL(req.url);
    const quarterStr = searchParams.get("quarter");
    const quarter = quarterStr ? parseInt(quarterStr, 10) : undefined;

    // Verify manager ownership of this shared goal
    const sharedGoal = await db.sharedGoal.findUnique({
      where: { id },
      select: { creatorId: true },
    });

    if (!sharedGoal) {
      return new NextResponse("Shared goal not found", { status: 404 });
    }

    if (session.user.role !== "ADMIN" && sharedGoal.creatorId !== session.user.id) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Fetch achievements for all goals linked to this shared goal
    const whereClause: any = {
      goal: {
        sharedGoalId: id
      }
    };

    if (quarter) {
      whereClause.quarter = quarter;
    }

    const achievements = await db.goalAchievement.findMany({
      where: whereClause,
      include: {
        goal: {
          include: {
            goalSheet: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        updatedAt: "desc"
      }
    });

    // Map into a flat, readable array
    const progressList = achievements.map((ach) => ({
      id: ach.id,
      userId: ach.goal.goalSheet.user.id,
      userName: ach.goal.goalSheet.user.name,
      userEmail: ach.goal.goalSheet.user.email,
      quarter: ach.quarter,
      value: ach.value,
      status: ach.status,
      notes: ach.notes,
      updatedAt: ach.updatedAt,
    }));

    return NextResponse.json(progressList);
  } catch (error) {
    console.error("[SHARED_GOALS_PROGRESS_GET]", error);
    return safeErrorResponse(error, "Internal Error");
  }
}
