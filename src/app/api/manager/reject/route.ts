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
    await assertRateLimit(`manager:reject:${session.user.id}`, 30, 60);
    const { sheetId, comment } = await req.json();

    if (!sheetId || !comment) {
      return NextResponse.json({ message: "sheetId and comment are required" }, { status: 400 });
    }

    if (typeof comment !== "string" || comment.length > 2000) {
      return NextResponse.json({ message: "comment must be at most 2000 characters" }, { status: 400 });
    }

    const updatedSheet = await ManagerService.rejectGoalSheet(sheetId, session.user.id, comment.trim(), session.user.role);
    return NextResponse.json(updatedSheet);
  } catch (error) {
    console.error("Error rejecting goal sheet:", error);
    return safeErrorResponse(error);
  }
}
