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
    await assertRateLimit(`manager:approve:${session.user.id}`, 30, 60);
    const { sheetId } = await req.json();

    if (!sheetId) {
      return NextResponse.json({ message: "sheetId is required" }, { status: 400 });
    }

    const updatedSheet = await ManagerService.approveGoalSheet(sheetId, session.user.id, session.user.role);
    return NextResponse.json(updatedSheet);
  } catch (error) {
    console.error("Error approving goal sheet:", error);
    return safeErrorResponse(error);
  }
}
