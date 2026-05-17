import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { SchedulerService } from "@/lib/services/scheduler-service";
import { safeErrorResponse } from "@/lib/security/api";

async function handleSchedulerRequest(req: NextRequest) {
  // 1. Authenticate via Session (Admin in UI) or API Token (Stateless Cron Machine)
  let isAuthenticated = false;

  const authHeader = req.headers.get("Authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;

  const configSecret = process.env.CRON_SECRET;

  if (!configSecret) {
    console.error("[Security] CRON_SECRET is missing.");
    return NextResponse.json(
      { message: "Internal Server Error: Secure scheduler token not configured." },
      { status: 500 }
    );
  }

  if (bearerToken && bearerToken === configSecret) {
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
  } catch (error) {
    console.error("Scheduler API error:", error);
    return safeErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  return handleSchedulerRequest(req);
}

export async function GET(req: NextRequest) {
  return handleSchedulerRequest(req);
}
