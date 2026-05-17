import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { GoalService } from "@/lib/services/goal-service";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const cycleId = searchParams.get("cycleId");

    if (!cycleId) {
      return new NextResponse("Missing cycleId", { status: 400 });
    }

    const result = await GoalService.getGoalSheet(session.user.id, cycleId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[GOALS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
