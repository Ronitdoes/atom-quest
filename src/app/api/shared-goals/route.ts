import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { SharedGoalService } from "@/lib/services/shared-goal-service";
import { sharedGoalSchema } from "@/lib/validators/shared-goal";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "MANAGER" && session.user.role !== "ADMIN")) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const validatedData = sharedGoalSchema.parse(body);

    const result = await SharedGoalService.createSharedGoal(session.user.id, validatedData);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[SHARED_GOALS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "MANAGER" && session.user.role !== "ADMIN")) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const result = await SharedGoalService.getCreatedSharedGoals(session.user.id);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[SHARED_GOALS_GET]", error);
    return new NextResponse(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
