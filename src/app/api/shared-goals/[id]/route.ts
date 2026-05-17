import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { SharedGoalService } from "@/lib/services/shared-goal-service";
import { sharedGoalSchema } from "@/lib/validators/shared-goal";
import { db } from "@/lib/db/db";

export async function PATCH(
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
    const validatedData = sharedGoalSchema.parse(body);

    // Update the master shared goal
    const updatedSharedGoal = await db.sharedGoal.update({
      where: { id },
      data: validatedData,
    });

    // Automatically sync metadata to all linked employee goals
    await SharedGoalService.syncSharedGoalMetadata(id);

    return NextResponse.json(updatedSharedGoal);
  } catch (error: any) {
    console.error("[SHARED_GOAL_PATCH]", error);
    return new NextResponse(error.message || "Internal Error", { status: 500 });
  }
}
