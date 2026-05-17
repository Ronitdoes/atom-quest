import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { GoalService } from "@/lib/services/goal-service";
import { DashboardCard } from "@/components/shared/dashboard-card";
import { Header } from "@/components/shared/header";
import { StatusBadge } from "@/components/shared/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { 
  Target, 
  ArrowRight, 
  Calendar, 
  ShieldCheck, 
  Activity,
  History
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function EmployeeDashboard() {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role !== "EMPLOYEE") {
    // Only employees can view this page, but sometimes managers test it.
    // Let's be lenient for demo purposes but ideally redirect.
    if (session?.user.role !== "MANAGER" && session?.user.role !== "ADMIN") {
      redirect("/auth/login");
    }
  }

  const cycleId = "2024";
  const goalSheet = await GoalService.getGoalSheet(session.user.id, cycleId);

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50/50 dark:bg-background">
      <Header 
        title="Employee Dashboard" 
        breadcrumb="My Overview"
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

        {/* CTA Section */}
        <Card className="relative overflow-hidden border-none bg-gradient-to-br from-neutral-800 via-neutral-900 to-black text-white shadow-xl group">
          <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <Target className="h-48 w-48" />
          </div>
          <CardContent className="p-10 md:p-14 relative z-10">
            <div className="max-w-2xl space-y-8">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold uppercase tracking-widest">
                  Active Cycle
                </div>
                <h3 className="text-4xl font-extrabold tracking-tight">
                  Design Your Future
                </h3>
                <p className="text-neutral-300 text-lg leading-relaxed opacity-90">
                  Align your professional growth with company objectives. Define measurable targets and set yourself up for success in the {cycleId} cycle.
                </p>
              </div>
              
              <div className="flex flex-wrap gap-4 pt-4">
                <Link 
                  href="/employee/goals"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "bg-white text-neutral-950 hover:bg-neutral-100 px-8 h-14 text-lg font-bold shadow-lg"
                  )}
                >
                  {goalSheet ? "Review My Goals" : "Start Goal Setting"}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
                
                <Link 
                  href="#"
                  className={cn(
                    buttonVariants({ size: "lg", variant: "outline" }),
                    "bg-transparent border-white/30 text-white hover:bg-white/10 h-14 text-lg px-8"
                  )}
                >
                  <History className="mr-2 h-5 w-5 opacity-70" />
                  View History
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Goals Preview (Optional Placeholder) */}
        {goalSheet && (
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <Target className="h-5 w-5 text-neutral-500" />
                Submission Summary
              </h3>
              <StatusBadge status={goalSheet.status} />
            </div>
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6">
              <div className="flex justify-between items-center text-sm">
                <span className="text-neutral-500">Number of Goals:</span>
                <span className="font-semibold">{goalSheet.goals.length}</span>
              </div>
              <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <p className="text-sm text-neutral-500 leading-relaxed italic">
                  "Your goals are the roadmap to your success. Keep pushing boundaries."
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

