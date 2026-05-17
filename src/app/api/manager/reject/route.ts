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
    const { sheetId, comment } = await req.json();

    if (!sheetId || !comment) {
      return NextResponse.json({ message: "sheetId and comment are required" }, { status: 400 });
    }

    const updatedSheet = await ManagerService.rejectGoalSheet(sheetId, session.user.id, comment);
    return NextResponse.json(updatedSheet);
  } catch (error: any) {
    console.error("Error rejecting goal sheet:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
