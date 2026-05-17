import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { SharedGoalService } from "@/lib/services/shared-goal-service";
import { sharedGoalAchievementSchema } from "@/lib/validators/shared-goal";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session || (session.user.role !== "MANAGER" && session.user.role !== "ADMIN")) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const validatedData = sharedGoalAchievementSchema.parse(body);

    const result = await SharedGoalService.updateAchievement(id, session.user.id, validatedData);

    return NextResponse.json({
      success: true,
      updatedCount: result.length,
    });
  } catch (error: any) {
    console.error("[SHARED_GOAL_SYNC_ACHIEVEMENT]", error);
    return new NextResponse(error.message || "Internal Error", { status: 500 });
  }
}
