import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { AdminService } from "@/lib/services/admin-service";
import { safeErrorResponse } from "@/lib/security/api";
import { assertRateLimit } from "@/lib/security/rate-limit";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    await assertRateLimit(`admin:reports:${session.user.id}`, 30, 60);
    const { searchParams } = new URL(req.url);
    const cycleId = searchParams.get("cycleId") || "2026";
    const quarterParam = searchParams.get("quarter") || "1";
    let report;

    if (quarterParam === "all") {
      report = await AdminService.getAchievementReport(cycleId, "all");
    } else {
      const quarter = parseInt(quarterParam, 10);
      if (isNaN(quarter) || quarter < 1 || quarter > 4) {
        return NextResponse.json({ message: "Invalid quarter parameter" }, { status: 400 });
      }
      report = await AdminService.getAchievementReport(cycleId, quarter);
    }
    return NextResponse.json(report);
  } catch (error) {
    console.error("Error generating achievement report:", error);
    return safeErrorResponse(error);
  }
}
