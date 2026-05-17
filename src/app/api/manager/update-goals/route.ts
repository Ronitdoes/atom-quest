import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { ManagerService } from "@/lib/services/manager-service";
import { safeErrorResponse } from "@/lib/security/api";
import { assertRateLimit } from "@/lib/security/rate-limit";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== "MANAGER" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  try {
    await assertRateLimit(`manager:update-goals:${session.user.id}`, 30, 60);
    const { sheetId, goals } = await req.json();

    if (!sheetId || !goals) {
      return NextResponse.json({ message: "sheetId and goals are required" }, { status: 400 });
    }

    await ManagerService.updateGoalsByManager(sheetId, session.user.id, goals, session.user.role);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating goals by manager:", error);
    return safeErrorResponse(error);
  }
}
