"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/shared/status-badge";
import { 
  Activity, 
  User, 
  Target, 
  ArrowRight, 
  History,
  Send,
  ClipboardCheck,
  MessageSquare,
  CheckCircle2,
  FileText,
  Clock,
  Loader2
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const getLogConfig = (action: string) => {
  switch (action) {
    case "GOAL_SHEET_SUBMIT":
      return {
        title: "Goal Sheet Submitted",
        icon: Send,
        color: "text-blue-500",
        borderColor: "border-blue-500/30 dark:border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20",
        getDescription: (log: any) => `Successfully submitted goal sheet for the ${log.newValue?.goals ? log.newValue.goals.length + ' goals' : 'active cycle'} review.`
      };
    case "CHECK_IN_SUBMIT":
      return {
        title: "Quarterly Check-In",
        icon: ClipboardCheck,
        color: "text-emerald-500",
        borderColor: "border-emerald-500/30 dark:border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20",
        getDescription: (log: any) => `Submitted Q${log.newValue?.quarter} performance goals progress details.`
      };
    case "CHECK_IN_REVIEW":
      return {
        title: "Check-In Reviewed",
        icon: MessageSquare,
        color: "text-purple-500",
        borderColor: "border-purple-500/30 dark:border-purple-500/50 bg-purple-50/50 dark:bg-purple-950/20",
        getDescription: (log: any) => log.newValue?.managerComment ? `Manager review comment: "${log.newValue.managerComment}"` : "Quarterly check-in feedback submitted by manager."
      };
    case "GOAL_SHEET_APPROVE":
      return {
        title: "Goal Sheet Approved",
        icon: CheckCircle2,
        color: "text-emerald-500",
        borderColor: "border-emerald-500/30 dark:border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20",
        getDescription: (log: any) => "Your goal sheet has been officially approved by your manager."
      };
    case "GOAL_SHEET_REJECT":
      return {
        title: "Rework Requested",
        icon: FileText,
        color: "text-rose-500",
        borderColor: "border-rose-500/30 dark:border-rose-500/50 bg-rose-50/50 dark:bg-rose-950/20",
        getDescription: (log: any) => log.newValue?.comment ? `Goal sheet sent back. Comment: "${log.newValue.comment}"` : "Goal sheet rejected, rework requested by manager."
      };
    case "GOAL_SHEET_START_REVIEW":
      return {
        title: "Review Started",
        icon: Clock,
        color: "text-amber-500",
        borderColor: "border-amber-500/30 dark:border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20",
        getDescription: (log: any) => "Your manager started reviewing your goal sheet."
      };
    default:
      return {
        title: action.replace(/_/g, " "),
        icon: History,
        color: "text-neutral-500",
        borderColor: "border-neutral-500/30 bg-neutral-50/50 dark:bg-neutral-900/20",
        getDescription: (log: any) => `Action performed successfully on ${log.entityType || 'entity'}.`
      };
  }
};

interface EmployeeTabsClientProps {
  initialTab: string;
  cycleId: string;
  goalSheet: any;
  userName: string | null;
  userEmail: string | null;
}

export function EmployeeTabsClient({
  initialTab,
  cycleId,
  goalSheet,
  userName,
  userEmail,
}: EmployeeTabsClientProps) {
  const router = useRouter();
  const { update } = useSession();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(initialTab);

  // Profile Update State
  const [profileName, setProfileName] = useState(userName || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Sync name when prop changes
  useEffect(() => {
    if (userName) {
      setProfileName(userName);
    }
  }, [userName]);

  // History modal states
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const handleOpenHistory = async () => {
    setIsHistoryOpen(true);
    setIsLoadingHistory(true);
    try {
      const res = await fetch("/api/employee/audit-logs");
      if (res.ok) {
        const data = await res.json();
        setHistoryLogs(data.data || []);
      } else {
        toast.error("Failed to fetch history logs.");
      }
    } catch (error) {
      console.error("Error fetching history:", error);
      toast.error("An error occurred while loading history.");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Sync state with URL search params if they change
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", value);
    window.history.replaceState(null, "", `/employee?${params.toString()}`);
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const hasPasswordInput = !!(currentPassword || newPassword || confirmPassword);
    if (hasPasswordInput) {
      if (!currentPassword || !newPassword || !confirmPassword) {
        toast.error("Please fill in all password fields to update your password.");
        return;
      }
      if (newPassword !== confirmPassword) {
        toast.error("New passwords do not match.");
        return;
      }
    }

    if (!profileName.trim()) {
      toast.error("Name cannot be empty.");
      return;
    }

    setChangingPassword(true);
    try {
      const payload: any = { name: profileName };
      if (hasPasswordInput) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
        payload.confirmPassword = confirmPassword;
      }

      const res = await fetch("/api/user/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Profile updated successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        await update();
        router.refresh();
      } else {
        toast.error(data.message || "Failed to update profile.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while updating your profile.");
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <>
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="overview" className="gap-2">
            <Activity className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profile Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8 animate-in fade-in-50 duration-300">
          {/* CTA Section */}
          <Card className="relative overflow-hidden border border-zinc-800/80 bg-gradient-to-br from-zinc-900 via-neutral-900 to-black text-white shadow-2xl group rounded-2xl">
            <div className="absolute -top-10 -right-10 p-12 opacity-[0.03] group-hover:opacity-[0.06] group-hover:scale-110 transition-all duration-700 pointer-events-none">
              <Target className="h-64 w-64 text-white" />
            </div>
            {/* Subtle light glow in corner */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-zinc-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <CardContent className="p-10 md:p-14 relative z-10">
              <div className="max-w-2xl space-y-8">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-800/50 backdrop-blur-md border border-zinc-700/30 text-[10px] font-bold uppercase tracking-widest text-zinc-300">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active Cycle: {cycleId}
                  </div>
                  <h3 className="text-4xl font-black tracking-tight bg-gradient-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
                    Design Your Future
                  </h3>
                  <p className="text-zinc-400 text-base md:text-lg leading-relaxed opacity-95">
                    Align your professional growth with company objectives. Define measurable targets, collaborate on shared thrust areas, and set yourself up for success.
                  </p>
                </div>
                
                <div className="flex flex-wrap gap-4 pt-2">
                  <Link 
                    href="/employee/goals"
                    className={cn(
                      buttonVariants({ size: "lg" }),
                      "bg-white text-zinc-950 hover:bg-zinc-100 px-8 h-14 text-base font-bold shadow-xl rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
                    )}
                  >
                    {goalSheet ? "Review My Goals" : "Start Goal Setting"}
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  
                  <Button 
                    onClick={handleOpenHistory}
                    size="lg"
                    variant="outline"
                    className="bg-zinc-900/30 border-zinc-800 text-zinc-300 hover:bg-zinc-800/50 hover:text-white h-14 text-base px-8 rounded-xl shadow-lg transition-all duration-200 hover:scale-[1.02]"
                  >
                    <History className="mr-2 h-5 w-5 opacity-70" />
                    View History
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Goals Preview & Stats */}
          {goalSheet ? (
            <div className="space-y-6 pt-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-900 pb-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-extrabold text-zinc-100 flex items-center gap-2">
                    <Target className="h-5 w-5 text-zinc-400" />
                    Thrust Area Summary
                  </h3>
                  <p className="text-xs text-zinc-550">Review your submitted performance indicators and weightage distribution.</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Goal Sheet Status:</span>
                  <StatusBadge status={goalSheet.status} />
                </div>
              </div>

              {/* Enhanced Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-zinc-950/40 border border-zinc-850 rounded-xl p-5 flex items-center justify-between shadow-sm">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-zinc-550 tracking-wider">Number of Goals</span>
                    <div className="text-2xl font-black text-zinc-100">{goalSheet.goals.length} <span className="text-xs text-zinc-500 font-medium">defined</span></div>
                  </div>
                  <div className="size-10 rounded-lg bg-zinc-900 flex items-center justify-center border border-zinc-800/60">
                    <FileText className="w-5 h-5 text-zinc-400" />
                  </div>
                </div>

                <div className="bg-zinc-950/40 border border-zinc-850 rounded-xl p-5 flex items-center justify-between shadow-sm">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-zinc-550 tracking-wider">Total Weightage</span>
                    <div className="text-2xl font-black text-emerald-400">100% <span className="text-xs text-zinc-500 font-medium">balanced</span></div>
                  </div>
                  <div className="size-10 rounded-lg bg-zinc-900 flex items-center justify-center border border-zinc-800/60">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  </div>
                </div>

                <div className="bg-zinc-950/40 border border-zinc-850 rounded-xl p-5 flex items-center justify-between shadow-sm">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-zinc-550 tracking-wider">Cycle Period</span>
                    <div className="text-2xl font-black text-zinc-100">{cycleId} <span className="text-xs text-zinc-500 font-medium">window</span></div>
                  </div>
                  <div className="size-10 rounded-lg bg-zinc-900 flex items-center justify-center border border-zinc-800/60">
                    <Clock className="w-5 h-5 text-zinc-400" />
                  </div>
                </div>
              </div>

              {/* Goals Card Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {goalSheet.goals.map((goal: any, index: number) => (
                  <div 
                    key={goal.id || index}
                    className="bg-zinc-950/60 border border-zinc-850/80 rounded-xl p-6 hover:border-zinc-800 transition-all duration-200 shadow-lg flex flex-col justify-between group relative overflow-hidden"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex text-[9px] font-extrabold uppercase tracking-widest text-zinc-400 bg-zinc-900 border border-zinc-800/60 px-2 py-0.5 rounded">
                          {goal.thrustArea}
                        </span>
                        <span className="text-xs font-black text-zinc-300 bg-zinc-900/60 px-2 py-1 rounded-lg border border-zinc-850">
                          {goal.weightage}%
                        </span>
                      </div>
                      
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-zinc-100 group-hover:text-white transition-colors flex items-center gap-2">
                          {goal.title}
                          {goal.sharedGoalId && (
                            <span className="text-[8px] bg-zinc-900 border border-zinc-800 text-zinc-500 px-1.5 py-0.2 rounded uppercase font-bold">Shared</span>
                          )}
                        </h4>
                        <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
                          {goal.description || "No specific details provided for this KPI."}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-zinc-900 flex justify-between items-center text-xs">
                      <span className="text-zinc-550 font-medium">Target Metric:</span>
                      <span className="font-mono text-zinc-300 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-850">
                        {goal.target} <span className="text-[9px] text-zinc-500 uppercase font-bold">{goal.uomType}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Empty State when no goals defined */
            <div className="border border-dashed border-zinc-800/80 bg-zinc-950/20 rounded-2xl p-12 text-center max-w-xl mx-auto space-y-6 pt-10">
              <div className="size-14 rounded-full bg-zinc-900 border border-zinc-800/60 flex items-center justify-center mx-auto shadow-inner relative group">
                <Target className="w-6 h-6 text-zinc-500 group-hover:scale-110 transition-transform" />
                <div className="absolute inset-0 bg-zinc-500/5 rounded-full blur-md" />
              </div>
              <div className="space-y-2">
                <h4 className="text-base font-bold text-zinc-200">No Performance Goals Defined</h4>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed">
                  You haven't initialized your goal sheet for the {cycleId} cycle. Build your roadmap to progress and submit your thrust areas.
                </p>
              </div>
              <div className="pt-2">
                <Link 
                  href="/employee/goals"
                  className={cn(
                    buttonVariants({ size: "sm" }),
                    "bg-zinc-100 text-zinc-950 hover:bg-zinc-200 font-bold px-6 rounded-lg transition-colors"
                  )}
                >
                  Create Goal Sheet
                </Link>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="profile" className="space-y-6">
          {/* Profile Inputs */}
          <Card className="bg-white dark:bg-zinc-950 border-neutral-200 dark:border-zinc-800/80 shadow-xl rounded-xl">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-neutral-900 dark:text-zinc-100">Employee Profile Settings</CardTitle>
              <CardDescription className="text-xs text-neutral-500 dark:text-zinc-450">Manage your account details and change your security credentials.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="prof-name" className="text-xs font-bold text-neutral-500 dark:text-zinc-400 uppercase tracking-wider">Full Name</Label>
                    <Input id="prof-name" value={profileName} onChange={(e) => setProfileName(e.target.value)} className="bg-white dark:bg-zinc-900/60 border-neutral-200 dark:border-zinc-800 text-neutral-900 dark:text-zinc-100 focus:ring-1 focus:ring-zinc-700" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prof-email" className="text-xs font-bold text-neutral-500 dark:text-zinc-400 uppercase tracking-wider">Email Address</Label>
                    <Input id="prof-email" defaultValue={userEmail || "employee@atomquest.gov"} disabled className="bg-neutral-100 dark:bg-zinc-950 border-neutral-200 dark:border-zinc-850 text-neutral-500 dark:text-zinc-500 cursor-not-allowed" />
                  </div>
                </div>
                
                <div className="h-px bg-neutral-100 dark:bg-zinc-800/50 my-6" />
                
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-neutral-500 dark:text-zinc-400 uppercase tracking-wider">Change Security Password</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="prof-curr" className="text-xs font-bold text-neutral-500 dark:text-zinc-400 uppercase tracking-wider">Current Password</Label>
                      <Input id="prof-curr" type="password" placeholder="••••••••" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="bg-white dark:bg-zinc-900/60 border-neutral-200 dark:border-zinc-800 text-neutral-900 dark:text-zinc-100 focus:ring-1 focus:ring-zinc-700" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="prof-new" className="text-xs font-bold text-neutral-500 dark:text-zinc-400 uppercase tracking-wider">New Password</Label>
                      <Input id="prof-new" type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="bg-white dark:bg-zinc-900/60 border-neutral-200 dark:border-zinc-800 text-neutral-900 dark:text-zinc-100 focus:ring-1 focus:ring-zinc-700" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="prof-conf" className="text-xs font-bold text-neutral-500 dark:text-zinc-400 uppercase tracking-wider">Confirm Password</Label>
                      <Input id="prof-conf" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="bg-white dark:bg-zinc-900/60 border-neutral-200 dark:border-zinc-800 text-neutral-900 dark:text-zinc-100 focus:ring-1 focus:ring-zinc-700" />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={changingPassword} className="bg-neutral-900 hover:bg-neutral-850 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950 font-bold px-6 h-10 text-xs shadow-md rounded-lg">
                    {changingPassword ? "Saving Changes..." : "Save Account Changes"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-lg bg-zinc-950 border border-zinc-900 text-white rounded-2xl p-6 shadow-2xl">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-zinc-100">
              <History className="w-5 h-5 text-zinc-400" />
              Action History
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Track your performance goal submissions, saving events, and manager approvals.
            </DialogDescription>
          </DialogHeader>

          {isLoadingHistory ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
              <p className="text-sm text-zinc-400">Loading your history...</p>
            </div>
          ) : !Array.isArray(historyLogs) || historyLogs.length === 0 ? (
            <div className="text-center py-12 text-zinc-400 space-y-2">
              <History className="w-8 h-8 mx-auto opacity-40 text-zinc-500" />
              <p className="text-sm font-semibold text-zinc-300">No history events found</p>
              <p className="text-xs text-zinc-500">Your actions will be recorded here once you save drafts or submit goals.</p>
            </div>
          ) : (
            <div className="relative max-h-[60vh] overflow-y-auto pr-2 pl-12 py-2 scrollbar-thin scrollbar-thumb-zinc-800">
              {/* Timeline Line */}
              <div className="absolute left-6 top-0 bottom-0 w-px bg-zinc-800" />
              
              <div className="space-y-6 relative">
                {Array.isArray(historyLogs) && historyLogs.map((log) => {
                  const config = getLogConfig(log.action);
                  const Icon = config.icon;
                  return (
                    <div key={log.id} className="relative pl-6 group">
                      {/* Timeline Dot Indicator */}
                      <div className={cn(
                        "absolute -left-[38px] top-1.5 flex items-center justify-center w-7 h-7 rounded-full bg-zinc-950 border shadow-md transition-all duration-300 group-hover:scale-110",
                        config.borderColor
                      )}>
                        <Icon className={cn("w-3.5 h-3.5", config.color)} />
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-4">
                          <h4 className="text-sm font-bold text-zinc-150 group-hover:text-white transition-colors">
                            {config.title}
                          </h4>
                          <span className="text-[10px] text-zinc-550 font-semibold tracking-wider whitespace-nowrap uppercase">
                            {new Date(log.timestamp).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          {config.getDescription(log)}
                        </p>
                        <span className="inline-block text-[9px] text-zinc-500 font-mono">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
