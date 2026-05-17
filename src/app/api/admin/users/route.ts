import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { AdminService } from "@/lib/services/admin-service";
import { Role } from "@prisma/client";
import { safeErrorResponse } from "@/lib/security/api";
import { assertRateLimit } from "@/lib/security/rate-limit";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    await assertRateLimit(`admin:users:get:${session.user.id}`, 30, 60);
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") || "ALL";

    const result = await AdminService.getAllUsers({ page, limit, search, role });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching users for admin:", error);
    return safeErrorResponse(error);
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    await assertRateLimit(`admin:users:${session.user.id}`, 20, 60);
    const { userId, role, managerId } = await req.json();

    if (!userId || !role) {
      return NextResponse.json({ message: "userId and role are required" }, { status: 400 });
    }

    // Validate role
    if (!Object.values(Role).includes(role)) {
      return NextResponse.json({ message: "Invalid role value" }, { status: 400 });
    }

    const updatedUser = await AdminService.updateUserRoleAndManager(
      session.user.id,
      userId,
      role as Role,
      managerId || null
    );

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating user for admin:", error);
    return safeErrorResponse(error);
  }
}
