import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { SharedGoalService } from "@/lib/services/shared-goal-service";
import { sharedGoalSchema } from "@/lib/validators/shared-goal";
import { safeErrorResponse } from "@/lib/security/api";
import { assertRateLimit } from "@/lib/security/rate-limit";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "MANAGER" && session.user.role !== "ADMIN")) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    await assertRateLimit(`shared-goals:create:${session.user.id}`, 20, 60);

    const body = await req.json();
    const validatedData = sharedGoalSchema.parse(body);

    const result = await SharedGoalService.createSharedGoal(session.user.id, validatedData);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[SHARED_GOALS_POST]", error);
    return safeErrorResponse(error, "Internal Error");
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "MANAGER" && session.user.role !== "ADMIN")) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    await assertRateLimit(`shared:get:${session.user.id}`, 60, 60);

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

    const result = await SharedGoalService.getCreatedSharedGoals(session.user.id, page, limit);
    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "private, max-age=15, stale-while-revalidate=45",
      },
    });
  } catch (error) {
    console.error("[SHARED_GOALS_GET]", error);
    return safeErrorResponse(error, "Internal Error");
  }
}
