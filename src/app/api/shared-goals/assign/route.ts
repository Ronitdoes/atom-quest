import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { SharedGoalService } from "@/lib/services/shared-goal-service";
import { sharedGoalAssignmentSchema } from "@/lib/validators/shared-goal";
import { safeErrorResponse } from "@/lib/security/api";
import { assertRateLimit } from "@/lib/security/rate-limit";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "MANAGER" && session.user.role !== "ADMIN")) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    await assertRateLimit(`shared-goals:assign:${session.user.id}`, 20, 60);

    const body = await req.json();
    const { sharedGoalId, userIds } = sharedGoalAssignmentSchema.parse(body);

    const result = await SharedGoalService.assignSharedGoal(
      sharedGoalId,
      userIds,
      session.user.id,
      session.user.role
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("[SHARED_GOALS_ASSIGN_POST]", error);
    return safeErrorResponse(error, "Internal Error");
  }
}
