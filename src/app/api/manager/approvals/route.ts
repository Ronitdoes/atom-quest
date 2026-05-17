import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { ManagerService } from "@/lib/services/manager-service";
import { safeErrorResponse } from "@/lib/security/api";
import { assertRateLimit } from "@/lib/security/rate-limit";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== "MANAGER" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const cycleId = searchParams.get("cycleId") || "2026";

  if (!userId) {
    return NextResponse.json({ message: "userId is required" }, { status: 400 });
  }

  try {
    await assertRateLimit(`mgr:approvals:${session.user.id}`, 60, 60);
    const sheet = await ManagerService.getGoalSheetForApproval(userId, cycleId, session.user.id, session.user.role);
    
    if (!sheet) {
      return NextResponse.json({ message: "Goal sheet not found" }, { status: 404 });
    }

    // Automatic workflow transition: SUBMITTED -> UNDER_REVIEW
    if (sheet.status === "SUBMITTED") {
      await ManagerService.startReview(sheet.id, session.user.id, session.user.role);
      // Refresh the sheet object to reflect the new status in the response
      sheet.status = "UNDER_REVIEW";
    }

    return NextResponse.json(sheet);
  } catch (error) {
    console.error("Error fetching goal sheet for approval:", error);
    return safeErrorResponse(error);
  }
}
