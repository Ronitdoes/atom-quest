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
    await assertRateLimit(`admin:auditlogs:${session.user.id}`, 30, 60);
    const { searchParams } = new URL(req.url);
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");

    const page = pageParam ? parseInt(pageParam, 10) : 1;
    const limit = limitParam ? parseInt(limitParam, 10) : 100;

    const validatedPage = isNaN(page) || page < 1 ? 1 : page;
    const validatedLimit = isNaN(limit) || limit < 1 ? 100 : limit;

    const logs = await AdminService.getAuditLogs(validatedLimit, validatedPage);
    return NextResponse.json(logs);
  } catch (error) {
    console.error("Error fetching audit logs for admin:", error);
    return safeErrorResponse(error);
  }
}
