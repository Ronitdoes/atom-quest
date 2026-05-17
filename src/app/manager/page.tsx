import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { ManagerService } from "@/lib/services/manager-service";
import { DashboardCard } from "@/components/shared/dashboard-card";
import { TeamTable } from "@/components/manager/TeamTable";
import { TeamCheckInsTable } from "@/components/manager/TeamCheckInsTable";
import { SharedGoalManager } from "@/components/manager/SharedGoalManager";
import { Header } from "@/components/shared/header";
import { Users, ClipboardCheck, TrendingUp, Target, Calendar } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { redirect } from "next/navigation";

export default async function ManagerDashboard() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "MANAGER") {
    redirect("/auth/login");
  }

  const managerId = session.user.id;
  const stats = await ManagerService.getTeamStats(managerId);
  const teamMembers = await ManagerService.getTeamMembers(managerId);
  const checkInStatus = await ManagerService.getTeamCheckInStatus(managerId);

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50/50 dark:bg-background">
      <Header 
        title="Manager Dashboard" 
        breadcrumb="Overview"
      />
      
      <main className="flex-1 p-6 space-y-8 max-w-7xl mx-auto w-full">
        {/* Welcome Section */}
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
            Welcome back, {session.user.name || "Manager"}
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400">
            Monitor your team's goal submission and approval status for the 2024 cycle.
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

        {/* Tabs for Team Status, Check-ins, and Shared Goals */}
        <Tabs defaultValue="team" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="team" className="gap-2">
              <Users className="h-4 w-4" />
              Team Status
            </TabsTrigger>
            <TabsTrigger value="checkins" className="gap-2">
              <Calendar className="h-4 w-4" />
              Team Check-ins
            </TabsTrigger>
            <TabsTrigger value="shared" className="gap-2">
              <Target className="h-4 w-4" />
              Shared Goals
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="team" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <Users className="h-5 w-5 text-neutral-500" />
                Team Status
              </h3>
            </div>
            <TeamTable members={teamMembers} />
          </TabsContent>

          <TabsContent value="checkins">
            <TeamCheckInsTable members={checkInStatus} />
          </TabsContent>

          <TabsContent value="shared">
            <SharedGoalManager teamMembers={teamMembers} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

