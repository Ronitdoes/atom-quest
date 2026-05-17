import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { NotificationService } from "@/lib/services/notification-service";
import { safeErrorResponse } from "@/lib/security/api";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { db } from "@/lib/db/db";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    await assertRateLimit(`notif:get:${session.user.id}`, 60, 60);

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

    const notifications = await NotificationService.getUnread(session.user.id, page, limit);
    return NextResponse.json(notifications);
  } catch (error) {
    console.error("[NOTIFICATIONS_GET]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    await assertRateLimit(`notif:mark:${session.user.id}`, 30, 60);

    const body = await req.json();
    const { id, markAll } = body;

    if (markAll) {
      const updated = await db.notification.updateMany({
        where: {
          userId: session.user.id,
          isRead: false,
        },
        data: {
          isRead: true,
        },
      });
      return NextResponse.json(updated);
    }

    if (!id) {
      return new NextResponse("Missing notification ID", { status: 400 });
    }

    const updated = await NotificationService.markAsRead(id, session.user.id);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("[NOTIFICATIONS_POST]", error);
    return safeErrorResponse(error, "Internal Server Error");
  }
}
