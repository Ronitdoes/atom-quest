import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { ManagerService } from "@/lib/services/manager-service";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "MANAGER") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const cycleId = searchParams.get("cycleId") || "2024";

  if (!userId) {
    return NextResponse.json({ message: "userId is required" }, { status: 400 });
  }

  try {
    const sheet = await ManagerService.getGoalSheetForApproval(userId, cycleId);
    
    if (!sheet) {
      return NextResponse.json({ message: "Goal sheet not found" }, { status: 404 });
    }

    // Automatic workflow transition: SUBMITTED -> UNDER_REVIEW
    if (sheet.status === "SUBMITTED") {
      await ManagerService.startReview(sheet.id, session.user.id);
      // Refresh the sheet object to reflect the new status in the response
      sheet.status = "UNDER_REVIEW";
    }

    return NextResponse.json(sheet);
  } catch (error) {
    console.error("Error fetching goal sheet for approval:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
