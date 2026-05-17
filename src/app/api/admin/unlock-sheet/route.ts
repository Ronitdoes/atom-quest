import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { AdminService } from "@/lib/services/admin-service";
import { safeErrorResponse } from "@/lib/security/api";
import { assertRateLimit } from "@/lib/security/rate-limit";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    await assertRateLimit(`admin:unlock:${session.user.id}`, 10, 60);
    const { sheetId, reason } = await req.json();

    if (!sheetId || !reason) {
      return NextResponse.json({ message: "sheetId and reason are required" }, { status: 400 });
    }

    if (typeof reason !== "string" || reason.length > 2000) {
      return NextResponse.json({ message: "reason must be a string of at most 2000 characters" }, { status: 400 });
    }

    const result = await AdminService.unlockGoalSheet(sheetId, session.user.id, reason.trim());
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error unlocking goal sheet by admin:", error);
    return safeErrorResponse(error);
  }
}
