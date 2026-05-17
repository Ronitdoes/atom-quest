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
    const { sheetId } = await req.json();

    if (!sheetId) {
      return NextResponse.json({ message: "sheetId is required" }, { status: 400 });
    }

    const updatedSheet = await ManagerService.approveGoalSheet(sheetId, session.user.id);
    return NextResponse.json(updatedSheet);
  } catch (error: any) {
    console.error("Error approving goal sheet:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
