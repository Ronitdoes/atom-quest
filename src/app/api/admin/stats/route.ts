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
    await assertRateLimit(`admin:stats:${session.user.id}`, 30, 60);
    const { searchParams } = new URL(req.url);
    const cycleId = searchParams.get("cycleId") || "2026";

    const stats = await AdminService.getSystemStats(cycleId);
    return NextResponse.json(stats, {
      headers: {
        "Cache-Control": "private, max-age=15, stale-while-revalidate=45",
      },
    });
  } catch (error) {
    console.error("Error fetching stats for admin:", error);
    return safeErrorResponse(error);
  }
}
