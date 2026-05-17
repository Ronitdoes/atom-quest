import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { GoalService } from "@/lib/services/goal-service";
import { DashboardCard } from "@/components/shared/dashboard-card";
import { EmployeeTabsClient } from "@/components/employee/EmployeeTabsClient";
import { Header } from "@/components/shared/header";
import { 
  Calendar, 
  ShieldCheck, 
  Activity
} from "lucide-react";
import { redirect } from "next/navigation";

export default async function EmployeeDashboard({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect("/auth/login");
  }

  if (session.user.role !== "EMPLOYEE") {
    if (session.user.role === "ADMIN") {
      redirect("/admin");
    } else if (session.user.role === "MANAGER") {
      redirect("/manager");
    } else {
      redirect("/auth/login");
    }
  }

  const cycleId = "2026";
  const goalSheet = await GoalService.getGoalSheet(session.user.id, cycleId);
  const resolvedSearchParams = await searchParams;
  const activeTab = resolvedSearchParams?.tab || "overview";

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50/50 dark:bg-background">
      <Header 
        title="Employee Dashboard" 
        breadcrumb="My Overview"
        activeTab={activeTab}
      />
      
      <main className="flex-1 p-6 space-y-8 max-w-7xl mx-auto w-full">
        {/* Welcome Section */}
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
            Welcome back, {session.user.name || "Employee"}
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400">
            Track your performance milestones and manage your goals for the {cycleId} cycle.
          </p>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <DashboardCard
            title="My Role"
            value="Individual Contributor"
            description={session.user.role}
            icon={ShieldCheck}
          />
          <DashboardCard
            title="Current Cycle"
            value={cycleId}
            description="Performance Period"
            icon={Calendar}
          />
          <DashboardCard
            title="Goal Status"
            value={goalSheet?.status.replace(/_/g, " ") || "NOT STARTED"}
            description={goalSheet ? `Last updated ${new Date(goalSheet.updatedAt).toLocaleDateString()}` : "Initialize your goals"}
            icon={Activity}
            className={goalSheet?.status === "APPROVED" ? "ring-2 ring-emerald-500/20" : ""}
          />
        </div>

        <EmployeeTabsClient 
          initialTab={activeTab}
          cycleId={cycleId}
          goalSheet={goalSheet}
          userName={session.user.name || null}
          userEmail={session.user.email || null}
        />
      </main>
    </div>
  );
}

