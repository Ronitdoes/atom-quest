import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { CheckInService } from "@/lib/services/check-in-service";
import { CheckInReviewForm } from "@/components/manager/CheckInReviewForm";
import { Header } from "@/components/shared/header";
import { db } from "@/lib/db/db";
import { redirect } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default async function CheckInReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string; quarter?: string; cycleId?: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== "MANAGER" && session.user.role !== "ADMIN")) {
    redirect("/auth/login");
  }

  const resolvedParams = await searchParams;
  const userId = resolvedParams.userId;
  const quarterStr = resolvedParams.quarter;
  const cycleId = resolvedParams.cycleId || "2024";

  if (!userId || !quarterStr) {
    redirect("/manager");
  }

  const quarter = parseInt(quarterStr, 10);
  if (isNaN(quarter) || quarter < 1 || quarter > 4) {
    redirect("/manager");
  }

  // Verify that the requested user is a subordinate (if logged-in user is a MANAGER)
  if (session.user.role === "MANAGER") {
    const isSubordinate = await db.user.findFirst({
      where: {
        id: userId,
        managerId: session.user.id,
      },
    });
    if (!isSubordinate) {
      redirect("/manager");
    }
  }

  // Load employee profile details
  const employee = await db.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
    },
  });

  if (!employee) {
    redirect("/manager");
  }

  // Fetch subordinate's check-in info for this quarter
  const checkInData = await CheckInService.getCheckInForQuarter(userId, cycleId, quarter);

  // If goals list is empty, show a premium empty state alert
  if (checkInData.goals.length === 0) {
    return (
      <div className="flex flex-col min-h-screen bg-neutral-50/50 dark:bg-black">
        <Header title="Check-In Review" breadcrumb="Not Active" />
        <main className="flex-1 p-6 flex items-center justify-center">
          <div className="text-center space-y-4 max-w-md">
            <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto text-amber-600">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold">No Active Goals</h2>
            <p className="text-neutral-500 text-xs">
              This subordinate does not have any active goals for the {cycleId} cycle yet.
            </p>
            <Link 
              href="/manager"
              className={cn(buttonVariants({ variant: "default" }))}
            >
              Return to Dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50/50 dark:bg-black">
      <Header 
        title="Check-In Review" 
        breadcrumb={`${employee.name || "Employee"}'s Q${quarter}`}
      />
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        <CheckInReviewForm 
          checkInData={checkInData as any}
          employeeName={employee.name || "Unnamed User"}
          employeeEmail={employee.email}
          quarter={quarter}
          userId={userId}
        />
      </main>
    </div>
  );
}
