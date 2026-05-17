import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { CheckInService } from "@/lib/services/check-in-service";
import { safeErrorResponse } from "@/lib/security/api";
import { assertRateLimit } from "@/lib/security/rate-limit";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    await assertRateLimit(`check-ins:review:${session.user.id}`, 30, 60);

    if (session.user.role !== "MANAGER" && session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden: Only managers and admins can review check-ins", { status: 403 });
    }

    const body = await req.json();
    const { checkInId, managerComment } = body;

    if (!checkInId) {
      return new NextResponse("Missing check-in ID", { status: 400 });
    }

    const comment = typeof managerComment === "string" ? managerComment.slice(0, 2000).trim() : "";

    const result = await CheckInService.saveManagerFeedback(
      checkInId,
      session.user.id,
      comment
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("[CHECK_INS_REVIEW_POST]", error);
    return safeErrorResponse(error, "Internal Server Error");
  }
}
