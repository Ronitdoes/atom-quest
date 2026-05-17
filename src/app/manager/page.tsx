import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { ManagerService } from "@/lib/services/manager-service";
import { DashboardCard } from "@/components/shared/dashboard-card";
import { ManagerTabsClient } from "@/components/manager/ManagerTabsClient";
import { Header } from "@/components/shared/header";
import { Users, ClipboardCheck, TrendingUp } from "lucide-react";
import { redirect } from "next/navigation";

export default async function ManagerDashboard({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/login");
  }

  if (session.user.role !== "MANAGER") {
    if (session.user.role === "ADMIN") {
      redirect("/admin");
    } else if (session.user.role === "EMPLOYEE") {
      redirect("/employee");
    } else {
      redirect("/auth/login");
    }
  }

  const managerId = session.user.id;
  const stats = await ManagerService.getTeamStats(managerId);
  const teamMembers = await ManagerService.getTeamMembers(managerId);
  const checkInStatus = await ManagerService.getTeamCheckInStatus(managerId);

  const resolvedSearchParams = await searchParams;
  const activeTab = resolvedSearchParams?.tab || "team";

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50/50 dark:bg-background">
      <Header 
        title="Manager Dashboard" 
        breadcrumb="Overview"
        activeTab={activeTab}
      />
      
      <main className="flex-1 p-6 space-y-8 max-w-7xl mx-auto w-full">
        {/* Welcome Section */}
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
            Welcome back, {session.user.name || "Manager"}
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400">
            Monitor your team's goal submission and approval status for the 2026 cycle.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <DashboardCard
            title="Total Team Members"
            value={stats.totalMembers}
            description="Direct reports assigned to you"
            icon={Users}
          />
          <DashboardCard
            title="Pending Approvals"
            value={stats.pendingApprovals}
            description="Sheets awaiting your review"
            icon={ClipboardCheck}
            className={stats.pendingApprovals > 0 ? "ring-2 ring-neutral-400 dark:ring-neutral-500 ring-offset-2 dark:ring-offset-black" : ""}
          />
          <DashboardCard
            title="Submission Rate"
            value={`${stats.submissionRate}%`}
            description="Overall team progress"
            icon={TrendingUp}
          />
        </div>

        <ManagerTabsClient 
          initialTab={activeTab}
          teamMembers={teamMembers}
          checkInStatus={checkInStatus}
          userName={session.user.name || null}
          userEmail={session.user.email || null}
        />
      </main>
    </div>
  );
}

