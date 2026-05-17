import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { CheckInService } from "@/lib/services/check-in-service";
import { db } from "@/lib/db/db";
import { safeErrorResponse } from "@/lib/security/api";
import { assertRateLimit } from "@/lib/security/rate-limit";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    await assertRateLimit(`checkins:get:${session.user.id}`, 60, 60);

    const { searchParams } = new URL(req.url);
    const cycleId = searchParams.get("cycleId");
    const quarterStr = searchParams.get("quarter");
    const requestedUserId = searchParams.get("userId");

    if (!cycleId || !quarterStr) {
      return new NextResponse("Missing required query parameters", { status: 400 });
    }

    const quarter = parseInt(quarterStr, 10);
    if (isNaN(quarter) || quarter < 1 || quarter > 4) {
      return new NextResponse("Invalid quarter value", { status: 400 });
    }

    let targetUserId = session.user.id;

    if (requestedUserId && requestedUserId !== session.user.id) {
      // Authorization check for Manager/Admin
      if (session.user.role !== "MANAGER" && session.user.role !== "ADMIN") {
        return new NextResponse("Forbidden: Unauthorized to access other users' check-ins", { status: 403 });
      }

      if (session.user.role === "MANAGER") {
        // Verify requestedUserId is a subordinate
        const subordinate = await db.user.findFirst({
          where: {
            id: requestedUserId,
            managerId: session.user.id,
          },
        });
        if (!subordinate) {
          return new NextResponse("Forbidden: Subordinate not found or not assigned to you", { status: 403 });
        }
      }
      targetUserId = requestedUserId;
    }

    const result = await CheckInService.getCheckInForQuarter(targetUserId, cycleId, quarter);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[CHECK_INS_GET]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    await assertRateLimit(`check-ins:submit:${session.user.id}`, 20, 60);

    const body = await req.json();
    const { cycleId, quarter, notes, achievements } = body;

    const result = await CheckInService.submitCheckIn(
      session.user.id,
      cycleId,
      quarter,
      notes,
      achievements
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("[CHECK_INS_POST]", error);
    return safeErrorResponse(error, "Internal Server Error");
  }
}
