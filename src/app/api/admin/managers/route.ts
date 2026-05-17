import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { AdminService } from "@/lib/services/admin-service";
import { safeErrorResponse } from "@/lib/security/api";
import { assertRateLimit } from "@/lib/security/rate-limit";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    await assertRateLimit(`admin:managers:${session.user.id}`, 30, 60);
    const managers = await AdminService.getAllManagers();
    return NextResponse.json(managers);
  } catch (error) {
    console.error("Error fetching managers for admin:", error);
    return safeErrorResponse(error);
  }
}
