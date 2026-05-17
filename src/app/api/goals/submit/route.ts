import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { GoalService } from "@/lib/services/goal-service";
import { safeErrorResponse } from "@/lib/security/api";
import { assertRateLimit } from "@/lib/security/rate-limit";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    await assertRateLimit(`goals:submit:${session.user.id}`, 10, 60);

    const body = await req.json();
    const { goals, cycleId } = body;

    if (!goals || !cycleId) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const result = await GoalService.submitGoalSheet(
      session.user.id,
      cycleId,
      goals
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("[GOALS_SUBMIT]", error);
    return safeErrorResponse(error, "Internal Server Error");
  }
}
