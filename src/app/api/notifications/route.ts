import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { NotificationService } from "@/lib/services/notification-service";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const notifications = await NotificationService.getUnread(session.user.id);
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

    const body = await req.json();
    const { id } = body;

    if (!id) {
      return new NextResponse("Missing notification ID", { status: 400 });
    }

    const updated = await NotificationService.markAsRead(id);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("[NOTIFICATIONS_POST]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
