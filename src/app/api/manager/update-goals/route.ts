import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { ManagerService } from "@/lib/services/manager-service";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "MANAGER") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { sheetId, goals } = await req.json();

    if (!sheetId || !goals) {
      return NextResponse.json({ message: "sheetId and goals are required" }, { status: 400 });
    }

    await ManagerService.updateGoalsByManager(sheetId, session.user.id, goals);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating goals by manager:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
