import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { AdminService } from "@/lib/services/admin-service";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const cycleId = searchParams.get("cycleId") || "2024";
    const quarterParam = searchParams.get("quarter") || "1";
    const quarter = parseInt(quarterParam, 10);

    if (isNaN(quarter) || quarter < 1 || quarter > 4) {
      return NextResponse.json({ message: "Invalid quarter parameter" }, { status: 400 });
    }

    const report = await AdminService.getAchievementReport(cycleId, quarter);
    return NextResponse.json(report);
  } catch (error: any) {
    console.error("Error generating achievement report:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
