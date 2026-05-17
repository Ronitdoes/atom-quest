import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { AnalyticsService } from "@/lib/services/analytics-service";
import { safeErrorResponse } from "@/lib/security/api";
import { assertRateLimit } from "@/lib/security/rate-limit";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  // Authenticate and authorize as ADMIN role
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    await assertRateLimit(`admin:analytics:${session.user.id}`, 30, 60);
    const { searchParams } = new URL(req.url);
    const cycleId = searchParams.get("cycleId") || "2026";
    const quarterParam = searchParams.get("quarter") || "1";
    const quarter = parseInt(quarterParam, 10);

    if (isNaN(quarter) || quarter < 1 || quarter > 4) {
      return NextResponse.json({ message: "Invalid quarter parameter (must be 1-4)" }, { status: 400 });
    }

    // Call the respective AnalyticsService methods
    const [qoqTrends, completionRates, managerEffectiveness, departmentPerformance] = await Promise.all([
      AnalyticsService.getQoQTrends(cycleId),
      AnalyticsService.getCompletionRates(cycleId),
      AnalyticsService.getManagerEffectiveness(cycleId, quarter),
      AnalyticsService.getDepartmentPerformance(cycleId, quarter),
    ]);

    return NextResponse.json({
      qoqTrends,
      completionRates,
      managerEffectiveness,
      departmentPerformance,
    });
  } catch (error) {
    console.error("Error generating system analytics:", error);
    return safeErrorResponse(error);
  }
}
