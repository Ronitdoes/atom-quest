import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { SchedulerService } from "@/lib/services/scheduler-service";

export async function POST(req: NextRequest) {
  // 1. Authenticate via Session (Admin in UI) or API Token (Stateless Cron Machine)
  let isAuthenticated = false;

  // Check query param secret or Authorization header
  const { searchParams } = new URL(req.url);
  const tokenParam = searchParams.get("secret");
  const authHeader = req.headers.get("Authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;

  const configSecret = process.env.CRON_SECRET;

  if (process.env.NODE_ENV === "production" && !configSecret) {
    console.error("[Security] CRON_SECRET is missing in production!");
    return NextResponse.json(
      { message: "Internal Server Error: Secure scheduler token not configured." },
      { status: 500 }
    );
  }

  const activeSecret = configSecret || "atomquest-cron-secret-123";

  if ((tokenParam && tokenParam === activeSecret) || (bearerToken && bearerToken === activeSecret)) {
    isAuthenticated = true;
  } else {
    // Fallback to active admin session (user clicking "Sync/Tick" in Admin dashboard)
    const session = await getServerSession(authOptions);
    if (session && session.user.role === "ADMIN") {
      isAuthenticated = true;
    }
  }

  if (!isAuthenticated) {
    return NextResponse.json(
      { message: "Unauthorized: Missing or invalid credentials" },
      { status: 401 }
    );
  }

  try {
    const result = await SchedulerService.tick();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Scheduler API error:", error);
    return NextResponse.json(
      { message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// Support GET requests as well for simple web cron trigger tools
export async function GET(req: NextRequest) {
  return POST(req);
}
