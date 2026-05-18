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
    const body = await req.json();
    const { type, cycleId, quarter, preview } = body;

    // Separate rate limits for preview (loads data on dashboard) vs actual broadcast (sends notifications)
    if (preview) {
      await assertRateLimit(`admin:reminders:preview:${session.user.id}`, 60, 60);
    } else {
      await assertRateLimit(`admin:reminders:broadcast:${session.user.id}`, 10, 60);
    }

    if (!type || !cycleId) {
      return NextResponse.json({ message: "type and cycleId are required" }, { status: 400 });
    }

    const validTypes = ["GOAL_SHEET", "GOAL_APPROVAL", "CHECK_IN", "CHECKIN_REVIEW"];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ message: "Invalid reminder type" }, { status: 400 });
    }

    const result = await AdminService.sendSystemReminders(
      session.user.id,
      type,
      cycleId,
      quarter ? parseInt(quarter.toString(), 10) : undefined,
      !!preview
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error broadcasting reminders by admin:", error);
    return safeErrorResponse(error);
  }
}
