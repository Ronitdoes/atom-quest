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
    const { sheetId, reason } = await req.json();

    if (!sheetId || !reason) {
      return NextResponse.json({ message: "sheetId and reason are required" }, { status: 400 });
    }

    const result = await AdminService.unlockGoalSheet(sheetId, session.user.id, reason);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error unlocking goal sheet by admin:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
