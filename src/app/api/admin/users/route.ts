import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { AdminService } from "@/lib/services/admin-service";
import { Role } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const users = await AdminService.getAllUsers();
    return NextResponse.json(users);
  } catch (error: any) {
    console.error("Error fetching users for admin:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
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
  } catch (error: any) {
    console.error("Error updating user for admin:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
