import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { CheckInService } from "@/lib/services/check-in-service";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (session.user.role !== "MANAGER" && session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden: Only managers and admins can review check-ins", { status: 403 });
    }

    const body = await req.json();
    const { checkInId, managerComment } = body;

    if (!checkInId) {
      return new NextResponse("Missing check-in ID", { status: 400 });
    }

    const result = await CheckInService.saveManagerFeedback(
      checkInId,
      session.user.id,
      managerComment || ""
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[CHECK_INS_REVIEW_POST]", error);
    return NextResponse.json(
      { message: error.message || "Internal Server Error" },
      { status: error.message?.includes("Unauthorized") ? 403 : 500 }
    );
  }
}
