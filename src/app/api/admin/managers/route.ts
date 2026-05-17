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
    const managers = await AdminService.getAllManagers();
    return NextResponse.json(managers);
  } catch (error: any) {
    console.error("Error fetching managers for admin:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
