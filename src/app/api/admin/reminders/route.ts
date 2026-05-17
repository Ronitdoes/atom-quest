import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { AdminService } from "@/lib/services/admin-service";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { type, cycleId, quarter, preview } = await req.json();

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
  } catch (error: any) {
    console.error("Error broadcasting reminders by admin:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
