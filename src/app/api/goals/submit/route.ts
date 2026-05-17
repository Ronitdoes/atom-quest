import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { GoalService } from "@/lib/services/goal-service";
import { z } from "zod";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

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
  } catch (error: any) {
    console.error("[GOALS_SUBMIT]", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(error.flatten(), { status: 400 });
    }

    return NextResponse.json(
      { message: error.message || "Internal Server Error" },
      { status: error.message?.includes("approved") ? 400 : 500 }
    );
  }
}
