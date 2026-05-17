import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { ManagerService } from "@/lib/services/manager-service";
import { Header } from "@/components/shared/header";
import { ApprovalSheet } from "@/components/manager/ApprovalSheet";
import { redirect } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default async function ApprovalPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string; cycleId?: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "MANAGER") {
    redirect("/auth/login");
  }

  const resolvedParams = await searchParams;
  const userId = resolvedParams.userId;
  const cycleId = resolvedParams.cycleId || "2026";

  if (!userId) {
    redirect("/manager");
  }

  const sheet = await ManagerService.getGoalSheetForApproval(userId, cycleId, session.user.id);

  if (!sheet) {
    return (
      <div className="flex flex-col min-h-screen bg-neutral-50/50 dark:bg-black">
        <Header title="Approval Review" breadcrumb="Not Found" />
        <main className="flex-1 p-6 flex items-center justify-center">
          <div className="text-center space-y-4 max-w-md">
            <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto text-amber-600">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold">Goal Sheet Not Found</h2>
            <p className="text-neutral-500">
              The goal sheet you are looking for does not exist or has not been created yet.
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
        title="Approval Review" 
        breadcrumb={`${sheet.user.name || "Employee"}'s Goals`}
      />
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        <ApprovalSheet sheet={sheet as any} />
      </main>
    </div>
  );
}

