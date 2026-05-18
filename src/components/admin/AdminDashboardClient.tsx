"use client";

import { useState, useEffect, Fragment } from "react";
import { useRouter } from "next/navigation";
import { 
  ShieldCheck, 
  Activity, 
  Settings, 
  Users, 
  ClipboardCheck, 
  TrendingUp, 
  Target, 
  Calendar, 
  History, 
  Unlock, 
  Lock, 
  Search, 
  RefreshCw, 
  UserCheck, 
  User,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  FileText,
  Clock,
  Bell,
  Building,
  Award,
  Grid
} from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import { DashboardCard } from "@/components/shared/dashboard-card";
import { TableWrapper } from "@/components/shared/table-wrapper";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { AdminNavbar } from "@/components/admin/AdminNavbar";

interface AdminDashboardClientProps {
  adminName: string | null;
  adminEmail: string | null;
}

export function AdminDashboardClient({ adminName, adminEmail }: AdminDashboardClientProps) {
  // Navigation & Filtering State
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedCycle, setSelectedCycle] = useState("2026");
  
  // Data State
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [goalSheets, setGoalSheets] = useState<any[]>([]);
  
  // Reports State
  const [selectedReportQuarter, setSelectedReportQuarter] = useState("1");
  const [reportData, setReportData] = useState<any[]>([]);
  const [loadingReport, setLoadingReport] = useState(true);
  const [reportSearch, setReportSearch] = useState("");
  
  // Loading & Refresh State
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filtering Client State
  const [userSearch, setUserSearch] = useState("");
  const [sheetSearch, setSheetSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // User Pagination State
  const [userPage, setUserPage] = useState(1);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const [userPageSize, setUserPageSize] = useState(10);
  const [userTotalCount, setUserTotalCount] = useState(0);

  const handleUserSearchChange = (val: string) => {
    setUserSearch(val);
    setUserPage(1);
  };

  const handleRoleFilterChange = (val: string) => {
    setRoleFilter(val);
    setUserPage(1);
  };

  // User Edit Modal State
  const [editUser, setEditUser] = useState<any>(null);
  const [editRole, setEditRole] = useState<string>("EMPLOYEE");
  const [editManagerId, setEditManagerId] = useState<string>("none");
  const [savingUser, setSavingUser] = useState(false);

  const router = useRouter();
  const { update } = useSession();

  // Profile Update State
  const [profileName, setProfileName] = useState(adminName || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Sync name when prop changes
  useEffect(() => {
    if (adminName) {
      setProfileName(adminName);
    }
  }, [adminName]);

  // Analytics State
  const [selectedAnalyticsQuarter, setSelectedAnalyticsQuarter] = useState("1");
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoadingAnalytics(true);
      const res = await fetch(`/api/admin/analytics?cycleId=${selectedCycle}&quarter=${selectedAnalyticsQuarter}`);
      if (res.ok) {
        const data = await res.json();
        setAnalyticsData(data);
      }
    } catch (err) {
      console.error("Failed to fetch analytics", err);
      toast.error("Failed to load analytics data");
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // Run analytics query when filters change
  useEffect(() => {
    fetchAnalytics();
  }, [selectedCycle, selectedAnalyticsQuarter]);

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

  // Unlock Modal State
  const [unlockSheet, setUnlockSheet] = useState<any>(null);
  const [unlockReason, setUnlockReason] = useState("");
  const [unlocking, setUnlocking] = useState(false);

  // Expanded Audit Logs
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Reminders State
  const [selectedReminderQuarter, setSelectedReminderQuarter] = useState("1");
  const [remindersLoading, setRemindersLoading] = useState<Record<string, boolean>>({});
  const [reminderEstimates, setReminderEstimates] = useState<Record<string, number | null>>({
    GOAL_SHEET: null,
    GOAL_APPROVAL: null,
    CHECK_IN: null,
    CHECKIN_REVIEW: null,
  });
  const [reminderRecipients, setReminderRecipients] = useState<Record<string, string[]>>({
    GOAL_SHEET: [],
    GOAL_APPROVAL: [],
    CHECK_IN: [],
    CHECKIN_REVIEW: [],
  });
  const [confirmBroadcastType, setConfirmBroadcastType] = useState<string | null>(null);
  const [broadcasting, setBroadcasting] = useState(false);

  const fetchReminderEstimate = async (type: string, q?: number) => {
    try {
      setRemindersLoading(prev => ({ ...prev, [type]: true }));
      const res = await fetch("/api/admin/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          cycleId: selectedCycle,
          quarter: q || parseInt(selectedReminderQuarter, 10),
          preview: true,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setReminderEstimates(prev => ({ ...prev, [type]: data.count }));
        setReminderRecipients(prev => ({ ...prev, [type]: data.recipients }));
      }
    } catch (err) {
      console.error(`Failed to fetch estimate for ${type}`, err);
    } finally {
      setRemindersLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  const fetchAllReminderEstimates = (q?: number) => {
    const targetQ = q || parseInt(selectedReminderQuarter, 10);
    fetchReminderEstimate("GOAL_SHEET");
    fetchReminderEstimate("GOAL_APPROVAL");
    fetchReminderEstimate("CHECK_IN", targetQ);
    fetchReminderEstimate("CHECKIN_REVIEW", targetQ);
  };

  const handleSendBroadcast = async () => {
    if (!confirmBroadcastType) return;
    setBroadcasting(true);
    try {
      const res = await fetch("/api/admin/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: confirmBroadcastType,
          cycleId: selectedCycle,
          quarter: parseInt(selectedReminderQuarter, 10),
          preview: false,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Success! Broadcast reminder sent to ${data.count} recipients.`);
        setConfirmBroadcastType(null);
        fetchAllReminderEstimates(parseInt(selectedReminderQuarter, 10));
        fetchAuditLogs();
      } else {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to send broadcast");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setBroadcasting(false);
    }
  };

  // API Fetch Functions
  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const res = await fetch(`/api/admin/stats?cycleId=${selectedCycle}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Failed to fetch stats", err);
      toast.error("Failed to load system statistics");
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const searchParams = new URLSearchParams({
        page: userPage.toString(),
        limit: userPageSize.toString(),
        search: userSearch,
        role: roleFilter,
      });
      const res = await fetch(`/api/admin/users?${searchParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setUserTotalPages(data.pagination.totalPages);
        setUserTotalCount(data.pagination.totalCount);
        
        // Extract all goal sheets across all users for the current cycle
        const sheets: any[] = [];
        data.users.forEach((user: any) => {
          user.goalSheets.forEach((sheet: any) => {
            if (sheet.cycleId === selectedCycle) {
              sheets.push({
                id: sheet.id,
                userId: user.id,
                userName: user.name,
                userEmail: user.email,
                status: sheet.status,
                updatedAt: sheet.updatedAt,
                cycleId: sheet.cycleId,
              });
            }
          });
        });
        setGoalSheets(sheets);
      }
    } catch (err) {
      console.error("Failed to fetch users", err);
      toast.error("Failed to load users list");
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchManagers = async () => {
    try {
      const res = await fetch("/api/admin/managers");
      if (res.ok) {
        const data = await res.json();
        setManagers(data);
      }
    } catch (err) {
      console.error("Failed to fetch managers list", err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      setLoadingLogs(true);
      const res = await fetch("/api/admin/audit-logs");
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (err) {
      console.error("Failed to fetch audit logs", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const fetchReport = async () => {
    try {
      setLoadingReport(true);
      const res = await fetch(`/api/admin/reports/achievements?cycleId=${selectedCycle}&quarter=${selectedReportQuarter}`);
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      }
    } catch (err) {
      console.error("Failed to fetch report data", err);
      toast.error("Failed to load achievement report");
    } finally {
      setLoadingReport(false);
    }
  };

  const exportToCSV = (format: "csv" | "excel") => {
    if (reportData.length === 0) {
      toast.error("No report data available to export");
      return;
    }

    const isAll = selectedReportQuarter === "all";

    const headers = [
      "Employee Name",
      "Employee Email",
      ...(isAll ? ["Quarter"] : []),
      "Thrust Area",
      "Goal Title",
      "UoM Type",
      "Weightage (%)",
      "Target",
      "Achievement",
      "Progress (Clamped %)",
      "Progress (Raw %)",
      "Goal Sheet Status"
    ];

    const rows = reportData.map((row) => [
      `"${row.employeeName.replace(/"/g, '""')}"`,
      `"${row.employeeEmail.replace(/"/g, '""')}"`,
      ...(isAll ? [`"Q${row.quarter}"`] : []),
      `"${row.thrustArea.replace(/"/g, '""')}"`,
      `"${row.title.replace(/"/g, '""')}"`,
      `"${row.uomType}"`,
      row.weightage,
      row.target,
      row.achievementValue,
      row.progressClamped,
      row.progressRaw,
      row.goalSheetStatus
    ]);

    const csvContent = 
      [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { 
      type: format === "excel" 
        ? "application/vnd.ms-excel;charset=utf-8;" 
        : "text/csv;charset=utf-8;" 
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    
    const filename = `achievement_report_cycle_${selectedCycle}_${isAll ? "all_quarters" : `q${selectedReportQuarter}`}.${format === "excel" ? "xls" : "csv"}`;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`Report exported to ${format.toUpperCase()} successfully!`);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchStats(),
      fetchUsers(),
      fetchManagers(),
      fetchAuditLogs(),
      fetchReport(),
      fetchAnalytics(),
      fetchAllReminderEstimates(parseInt(selectedReminderQuarter, 10))
    ]);
    setRefreshing(false);
    toast.success("Dashboard data refreshed successfully");
  };

  // Run on mount and cycle change
  useEffect(() => {
    fetchStats();
    fetchManagers();
    fetchAuditLogs();
  }, [selectedCycle]);

  // Run when user pagination parameters, search, or role filters change
  useEffect(() => {
    fetchUsers();
  }, [userPage, userPageSize, userSearch, roleFilter, selectedCycle]);

  // Run report query when report filters change
  useEffect(() => {
    fetchReport();
  }, [selectedCycle, selectedReportQuarter]);

  // Run reminders preview query when filters change
  useEffect(() => {
    fetchAllReminderEstimates(parseInt(selectedReminderQuarter, 10));
  }, [selectedCycle, selectedReminderQuarter]);

  // Handle User Edit Modal Open
  const handleOpenEditUser = (user: any) => {
    setEditUser(user);
    setEditRole(user.role);
    setEditManagerId(user.managerId || "none");
  };

  // Submit User Role / Manager Edit
  const handleSaveUser = async () => {
    if (!editUser) return;
    setSavingUser(true);

    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: editUser.id,
          role: editRole,
          managerId: editManagerId === "none" ? null : editManagerId,
        }),
      });

      if (res.ok) {
        toast.success(`Successfully updated ${editUser.name || "user"}'s details`);
        setEditUser(null);
        fetchUsers();
        fetchStats();
        fetchAuditLogs();
      } else {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to update user");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setSavingUser(false);
    }
  };

  // Submit Unlock Goal Sheet
  const handleUnlockSheet = async () => {
    if (!unlockSheet || !unlockReason.trim()) {
      toast.error("Please provide an unlock reason");
      return;
    }
    setUnlocking(true);

    try {
      const res = await fetch("/api/admin/unlock-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheetId: unlockSheet.id,
          reason: unlockReason,
        }),
      });

      if (res.ok) {
        toast.success("Goal sheet unlocked successfully!");
        setUnlockSheet(null);
        setUnlockReason("");
        fetchUsers();
        fetchStats();
        fetchAuditLogs();
      } else {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to unlock goal sheet");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setUnlocking(false);
    }
  };

  // Filtered Lists
  const filteredUsers = users;

  const filteredSheets = goalSheets.filter((s) => {
    const matchesSearch = 
      (s.userName || "").toLowerCase().includes(sheetSearch.toLowerCase()) ||
      s.userEmail.toLowerCase().includes(sheetSearch.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredReport = reportData.filter((row) => {
    const matchesSearch =
      row.employeeName.toLowerCase().includes(reportSearch.toLowerCase()) ||
      row.employeeEmail.toLowerCase().includes(reportSearch.toLowerCase()) ||
      row.title.toLowerCase().includes(reportSearch.toLowerCase()) ||
      row.thrustArea.toLowerCase().includes(reportSearch.toLowerCase());
    return matchesSearch;
  });

  const isInitialLoading = 
    (loadingStats && !stats) || 
    (loadingUsers && users.length === 0) || 
    (loadingLogs && auditLogs.length === 0);

  if (isInitialLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-[#09090b]">
        <AdminNavbar activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="flex-1 p-6 space-y-8 max-w-7xl mx-auto w-full">
          <div className="space-y-8">
            {/* Top Banner Skeleton */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-2">
                <div className="h-8 w-64 bg-zinc-900/60 rounded-lg animate-pulse" />
                <div className="h-4 w-80 max-w-full bg-zinc-900/40 rounded-md animate-pulse" />
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-[140px] bg-zinc-900/60 rounded-lg animate-pulse" />
                <div className="h-10 w-10 bg-zinc-900/60 rounded-lg animate-pulse" />
              </div>
            </div>

            {/* Overview Cards Skeleton */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-zinc-900/20 border border-zinc-900/80 p-6 rounded-2xl space-y-4 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-28 bg-zinc-900/60 rounded animate-pulse" />
                    <div className="size-8 bg-zinc-900/60 rounded-lg animate-pulse" />
                  </div>
                  <div className="h-8 w-20 bg-zinc-900/85 rounded animate-pulse" />
                  <div className="h-3.5 w-44 bg-zinc-900/40 rounded animate-pulse" />
                </div>
              ))}
            </div>

            {/* Tabs Navigation Skeleton */}
            <div className="bg-zinc-950/40 border border-zinc-900/80 p-1.5 rounded-xl flex gap-2 overflow-x-auto">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-9 w-32 bg-zinc-900/60 rounded-lg shrink-0 animate-pulse" />
              ))}
            </div>

            {/* Tab Content Overview Skeleton */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Status Distribution Skeleton */}
              <div className="bg-zinc-900/20 border border-zinc-900/80 rounded-2xl p-6 space-y-6">
                <div className="space-y-2">
                  <div className="h-5 w-48 bg-zinc-900/60 rounded animate-pulse" />
                  <div className="h-4 w-72 bg-zinc-900/40 rounded animate-pulse" />
                </div>
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex justify-between">
                        <div className="h-3.5 w-20 bg-zinc-900/60 rounded animate-pulse" />
                        <div className="h-3.5 w-12 bg-zinc-900/60 rounded animate-pulse" />
                      </div>
                      <div className="h-3 w-full bg-zinc-900/30 rounded-full overflow-hidden">
                        <div className="h-full bg-zinc-900/60 rounded-full w-2/3 animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Check-ins Tracker Skeleton */}
              <div className="bg-zinc-900/20 border border-zinc-900/80 rounded-2xl p-6 space-y-6">
                <div className="space-y-2">
                  <div className="h-5 w-52 bg-zinc-900/60 rounded animate-pulse" />
                  <div className="h-4 w-64 bg-zinc-900/40 rounded animate-pulse" />
                </div>
                <div className="space-y-5 divide-y divide-zinc-900/80">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <div key={idx} className="flex justify-between items-center pt-4 first:pt-0">
                      <div className="space-y-2">
                        <div className="h-4 w-24 bg-zinc-900/60 rounded animate-pulse" />
                        <div className="h-3 w-48 bg-zinc-900/40 rounded animate-pulse" />
                      </div>
                      <div className="h-6 w-20 bg-zinc-900/60 rounded-full animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#09090b]">
      <AdminNavbar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 p-6 space-y-8 max-w-7xl mx-auto w-full">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight">
            System Administration
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm">
            Configure system-wide cycles, manage roles, audit core events, and override locks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Cycle Selector */}
          <div className="flex items-center gap-2">
            <Label htmlFor="global-cycle" className="text-xs font-bold text-neutral-400 uppercase shrink-0">
              Active Cycle:
            </Label>
            <Select value={selectedCycle} onValueChange={(val) => setSelectedCycle(val || "2026")}>
              <SelectTrigger id="global-cycle" className="w-[120px] bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
                <SelectValue placeholder="2026" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2026">2026 Cycle</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            variant="outline" 
            size="icon" 
            onClick={handleRefresh} 
            disabled={refreshing}
            className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 h-10 w-10 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Overview Cards (Track Completion) */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          title="Total Users"
          value={loadingStats ? "..." : stats?.users?.total || 0}
          description={`${stats?.users?.employees || 0} Employees, ${stats?.users?.managers || 0} Managers`}
          icon={Users}
        />
        <DashboardCard
          title="Active Goal Sheets"
          value={loadingStats ? "..." : stats?.goalSheets?.total || 0}
          description="In current active cycle"
          icon={Target}
        />
        <DashboardCard
          title="Submission Rate"
          value={loadingStats ? "..." : `${stats?.goalSheets?.submissionRate || 0}%`}
          description="Goals set beyond Draft"
          icon={TrendingUp}
          className={stats?.goalSheets?.submissionRate > 80 ? "ring-2 ring-emerald-500/10" : ""}
        />
        <DashboardCard
          title="Approval Rate"
          value={loadingStats ? "..." : `${stats?.goalSheets?.approvalRate || 0}%`}
          description="Total approved goal sheets"
          icon={ShieldCheck}
          className={stats?.goalSheets?.approvalRate > 80 ? "ring-2 ring-emerald-500/20" : ""}
        />
      </div>

      {/* Core Admin Panel Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-neutral-100 dark:bg-neutral-900/60 p-1 rounded-xl mb-6">
          <TabsTrigger value="overview" className="gap-2 rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider">
            <Activity className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="completion" className="gap-2 rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider">
            <ClipboardCheck className="h-4 w-4" />
            Completion Dashboard
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2 rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider">
            <TrendingUp className="h-4 w-4" />
            Analytics Portal
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2 rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider">
            <UserCheck className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="goals" className="gap-2 rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider">
            <Unlock className="h-4 w-4" />
            Goal Unlock Flow
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2 rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider">
            <History className="h-4 w-4" />
            Audit Logs
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2 rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider">
            <FileText className="h-4 w-4" />
            Reports
          </TabsTrigger>
          <TabsTrigger value="profile" className="gap-2 rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider">
            <User className="h-4 w-4" />
            Profile Settings
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: System Overview */}
        <TabsContent value="overview" className="space-y-6">
          {activeTab === "overview" && (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Status Distribution */}
              <Card className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">Goal Sheet Status Distribution</CardTitle>
                  <CardDescription>Visual tracker of workflow stages for active employee sheets.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {stats?.goalSheets?.distribution ? (
                    Object.entries(stats.goalSheets.distribution).map(([status, count]: [string, any]) => {
                      const total = stats.goalSheets.total || 1;
                      const percent = Math.round((count / total) * 100);
                      
                      let barColor = "bg-neutral-400";
                      if (status === "APPROVED") barColor = "bg-emerald-500";
                      if (status === "SUBMITTED") barColor = "bg-blue-500";
                      if (status === "UNDER_REVIEW") barColor = "bg-amber-500";
                      if (status === "REWORK_REQUIRED") barColor = "bg-rose-500";

                      return (
                        <div key={status} className="space-y-1">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-neutral-500 uppercase tracking-wide">{status.replace(/_/g, " ")}</span>
                            <span className="text-neutral-900 dark:text-neutral-100 font-bold">{count} ({percent}%)</span>
                          </div>
                          <div className="h-2.5 w-full bg-neutral-100 dark:bg-neutral-900 rounded-full overflow-hidden">
                            <div className={`h-full ${barColor} rounded-full`} style={{ width: `${percent}%` }} />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="h-48 flex items-center justify-center text-sm text-neutral-500">
                      No data in cycle {selectedCycle}.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Check-ins Tracker */}
              <Card className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">Quarterly Check-In Completion</CardTitle>
                  <CardDescription>Overall tracking of employee check-ins across the 4 quarters.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="divide-y divide-neutral-100 dark:divide-neutral-900">
                    {stats?.checkIns?.map((q: any) => {
                      const submissionRatio = q.total > 0 ? Math.round((q.reviewed / q.total) * 100) : 0;
                      return (
                        <div key={q.quarter} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between">
                          <div>
                            <div className="font-bold text-sm text-neutral-900 dark:text-neutral-100">Quarter {q.quarter}</div>
                            <div className="text-xs text-neutral-500">
                              {q.total} Check-ins submitted ({q.reviewed} reviewed, {q.pending} pending)
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={submissionRatio === 100 && q.total > 0 ? "bg-emerald-500/10 text-emerald-500 border-none" : "bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border-none"}>
                              {submissionRatio}% Reviewed
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                    {(!stats?.checkIns || stats.checkIns.length === 0) && (
                      <div className="h-48 flex items-center justify-center text-sm text-neutral-500">
                        No check-ins logged.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Tab 1.5: Analytics Portal */}
        <TabsContent value="analytics" className="space-y-6">
          {activeTab === "analytics" && (
            <>
              {/* Performance Control Bar */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-neutral-50 dark:bg-neutral-900/40 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800/80">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">Quarterly Drilldown Filter</h3>
                  <p className="text-xs text-neutral-500 mt-0.5">Applies to Manager Effectiveness and Department Performance.</p>
                </div>
                <div className="flex items-center gap-3">
                  <Select value={selectedAnalyticsQuarter} onValueChange={(val) => setSelectedAnalyticsQuarter(val || "1")}>
                    <SelectTrigger className="w-[160px] bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800">
                      <SelectValue placeholder="Select Quarter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Quarter 1</SelectItem>
                      <SelectItem value="2">Quarter 2</SelectItem>
                      <SelectItem value="3">Quarter 3</SelectItem>
                      <SelectItem value="4">Quarter 4</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={fetchAnalytics} disabled={loadingAnalytics} className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800">
                    <RefreshCw className={`h-4 w-4 ${loadingAnalytics ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </div>

              {loadingAnalytics && !analyticsData ? (
                <div className="h-96 flex flex-col items-center justify-center gap-4 text-sm text-neutral-500 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl">
                  <RefreshCw className="h-8 w-8 animate-spin text-neutral-400" />
                  <span>Analyzing organizational output...</span>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Charts Grid */}
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* QoQ Trends Area Chart */}
                    <Card className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800">
                      <CardHeader>
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-emerald-500" />
                          Quarter-over-Quarter Performance Trends
                        </CardTitle>
                        <CardDescription>Track company-wide average weighted progress over the quarters.</CardDescription>
                      </CardHeader>
                      <CardContent className="h-80">
                        {mounted && (
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={analyticsData?.qoqTrends || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <defs>
                                <linearGradient id="colorProgress" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#262626" opacity={0.3} />
                              <XAxis dataKey="quarter" tickFormatter={(q) => `Q${q}`} stroke="#737373" fontSize={11} fontWeight={600} />
                              <YAxis domain={[0, 100]} stroke="#737373" fontSize={11} fontWeight={600} />
                              <Tooltip content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="bg-neutral-950 border border-neutral-850 p-3 rounded-xl shadow-2xl backdrop-blur-md">
                                      <p className="text-xs font-bold text-neutral-400 uppercase tracking-wide">Quarter {payload[0].payload.quarter}</p>
                                      <p className="text-sm font-black text-white mt-1">Average Progress: <span className="text-emerald-400">{payload[0].value}%</span></p>
                                      <div className="border-t border-neutral-800 my-2 pt-1.5 space-y-1">
                                        <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Goal Achievements Status</p>
                                        <p className="text-xs text-neutral-300">Not Started: <span className="font-bold text-neutral-400">{payload[0].payload.statusDistribution.notStarted}%</span></p>
                                        <p className="text-xs text-neutral-300">On Track: <span className="font-bold text-amber-400">{payload[0].payload.statusDistribution.onTrack}%</span></p>
                                        <p className="text-xs text-neutral-300">Completed: <span className="font-bold text-emerald-400">{payload[0].payload.statusDistribution.completed}%</span></p>
                                      </div>
                                    </div>
                                  );
                                }
                                return null;
                              }} />
                              <Area type="monotone" dataKey="averageProgress" stroke="#10b981" fillOpacity={1} fill="url(#colorProgress)" strokeWidth={3} />
                            </AreaChart>
                          </ResponsiveContainer>
                        )}
                      </CardContent>
                    </Card>

                    {/* Goal Status Donut Chart */}
                    <Card className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800">
                      <CardHeader>
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                          <Target className="h-5 w-5 text-amber-500" />
                          Goal Achievement Distribution (Q{selectedAnalyticsQuarter})
                        </CardTitle>
                        <CardDescription>Status breakdown of goal achievements in the selected quarter.</CardDescription>
                      </CardHeader>
                      <CardContent className="h-80 flex flex-col justify-center">
                        {mounted && (() => {
                          const activeTrend = analyticsData?.qoqTrends?.find((t: any) => t.quarter === parseInt(selectedAnalyticsQuarter, 10));
                          const pieData = [
                            { name: "Completed", value: activeTrend?.statusDistribution?.completed || 0, color: "#10b981" },
                            { name: "On Track", value: activeTrend?.statusDistribution?.onTrack || 0, color: "#f59e0b" },
                            { name: "Not Started", value: activeTrend?.statusDistribution?.notStarted || 0, color: "#737373" },
                          ].filter(item => item.value > 0);

                          if (pieData.length === 0) {
                            return (
                              <div className="h-full flex items-center justify-center text-sm text-neutral-500">
                                No achievements recorded for Q{selectedAnalyticsQuarter}.
                              </div>
                            );
                          }

                          return (
                            <div className="grid grid-cols-5 h-full items-center">
                              <div className="col-span-3 h-full">
                                <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="value">
                                      {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                      ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => [`${value}%`, "Share"]} contentStyle={{ backgroundColor: "#171717", borderColor: "#262626", borderRadius: "10px", color: "#fff" }} />
                                  </PieChart>
                                </ResponsiveContainer>
                              </div>
                              <div className="col-span-2 space-y-4 pr-2">
                                {pieData.map((item) => (
                                  <div key={item.name} className="flex flex-col space-y-0.5">
                                    <div className="flex items-center gap-2 text-xs font-semibold">
                                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                                      <span className="text-neutral-400">{item.name}</span>
                                    </div>
                                    <span className="text-lg font-black pl-4.5 text-neutral-900 dark:text-neutral-100">{item.value}%</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Department Progress Comparison Chart */}
                  <div className="grid gap-6 md:grid-cols-5">
                    <Card className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 md:col-span-3">
                      <CardHeader>
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                          <Building className="h-5 w-5 text-blue-500" />
                          Department Performance Index (Q{selectedAnalyticsQuarter})
                        </CardTitle>
                        <CardDescription>Comparison of average weighted progress across manager departments.</CardDescription>
                      </CardHeader>
                      <CardContent className="h-80">
                        {mounted && (() => {
                          const barData = analyticsData?.departmentPerformance || [];
                          if (barData.length === 0) {
                            return (
                              <div className="h-full flex items-center justify-center text-sm text-neutral-500">
                                No department records.
                              </div>
                            );
                          }
                          return (
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={barData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#262626" opacity={0.3} />
                                <XAxis type="number" domain={[0, 100]} stroke="#737373" fontSize={11} fontWeight={600} />
                                <YAxis dataKey="managerName" type="category" stroke="#737373" fontSize={10} width={100} tickFormatter={(t) => t.split(" ")[0]} />
                                <Tooltip formatter={(value) => [`${value}%`, "Avg Progress"]} contentStyle={{ backgroundColor: "#171717", borderColor: "#262626", borderRadius: "10px", color: "#fff" }} cursor={false} />
                                <Bar dataKey="averageProgress" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={16}>
                                  {barData.map((entry: any, index: number) => {
                                    const color = entry.averageProgress >= 75 ? "#10b981" : "#3b82f6";
                                    return <Cell key={`cell-${index}`} fill={color} />;
                                  })}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          );
                        })()}
                      </CardContent>
                    </Card>

                    {/* Strategic Thrust Areas Card */}
                    <Card className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 md:col-span-2">
                      <CardHeader>
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                          <Award className="h-5 w-5 text-indigo-500" />
                          Strategic Thrust Areas (Q{selectedAnalyticsQuarter})
                        </CardTitle>
                        <CardDescription>Aggregate performance indexes grouped by organizational thrust areas.</CardDescription>
                      </CardHeader>
                      <CardContent className="h-80 overflow-y-auto space-y-2.5 pr-2 scrollbar-thin scrollbar-thumb-neutral-200 dark:scrollbar-thumb-zinc-850 scrollbar-track-transparent scroll-smooth">
                        {(() => {
                          const thrustAreas: Record<string, { total: number; count: number }> = {};
                          const depts = analyticsData?.departmentPerformance || [];
                          depts.forEach((d: any) => {
                            d.thrustAreaPerformance?.forEach((ta: any) => {
                              if (!thrustAreas[ta.thrustArea]) {
                                thrustAreas[ta.thrustArea] = { total: 0, count: 0 };
                              }
                              thrustAreas[ta.thrustArea].total += ta.averageProgress;
                              thrustAreas[ta.thrustArea].count++;
                            });
                          });

                          const taList = Object.entries(thrustAreas).map(([name, data]) => ({
                            name,
                            average: Math.round((data.total / data.count) * 100) / 100,
                          })).sort((a, b) => b.average - a.average);

                          if (taList.length === 0) {
                            return (
                              <div className="h-full flex items-center justify-center text-sm text-neutral-500 py-12">
                                No thrust areas identified in this cycle.
                              </div>
                            );
                          }

                          return taList.map((ta) => {
                            let trackColor = "bg-blue-500";
                            if (ta.average >= 75) trackColor = "bg-emerald-500";
                            else if (ta.average < 50) trackColor = "bg-rose-500";

                            return (
                              <div key={ta.name} className="space-y-1.5 bg-neutral-50 dark:bg-neutral-900/30 border border-neutral-100 dark:border-neutral-900/50 p-2.5 rounded-xl hover:border-neutral-200 dark:hover:border-zinc-800 transition-all duration-200">
                                <div className="flex justify-between items-center text-xs font-bold">
                                  <span className="text-neutral-400 capitalize">{ta.name}</span>
                                  <span className="text-neutral-900 dark:text-neutral-100 font-extrabold">{ta.average}%</span>
                                </div>
                                <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-900 rounded-full overflow-hidden">
                                  <div className={`h-full ${trackColor} rounded-full`} style={{ width: `${ta.average}%` }} />
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Compliance & Activity Grid Heatmap */}
                  <div className="grid gap-6 md:grid-cols-3">
                    {/* Team Check-in Grid Heatmap */}
                    <Card className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 md:col-span-1">
                      <CardHeader>
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                          <Grid className="h-5 w-5 text-teal-500" />
                          Check-In Activity Heatmap
                        </CardTitle>
                        <CardDescription>Individual check-in status grid per department for Q{selectedAnalyticsQuarter}.</CardDescription>
                      </CardHeader>
                      <CardContent className="h-80 overflow-y-auto space-y-4">
                        {(() => {
                          const managersList = analyticsData?.managerEffectiveness || [];
                          if (managersList.length === 0) {
                            return (
                              <div className="h-full flex items-center justify-center text-sm text-neutral-500">
                                No active check-in data.
                              </div>
                            );
                          }
                          return managersList.map((mgr: any) => {
                            const reviewed = mgr.checkIns.reviewed;
                            const pending = mgr.checkIns.pending;
                            const unsubmitted = mgr.subordinateCount - mgr.checkIns.submitted;

                            return (
                              <div key={mgr.managerId} className="space-y-1.5 border-b border-neutral-100 dark:border-neutral-900 pb-3 last:border-none last:pb-0">
                                <div className="flex justify-between items-center text-xs">
                                  <span className="font-bold text-neutral-900 dark:text-neutral-200">{mgr.managerName.split(" ")[0]}'s Team</span>
                                  <span className="text-[10px] text-neutral-500 font-medium">Compliance: {mgr.checkIns.reviewRate}%</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {Array.from({ length: reviewed }).map((_, i) => (
                                    <div key={`rev-${i}`} className="h-5 w-5 rounded bg-emerald-500 hover:bg-emerald-400 transition-colors" title="Reviewed" />
                                  ))}
                                  {Array.from({ length: pending }).map((_, i) => (
                                    <div key={`pend-${i}`} className="h-5 w-5 rounded bg-amber-500 hover:bg-amber-400 transition-colors animate-pulse" title="Submitted, Pending Review" />
                                  ))}
                                  {Array.from({ length: Math.max(0, unsubmitted) }).map((_, i) => (
                                    <div key={`unsub-${i}`} className="h-5 w-5 rounded bg-neutral-200 dark:bg-neutral-850 hover:bg-neutral-300 dark:hover:bg-neutral-800 transition-colors" title="Not Started" />
                                  ))}
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </CardContent>
                      <CardFooter className="flex flex-wrap items-center gap-3 pt-2 text-[10px] text-neutral-505 border-t border-neutral-100 dark:border-neutral-900 mt-2 px-6 pb-4">
                        <div className="flex items-center gap-1.5">
                          <div className="h-2.5 w-2.5 rounded bg-emerald-500" />
                          <span>Reviewed</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="h-2.5 w-2.5 rounded bg-amber-500 animate-pulse" />
                          <span>Pending Review</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="h-2.5 w-2.5 rounded bg-neutral-200 dark:bg-neutral-850" />
                          <span>Not Started</span>
                        </div>
                      </CardFooter>
                    </Card>

                    {/* Sortable Manager Leadership Leaderboard */}
                    <Card className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 md:col-span-2">
                      <CardHeader>
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                          <Award className="h-5 w-5 text-yellow-500" />
                          Manager Effectiveness Leaderboard
                        </CardTitle>
                        <CardDescription>Performance tracking and leadership speed for all managers in Q{selectedAnalyticsQuarter}.</CardDescription>
                      </CardHeader>
                      <CardContent className="h-80 overflow-y-auto pr-1">
                        <TableWrapper>
                          <Table>
                            <TableHeader>
                              <TableRow className="border-neutral-200 dark:border-neutral-800">
                                <TableHead className="text-xs font-bold text-neutral-400">Manager</TableHead>
                                <TableHead className="text-xs font-bold text-neutral-400 text-center">Team Size</TableHead>
                                <TableHead className="text-xs font-bold text-neutral-400 text-center">Appr. Rate</TableHead>
                                <TableHead className="text-xs font-bold text-neutral-400 text-center">Review Comp.</TableHead>
                                <TableHead className="text-xs font-bold text-neutral-400 text-right">Avg Progress</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {(analyticsData?.managerEffectiveness || []).map((mgr: any) => (
                                <TableRow key={mgr.managerId} className="border-neutral-100 dark:border-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-900/30">
                                  <TableCell className="font-bold text-sm text-neutral-900 dark:text-neutral-100">{mgr.managerName}</TableCell>
                                  <TableCell className="text-center font-semibold text-neutral-500">{mgr.subordinateCount}</TableCell>
                                  <TableCell className="text-center font-bold text-neutral-900 dark:text-neutral-100">{mgr.goalSheets.approvalRate}%</TableCell>
                                  <TableCell className="text-center">
                                    <Badge className={mgr.checkIns.reviewRate === 100 ? "bg-emerald-500/10 text-emerald-500 border-none" : "bg-amber-500/10 text-amber-500 border-none"}>
                                      {mgr.checkIns.reviewRate}%
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right font-black text-emerald-500">{mgr.averageTeamProgress}%</TableCell>
                                </TableRow>
                              ))}
                              {(!analyticsData?.managerEffectiveness || analyticsData.managerEffectiveness.length === 0) && (
                                <TableRow>
                                  <TableCell colSpan={5} className="text-center text-sm text-neutral-500 py-12">
                                    No manager aggregates logged.
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </TableWrapper>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* Tab 1b: Completion Dashboard */}
        <TabsContent value="completion" className="space-y-8">
          {/* Internal Metrics Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <DashboardCard
              title="Pending Check-ins"
              value={loadingStats ? "..." : stats?.pendingCheckIns?.length || 0}
              description="Awaiting manager comments"
              icon={Clock}
              className="bg-amber-500/5 dark:bg-amber-500/5 ring-1 ring-amber-500/10"
            />
            <DashboardCard
              title="Completed Check-ins"
              value={loadingStats ? "..." : stats?.completedCheckIns?.length || 0}
              description="Reviewed by managers"
              icon={ClipboardCheck}
              className="bg-emerald-500/5 dark:bg-emerald-500/5 ring-1 ring-emerald-500/10"
            />
            <DashboardCard
              title="Approval Backlog"
              value={loadingStats ? "..." : stats?.approvalBacklog?.length || 0}
              description="Goal sheets awaiting approval"
              icon={AlertTriangle}
              className="bg-blue-500/5 dark:bg-blue-500/5 ring-1 ring-blue-500/10"
            />
            <DashboardCard
              title="Overall Completion"
              value={loadingStats ? "..." : `${stats?.goalSheets?.approvalRate || 0}%`}
              description="Total approved goal sheets"
              icon={ShieldCheck}
              className="bg-neutral-500/5 dark:bg-neutral-500/5 ring-1 ring-neutral-500/10"
            />
          </div>

          {/* Broadcast System Reminders */}
          <Card className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Bell className="h-5 w-5 text-amber-500 animate-bounce" />
                  Broadcast System Reminders
                </CardTitle>
                <CardDescription>
                  Send targeted in-app alert notifications to team members who have outstanding tasks for cycle {selectedCycle}.
                </CardDescription>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label htmlFor="reminder-quarter" className="text-xs font-bold text-neutral-400 uppercase shrink-0">
                    Quarter:
                  </Label>
                  <Select value={selectedReminderQuarter} onValueChange={(val) => {
                    setSelectedReminderQuarter(val || "1");
                    fetchAllReminderEstimates(parseInt(val || "1", 10));
                  }}>
                    <SelectTrigger id="reminder-quarter" className="w-[110px] bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
                      <SelectValue placeholder="Quarter 1" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Quarter 1</SelectItem>
                      <SelectItem value="2">Quarter 2</SelectItem>
                      <SelectItem value="3">Quarter 3</SelectItem>
                      <SelectItem value="4">Quarter 4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => fetchAllReminderEstimates(parseInt(selectedReminderQuarter, 10))}
                  className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                >
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  Recalculate
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {/* Goal Submissions */}
              <div className="p-4 rounded-xl border border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/30 dark:bg-neutral-900/10 flex flex-col justify-between space-y-4">
                <div className="space-y-1.5">
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-50 flex items-center gap-1.5">
                    <Target className="h-4 w-4 text-rose-500" />
                    Goal Submissions
                  </h4>
                  <p className="text-xs text-neutral-500 leading-normal">
                    Remind employees who have not yet submitted their goal sheets for {selectedCycle}.
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="text-[10px] uppercase font-bold text-neutral-400">
                    Target:{" "}
                    <span className="text-neutral-900 dark:text-neutral-100 font-extrabold">
                      {remindersLoading["GOAL_SHEET"] ? "Calculating..." : `${reminderEstimates["GOAL_SHEET"] ?? 0} Employees`}
                    </span>
                  </div>
                  <Button 
                    size="sm" 
                    className="w-full text-xs font-semibold bg-neutral-900 dark:bg-neutral-50 text-white dark:text-neutral-950"
                    disabled={reminderEstimates["GOAL_SHEET"] === 0 || remindersLoading["GOAL_SHEET"]}
                    onClick={() => setConfirmBroadcastType("GOAL_SHEET")}
                  >
                    Send Reminders
                  </Button>
                </div>
              </div>

              {/* Goal Approvals */}
              <div className="p-4 rounded-xl border border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/30 dark:bg-neutral-900/10 flex flex-col justify-between space-y-4">
                <div className="space-y-1.5">
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-50 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-blue-500" />
                    Goal Approvals
                  </h4>
                  <p className="text-xs text-neutral-500 leading-normal">
                    Remind managers who have pending employee goal sheets awaiting approval.
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="text-[10px] uppercase font-bold text-neutral-400">
                    Target:{" "}
                    <span className="text-neutral-900 dark:text-neutral-100 font-extrabold">
                      {remindersLoading["GOAL_APPROVAL"] ? "Calculating..." : `${reminderEstimates["GOAL_APPROVAL"] ?? 0} Approvals`}
                    </span>
                  </div>
                  <Button 
                    size="sm" 
                    className="w-full text-xs font-semibold bg-neutral-900 dark:bg-neutral-50 text-white dark:text-neutral-950"
                    disabled={reminderEstimates["GOAL_APPROVAL"] === 0 || remindersLoading["GOAL_APPROVAL"]}
                    onClick={() => setConfirmBroadcastType("GOAL_APPROVAL")}
                  >
                    Send Reminders
                  </Button>
                </div>
              </div>

              {/* Check-In Submissions */}
              <div className="p-4 rounded-xl border border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/30 dark:bg-neutral-900/10 flex flex-col justify-between space-y-4">
                <div className="space-y-1.5">
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-50 flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-amber-500" />
                    Q{selectedReminderQuarter} Check-Ins
                  </h4>
                  <p className="text-xs text-neutral-500 leading-normal">
                    Remind employees with approved sheets who haven't finished Q{selectedReminderQuarter} check-ins.
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="text-[10px] uppercase font-bold text-neutral-400">
                    Target:{" "}
                    <span className="text-neutral-900 dark:text-neutral-100 font-extrabold">
                      {remindersLoading["CHECK_IN"] ? "Calculating..." : `${reminderEstimates["CHECK_IN"] ?? 0} Employees`}
                    </span>
                  </div>
                  <Button 
                    size="sm" 
                    className="w-full text-xs font-semibold bg-neutral-900 dark:bg-neutral-50 text-white dark:text-neutral-950"
                    disabled={reminderEstimates["CHECK_IN"] === 0 || remindersLoading["CHECK_IN"]}
                    onClick={() => setConfirmBroadcastType("CHECK_IN")}
                  >
                    Send Reminders
                  </Button>
                </div>
              </div>

              {/* Check-In Reviews */}
              <div className="p-4 rounded-xl border border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/30 dark:bg-neutral-900/10 flex flex-col justify-between space-y-4">
                <div className="space-y-1.5">
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-50 flex items-center gap-1.5">
                    <ClipboardCheck className="h-4 w-4 text-emerald-500" />
                    Q{selectedReminderQuarter} Reviews
                  </h4>
                  <p className="text-xs text-neutral-500 leading-normal">
                    Remind managers who have submitted employee Q{selectedReminderQuarter} check-ins awaiting review.
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="text-[10px] uppercase font-bold text-neutral-400">
                    Target:{" "}
                    <span className="text-neutral-900 dark:text-neutral-100 font-extrabold">
                      {remindersLoading["CHECKIN_REVIEW"] ? "Calculating..." : `${reminderEstimates["CHECKIN_REVIEW"] ?? 0} Reviews`}
                    </span>
                  </div>
                  <Button 
                    size="sm" 
                    className="w-full text-xs font-semibold bg-neutral-900 dark:bg-neutral-50 text-white dark:text-neutral-950"
                    disabled={reminderEstimates["CHECKIN_REVIEW"] === 0 || remindersLoading["CHECKIN_REVIEW"]}
                    onClick={() => setConfirmBroadcastType("CHECKIN_REVIEW")}
                  >
                    Send Reminders
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Department Completion Rates */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 h-full">
                <CardHeader>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-emerald-500" />
                    Department Rates
                  </CardTitle>
                  <CardDescription>
                    Approved goal sheet progress grouped by department team manager.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loadingStats ? (
                    <div className="text-center py-8 text-neutral-500 text-sm">Loading department data...</div>
                  ) : !stats?.departmentCompletion || stats.departmentCompletion.length === 0 ? (
                    <div className="text-center py-8 text-neutral-500 text-sm">No department data.</div>
                  ) : (
                    <div className="space-y-5">
                      {stats.departmentCompletion.map((dept: any) => (
                        <div key={dept.managerId || "independent"} className="space-y-2">
                          <div className="flex justify-between text-xs font-semibold">
                            <div className="flex flex-col">
                              <span className="text-neutral-900 dark:text-neutral-100 font-bold">{dept.managerName}</span>
                              <span className="text-[10px] text-neutral-400 font-normal">{dept.managerEmail || "No team lead"}</span>
                            </div>
                            <span className="text-neutral-950 dark:text-neutral-50 font-bold text-right">
                              {dept.approvedSheets} / {dept.totalEmployees} ({dept.completionRate}%)
                            </span>
                          </div>
                          
                          <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-900 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${
                                dept.completionRate >= 100 
                                  ? "bg-emerald-500" 
                                  : dept.completionRate >= 50 
                                  ? "bg-amber-500" 
                                  : "bg-rose-500"
                              }`} 
                              style={{ width: `${dept.completionRate}%` }} 
                            />
                          </div>

                          <div className="flex items-center gap-3 text-[10px] text-neutral-400">
                            <span className="flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              {dept.approvedSheets} Approved
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                              {dept.pendingApproval} Pending
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" />
                              {dept.draftOrRework} Drafts
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Backlog Tables */}
            <div className="lg:col-span-2 space-y-6">
              {/* Approval Backlog */}
              <TableWrapper 
                title="Goal Sheet Approval Backlog" 
                description="Goal sheets submitted by contributors that require review and approval from their supervisor."
              >
                <Table>
                  <TableHeader>
                    <TableRow className="bg-neutral-50/50 dark:bg-neutral-900/50">
                      <TableHead className="font-semibold text-neutral-900 dark:text-neutral-100">Employee</TableHead>
                      <TableHead className="font-semibold text-neutral-900 dark:text-neutral-100">Reporting Supervisor</TableHead>
                      <TableHead className="font-semibold text-neutral-900 dark:text-neutral-100">Status</TableHead>
                      <TableHead className="font-semibold text-neutral-900 dark:text-neutral-100 text-right">Last Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingStats ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-neutral-500 text-sm">
                          Loading approval backlog...
                        </TableCell>
                      </TableRow>
                    ) : !stats?.approvalBacklog || stats.approvalBacklog.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-neutral-500 text-sm">
                          ✨ Clean desk! No goal sheets in approval backlog.
                        </TableCell>
                      </TableRow>
                    ) : (
                      stats.approvalBacklog.map((sheet: any) => (
                        <TableRow key={sheet.id} className="hover:bg-neutral-50/30 dark:hover:bg-neutral-900/30">
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-semibold text-neutral-900 dark:text-neutral-100">{sheet.user?.name}</span>
                              <span className="text-xs text-neutral-500">{sheet.user?.email}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {sheet.user?.manager ? (
                              <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                                {sheet.user.manager.name}
                              </span>
                            ) : (
                              <span className="text-xs text-neutral-400 italic">No supervisor assigned</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={sheet.status} />
                          </TableCell>
                          <TableCell className="text-right text-xs text-neutral-500">
                            {new Date(sheet.updatedAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableWrapper>

              {/* Pending Check-ins */}
              <TableWrapper 
                title="Pending Check-in Reviews" 
                description="Submitted quarterly progress updates awaiting manager feedback and comments."
              >
                <Table>
                  <TableHeader>
                    <TableRow className="bg-neutral-50/50 dark:bg-neutral-900/50">
                      <TableHead className="font-semibold text-neutral-900 dark:text-neutral-100">Employee</TableHead>
                      <TableHead className="font-semibold text-neutral-900 dark:text-neutral-100">Quarter</TableHead>
                      <TableHead className="font-semibold text-neutral-900 dark:text-neutral-100">Manager</TableHead>
                      <TableHead className="font-semibold text-neutral-900 dark:text-neutral-100">Submitted Notes</TableHead>
                      <TableHead className="font-semibold text-neutral-900 dark:text-neutral-100 text-right">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingStats ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-neutral-500 text-sm">
                          Loading pending check-ins...
                        </TableCell>
                      </TableRow>
                    ) : !stats?.pendingCheckIns || stats.pendingCheckIns.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-neutral-500 text-sm">
                          ✨ All check-in reviews are fully up to date.
                        </TableCell>
                      </TableRow>
                    ) : (
                      stats.pendingCheckIns.map((c: any) => (
                        <TableRow key={c.id} className="hover:bg-neutral-50/30 dark:hover:bg-neutral-900/30">
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-semibold text-neutral-900 dark:text-neutral-100">{c.user?.name}</span>
                              <span className="text-xs text-neutral-500">{c.user?.email}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-amber-500/10 text-amber-500 border-none font-bold text-[10px]">
                              Q{c.quarter}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                              {c.user?.manager?.name || "Independent"}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-[150px] truncate text-xs text-neutral-600 dark:text-neutral-400">
                            {c.notes || <span className="italic text-neutral-400">No notes provided</span>}
                          </TableCell>
                          <TableCell className="text-right text-xs text-neutral-500">
                            {new Date(c.createdAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableWrapper>

              {/* Completed Check-ins */}
              <TableWrapper 
                title="Recently Completed Check-ins" 
                description="Quarterly check-in reviews successfully finalized by corporate managers."
              >
                <Table>
                  <TableHeader>
                    <TableRow className="bg-neutral-50/50 dark:bg-neutral-900/50">
                      <TableHead className="font-semibold text-neutral-900 dark:text-neutral-100">Employee</TableHead>
                      <TableHead className="font-semibold text-neutral-900 dark:text-neutral-100">Quarter</TableHead>
                      <TableHead className="font-semibold text-neutral-900 dark:text-neutral-100">Manager Comment</TableHead>
                      <TableHead className="font-semibold text-neutral-900 dark:text-neutral-100 text-right">Reviewed Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingStats ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-neutral-500 text-sm">
                          Loading completed check-ins...
                        </TableCell>
                      </TableRow>
                    ) : !stats?.completedCheckIns || stats.completedCheckIns.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-neutral-500 text-sm">
                          No reviewed check-ins found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      stats.completedCheckIns.map((c: any) => (
                        <TableRow key={c.id} className="hover:bg-neutral-50/30 dark:hover:bg-neutral-900/30">
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-semibold text-neutral-900 dark:text-neutral-100">{c.user?.name}</span>
                              <span className="text-xs text-neutral-500">{c.user?.email}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-emerald-500/10 text-emerald-500 border-none font-bold text-[10px]">
                              Q{c.quarter}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-xs text-neutral-700 dark:text-neutral-300 font-medium">
                            {c.managerComment}
                          </TableCell>
                          <TableCell className="text-right text-xs text-neutral-500">
                            {new Date(c.updatedAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableWrapper>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: User Management */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-end gap-4">
            <div className="flex items-center gap-2">
              <Label className="text-xs font-bold text-neutral-400 uppercase shrink-0">Role Filter:</Label>
              <Select value={roleFilter} onValueChange={(val) => handleRoleFilterChange(val || "ALL")}>
                <SelectTrigger className="w-[140px] bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Roles</SelectItem>
                  <SelectItem value="EMPLOYEE">Employees</SelectItem>
                  <SelectItem value="MANAGER">Managers</SelectItem>
                  <SelectItem value="ADMIN">Administrators</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <TableWrapper title="Active Corporate Roster" description="View and configure access roles and supervisor connections.">
            <Table>
              <TableHeader>
                <TableRow className="bg-neutral-50/50 dark:bg-neutral-900/50">
                  <TableHead className="font-semibold text-neutral-900 dark:text-neutral-100">User Details</TableHead>
                  <TableHead className="font-semibold text-neutral-900 dark:text-neutral-100">System Role</TableHead>
                  <TableHead className="font-semibold text-neutral-900 dark:text-neutral-100">Reports To (Manager)</TableHead>
                  <TableHead className="font-semibold text-neutral-900 dark:text-neutral-100">Goal Settings</TableHead>
                  <TableHead className="text-right font-semibold text-neutral-900 dark:text-neutral-100">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-neutral-500">
                      No users match your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => {
                    const sheet = user.goalSheets.find((gs: any) => gs.cycleId === selectedCycle);
                    return (
                      <TableRow key={user.id} className="hover:bg-neutral-50/30 dark:hover:bg-neutral-900/30">
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold text-neutral-900 dark:text-neutral-100">{user.name || "Unnamed User"}</span>
                            <span className="text-xs text-neutral-500">{user.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            user.role === "ADMIN" 
                              ? "bg-rose-500/10 text-rose-500 border-none font-bold text-[10px]"
                              : user.role === "MANAGER"
                              ? "bg-amber-500/10 text-amber-500 border-none font-bold text-[10px]"
                              : "bg-blue-500/10 text-blue-500 border-none font-bold text-[10px]"
                          }>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.manager ? (
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{user.manager.name}</span>
                              <span className="text-[10px] text-neutral-500">{user.manager.email}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-neutral-400 italic">No supervisor assigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {sheet ? (
                            <StatusBadge status={sheet.status} />
                          ) : (
                            <Badge className="bg-neutral-100 dark:bg-neutral-900 text-neutral-400 border-none text-[10px]">
                              NOT STARTED
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleOpenEditUser(user)}
                            className="text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white"
                          >
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-neutral-100 dark:border-neutral-900 mt-4 px-4 pb-4">
              <div className="text-xs font-semibold text-neutral-500">
                Showing <span className="text-neutral-900 dark:text-neutral-100 font-extrabold">{userTotalCount === 0 ? 0 : Math.min((userPage - 1) * userPageSize + 1, userTotalCount)}</span> to{" "}
                <span className="text-neutral-900 dark:text-neutral-100 font-extrabold">{Math.min(userPage * userPageSize, userTotalCount)}</span> of{" "}
                <span className="text-neutral-900 dark:text-neutral-100 font-extrabold">{userTotalCount}</span> entries
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                {/* Page Size Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-500 font-bold uppercase tracking-wider">Page Size:</span>
                  <Select value={userPageSize.toString()} onValueChange={(val) => {
                    setUserPageSize(Number(val));
                    setUserPage(1);
                  }}>
                    <SelectTrigger className="w-[70px] h-8 bg-white dark:bg-neutral-900 border-neutral-250 dark:border-neutral-800 text-xs">
                      <SelectValue placeholder="10" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* Buttons */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 bg-white dark:bg-neutral-900 border-neutral-250 dark:border-neutral-800 text-xs"
                    disabled={userPage <= 1}
                    onClick={() => setUserPage(1)}
                  >
                    {"<<"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 bg-white dark:bg-neutral-900 border-neutral-250 dark:border-neutral-800"
                    disabled={userPage <= 1}
                    onClick={() => setUserPage(userPage - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="text-xs font-black px-3 py-1 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-850 rounded-lg text-neutral-900 dark:text-neutral-100">
                    Page {userPage} of {userTotalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 bg-white dark:bg-neutral-900 border-neutral-250 dark:border-neutral-800"
                    disabled={userPage >= userTotalPages}
                    onClick={() => setUserPage(userPage + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 bg-white dark:bg-neutral-900 border-neutral-250 dark:border-neutral-800 text-xs"
                    disabled={userPage >= userTotalPages}
                    onClick={() => setUserPage(userTotalPages)}
                  >
                    {">>"}
                  </Button>
                </div>
              </div>
            </div>
          </TableWrapper>
        </TabsContent>

        {/* Tab 3: Goal Sheet Lock & Override */}
        <TabsContent value="goals" className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <Input
                placeholder="Search goal sheets by user..."
                value={sheetSearch}
                onChange={(e) => setSheetSearch(e.target.value)}
                className="pl-10 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Label className="text-xs font-bold text-neutral-400 uppercase shrink-0">Status:</Label>
              <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "ALL")}>
                <SelectTrigger className="w-[160px] bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="SUBMITTED">Submitted</SelectItem>
                  <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                  <SelectItem value="APPROVED">Approved (Locked)</SelectItem>
                  <SelectItem value="REWORK_REQUIRED">Rework Required</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <TableWrapper title="Employee Goal Sheets Overview" description={`Override submission states and unlock locked goals for cycle ${selectedCycle}.`}>
            <Table>
              <TableHeader>
                <TableRow className="bg-neutral-50/50 dark:bg-neutral-900/50">
                  <TableHead className="font-semibold text-neutral-900 dark:text-neutral-100">Employee</TableHead>
                  <TableHead className="font-semibold text-neutral-900 dark:text-neutral-100">Cycle</TableHead>
                  <TableHead className="font-semibold text-neutral-900 dark:text-neutral-100">Goal Status</TableHead>
                  <TableHead className="font-semibold text-neutral-900 dark:text-neutral-100">Last Synced</TableHead>
                  <TableHead className="text-right font-semibold text-neutral-900 dark:text-neutral-100">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSheets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-neutral-500">
                      No goal sheets found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSheets.map((sheet) => {
                    const isLocked = sheet.status !== "DRAFT" && sheet.status !== "REWORK_REQUIRED";
                    return (
                      <TableRow key={sheet.id} className="hover:bg-neutral-50/30 dark:hover:bg-neutral-900/30">
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold text-neutral-900 dark:text-neutral-100">{sheet.userName || "Unnamed User"}</span>
                            <span className="text-xs text-neutral-500">{sheet.userEmail}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-neutral-250 dark:border-neutral-800 text-[10px] font-bold">
                            {sheet.cycleId}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={sheet.status} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-xs text-neutral-500">
                            <Clock className="mr-1 h-3 w-3" />
                            {formatDistanceToNow(new Date(sheet.updatedAt), { addSuffix: true })}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {isLocked ? (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setUnlockSheet(sheet)}
                              className="text-amber-600 hover:text-amber-700 bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/20 dark:border-amber-500/10"
                            >
                              <Unlock className="mr-1 h-3.5 w-3.5" />
                              Force Unlock
                            </Button>
                          ) : (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              disabled 
                              className="text-neutral-400 opacity-60 text-xs"
                            >
                              <Lock className="mr-1 h-3.5 w-3.5" />
                              Editable
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableWrapper>
        </TabsContent>

        {/* Tab 4: System Audit Logs */}
        <TabsContent value="logs" className="space-y-4">
          <TableWrapper title="Audit Trails & Governance Logs" description="Chronological record of critical operations in the performance portal.">
            <Table>
              <TableHeader>
                <TableRow className="bg-neutral-50/50 dark:bg-neutral-900/50">
                  <TableHead className="w-10" />
                  <TableHead className="font-semibold text-neutral-900 dark:text-neutral-100">User</TableHead>
                  <TableHead className="font-semibold text-neutral-900 dark:text-neutral-100">Operation</TableHead>
                  <TableHead className="font-semibold text-neutral-900 dark:text-neutral-100">Affected Entity</TableHead>
                  <TableHead className="font-semibold text-neutral-900 dark:text-neutral-100">Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingLogs ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-neutral-500">
                      Loading audit trails...
                    </TableCell>
                  </TableRow>
                ) : auditLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-neutral-500">
                      No audit logs captured yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  auditLogs.map((log) => {
                    const isExpanded = expandedLogId === log.id;
                    return (
                      <Fragment key={log.id}>
                        <TableRow className="hover:bg-neutral-50/30 dark:hover:bg-neutral-900/30">
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                              className="h-8 w-8 p-0"
                            >
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-semibold text-sm text-neutral-800 dark:text-neutral-200">
                                {log.user?.name || "System"}
                              </span>
                              <span className="text-[10px] text-neutral-500">
                                {log.user?.email || "internal_cron"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 font-bold border-none text-[10px]">
                              {log.action}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-xs">
                              <FileText className="h-3.5 w-3.5 text-neutral-400" />
                              <span className="font-medium text-neutral-600 dark:text-neutral-400">
                                {log.entityType} ({log.entityId.slice(0, 8)}...)
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-neutral-500">
                            {new Date(log.timestamp).toLocaleString()}
                          </TableCell>
                        </TableRow>
                        
                        {isExpanded && (
                          <TableRow className="bg-neutral-50/20 dark:bg-neutral-900/20">
                            <TableCell colSpan={5}>
                              <div className="p-4 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50 space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-xs">
                                  <div className="space-y-1">
                                    <div className="font-bold text-neutral-400 uppercase tracking-tighter text-[10px]">Original State (Old Value)</div>
                                    <pre className="p-3 bg-neutral-100 dark:bg-neutral-900 rounded-lg max-h-[160px] overflow-auto border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300">
                                      {log.oldValue ? JSON.stringify(log.oldValue, null, 2) : "NULL"}
                                    </pre>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="font-bold text-neutral-400 uppercase tracking-tighter text-[10px]">Updated State (New Value)</div>
                                    <pre className="p-3 bg-neutral-100 dark:bg-neutral-900 rounded-lg max-h-[160px] overflow-auto border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300">
                                      {log.newValue ? JSON.stringify(log.newValue, null, 2) : "NULL"}
                                    </pre>
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableWrapper>
        </TabsContent>

        {/* Tab 5: Achievement Reports */}
        <TabsContent value="reports" className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1 max-w-2xl">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input
                  placeholder="Filter by employee, goal, or thrust area..."
                  value={reportSearch}
                  onChange={(e) => setReportSearch(e.target.value)}
                  className="pl-10 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
                />
              </div>

              {/* Quarter Selector */}
              <div className="flex items-center gap-2">
                <Label htmlFor="report-quarter" className="text-xs font-bold text-neutral-400 uppercase shrink-0">
                  Quarter:
                </Label>
                <Select value={selectedReportQuarter} onValueChange={(val) => setSelectedReportQuarter(val || "1")}>
                  <SelectTrigger id="report-quarter" className="w-[140px] bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
                    <SelectValue placeholder="Quarter 1" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Quarter 1</SelectItem>
                    <SelectItem value="2">Quarter 2</SelectItem>
                    <SelectItem value="3">Quarter 3</SelectItem>
                    <SelectItem value="4">Quarter 4</SelectItem>
                    <SelectItem value="all">All Quarters</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Export Buttons */}
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={() => exportToCSV("csv")}
                disabled={loadingReport || reportData.length === 0}
                className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              >
                <FileText className="mr-2 h-4 w-4 text-neutral-500" />
                Export CSV
              </Button>
              <Button 
                variant="outline" 
                onClick={() => exportToCSV("excel")}
                disabled={loadingReport || reportData.length === 0}
                className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-xs font-bold text-emerald-600 dark:text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400"
              >
                <FileText className="mr-2 h-4 w-4" />
                Export Excel
              </Button>
            </div>
          </div>

          <TableWrapper 
            title={selectedReportQuarter === "all" ? "All Quarters Goal Achievement Report" : `Q${selectedReportQuarter} Goal Achievement Report`} 
            description={selectedReportQuarter === "all" ? `Detailed list of all employee goals, targets, quarterly achievements, and progress scores across all quarters for cycle ${selectedCycle}.` : `Detailed list of all employee goals, targets, quarterly achievements, and progress scores for cycle ${selectedCycle}.`}
          >
            <Table>
              <TableHeader>
                <TableRow className="bg-neutral-50/50 dark:bg-neutral-900/50">
                  <TableHead className="font-semibold text-neutral-900 dark:text-neutral-100">Employee</TableHead>
                  {selectedReportQuarter === "all" && (
                    <TableHead className="font-semibold text-neutral-900 dark:text-neutral-100 text-center">Quarter</TableHead>
                  )}
                  <TableHead className="font-semibold text-neutral-900 dark:text-neutral-100">Goal Description</TableHead>
                  <TableHead className="font-semibold text-neutral-900 dark:text-neutral-100 text-center">Target vs Achievement</TableHead>
                  <TableHead className="font-semibold text-neutral-900 dark:text-neutral-100 text-center">Weight</TableHead>
                  <TableHead className="font-semibold text-neutral-900 dark:text-neutral-100">Progress (Clamped / Raw)</TableHead>
                  <TableHead className="font-semibold text-neutral-900 dark:text-neutral-100">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingReport ? (
                  <TableRow>
                    <TableCell colSpan={selectedReportQuarter === "all" ? 7 : 6} className="h-32 text-center text-neutral-500">
                      Compiling achievement report data...
                    </TableCell>
                  </TableRow>
                ) : filteredReport.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={selectedReportQuarter === "all" ? 7 : 6} className="h-32 text-center text-neutral-500">
                      {selectedReportQuarter === "all" 
                        ? `No achievements recorded for any quarter in cycle ${selectedCycle}.` 
                        : `No achievements recorded for Q${selectedReportQuarter} in cycle ${selectedCycle}.`}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReport.map((row) => {
                    const isOverachieved = row.progressRaw > row.progressClamped;
                    return (
                      <TableRow key={row.id} className="hover:bg-neutral-50/30 dark:hover:bg-neutral-900/30">
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold text-neutral-900 dark:text-neutral-100">{row.employeeName}</span>
                            <span className="text-xs text-neutral-500">{row.employeeEmail}</span>
                          </div>
                        </TableCell>
                        {selectedReportQuarter === "all" && (
                          <TableCell className="text-center">
                            <Badge className="bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-none font-bold text-[10px]">
                              Q{row.quarter}
                            </Badge>
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex flex-col gap-1 max-w-sm">
                            <span className="font-semibold text-neutral-900 dark:text-neutral-100 leading-snug">{row.title}</span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge className="bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border-none font-bold text-[9px] uppercase tracking-wider">
                                {row.thrustArea}
                              </Badge>
                              <span className="text-[10px] text-neutral-400 uppercase tracking-tighter">
                                {row.uomType.replace(/_/g, " ")}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          <div className="flex flex-col items-center">
                            <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                              {row.achievementValue} <span className="text-xs text-neutral-400 font-normal">/ {row.target}</span>
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-bold text-xs text-neutral-600 dark:text-neutral-400">
                          {row.weightage}%
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1.5 min-w-[150px]">
                            <div className="flex justify-between text-[10px] font-semibold text-neutral-400">
                              <span>Progress</span>
                              <span>{row.progressClamped}%</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-900 overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-300 ${
                                  row.progressClamped >= 100 
                                    ? "bg-emerald-500" 
                                    : row.progressClamped >= 50 
                                    ? "bg-amber-500" 
                                    : "bg-rose-500"
                                }`} 
                                style={{ width: `${row.progressClamped}%` }} 
                              />
                            </div>
                            {isOverachieved && (
                              <p className="text-[9px] font-bold text-emerald-500 flex items-center gap-0.5">
                                ✨ Overachieved: {row.progressRaw}%
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1.5 items-start">
                            <StatusBadge status={row.goalSheetStatus} />
                            <Badge className={
                              row.achievementStatus === "Completed"
                                ? "bg-emerald-500/10 text-emerald-500 border-none font-bold text-[9px]"
                                : row.achievementStatus === "On Track"
                                ? "bg-blue-500/10 text-blue-500 border-none font-bold text-[9px]"
                                : "bg-neutral-100 dark:bg-neutral-900 text-neutral-400 border-none font-bold text-[9px]"
                            }>
                              {row.achievementStatus.toUpperCase()}
                            </Badge>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableWrapper>
        </TabsContent>

        {/* Tab 8: Profile Settings */}
        <TabsContent value="profile" className="space-y-6">
          {/* Profile Inputs */}
          <Card className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Account Profile Settings</CardTitle>
              <CardDescription className="text-xs text-neutral-500">Update your administrative profile details and security password.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="prof-name" className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Full Name</Label>
                    <Input id="prof-name" value={profileName} onChange={(e) => setProfileName(e.target.value)} className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-zinc-100" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prof-email" className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Email Address</Label>
                    <Input id="prof-email" defaultValue={adminEmail || "admin@atomquest.gov"} disabled className="bg-neutral-100 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-500 cursor-not-allowed" />
                  </div>
                </div>
                
                <div className="h-px bg-neutral-100 dark:bg-neutral-850/50 my-6" />
                
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Change Account Password</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="prof-curr" className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Current Password</Label>
                      <Input id="prof-curr" type="password" placeholder="••••••••" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="prof-new" className="text-xs font-bold text-neutral-400 uppercase tracking-wider">New Password</Label>
                      <Input id="prof-new" type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="prof-conf" className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Confirm New Password</Label>
                      <Input id="prof-conf" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800" />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={changingPassword} className="bg-neutral-800 hover:bg-neutral-700 text-white dark:bg-neutral-200 dark:hover:bg-neutral-100 dark:text-neutral-950 font-bold px-6 h-10 text-xs shadow-md">
                    {changingPassword ? "Saving Changes..." : "Save Account Changes"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* User Editing Modal */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold tracking-tight">
              <ShieldCheck className="h-5 w-5 text-neutral-500" />
              Configure User Account
            </DialogTitle>
            <DialogDescription>
              Modify reporting hierarchy and role assignment for {editUser?.name}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-role" className="text-xs font-bold text-neutral-400 uppercase tracking-tight">System Access Role</Label>
              <Select value={editRole} onValueChange={(val) => setEditRole(val || "EMPLOYEE")}>
                <SelectTrigger id="edit-role" className="w-full bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
                  <SelectValue placeholder="EMPLOYEE" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMPLOYEE">Employee (Contributor)</SelectItem>
                  <SelectItem value="MANAGER">Manager (Supervisor)</SelectItem>
                  <SelectItem value="ADMIN">System Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-manager" className="text-xs font-bold text-neutral-400 uppercase tracking-tight">Reporting Supervisor</Label>
              <Select value={editManagerId} onValueChange={(val) => setEditManagerId(val || "none")}>
                <SelectTrigger id="edit-manager" className="w-full bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
                  <SelectValue placeholder="Select Supervisor..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Independent (No Supervisor)</SelectItem>
                  {managers
                    .filter((m) => m.id !== editUser?.id) // Prevent reporting to self
                    .map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name || "Unnamed Manager"} ({m.role.toLowerCase()})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)} disabled={savingUser}>
              Cancel
            </Button>
            <Button onClick={handleSaveUser} disabled={savingUser}>
              {savingUser ? "Saving changes..." : "Save Configuration"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Goal Unlock Override Modal */}
      <Dialog open={!!unlockSheet} onOpenChange={() => setUnlockSheet(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold tracking-tight text-amber-500">
              <AlertTriangle className="h-5 w-5" />
              Force Unlock Goal Sheet
            </DialogTitle>
            <DialogDescription>
              Unlocking "{unlockSheet?.userName || 'this sheet'}"'s sheet will transition it from LOCKED to an editable draft. This action requires an audit reason.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-2">
            <Label htmlFor="unlock-reason" className="text-xs font-bold text-neutral-400 uppercase tracking-tight">Unlock Reason / Override Justification</Label>
            <Input
              id="unlock-reason"
              placeholder="E.g. Department structural weightage adjustment..."
              value={unlockReason}
              onChange={(e) => setUnlockReason(e.target.value)}
              className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUnlockSheet(null)} disabled={unlocking}>
              Cancel
            </Button>
            <Button 
              onClick={handleUnlockSheet} 
              disabled={unlocking || !unlockReason.trim()}
              className="bg-amber-500 hover:bg-amber-600 text-white border-none font-bold"
            >
              {unlocking ? "Processing Override..." : "Confirm Unlock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Broadcast Reminder Confirmation Modal */}
      <Dialog open={!!confirmBroadcastType} onOpenChange={() => setConfirmBroadcastType(null)}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold tracking-tight text-amber-505">
              <AlertTriangle className="h-5 w-5 text-amber-500 animate-pulse" />
              Confirm Reminder Broadcast
            </DialogTitle>
            <DialogDescription>
              You are about to broadcast system notifications. Please review the details below.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">Reminder Category</span>
              <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                {confirmBroadcastType === "GOAL_SHEET" && "Goal sheet submissions for active cycle"}
                {confirmBroadcastType === "GOAL_APPROVAL" && "Goal sheet approvals for active cycle"}
                {confirmBroadcastType === "CHECK_IN" && `Quarter ${selectedReminderQuarter} check-in submissions`}
                {confirmBroadcastType === "CHECKIN_REVIEW" && `Quarter ${selectedReminderQuarter} check-in manager reviews`}
              </span>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                Target Recipients ({confirmBroadcastType ? reminderEstimates[confirmBroadcastType] ?? 0 : 0})
              </span>
              <div className="max-h-[150px] overflow-y-auto p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-100 dark:border-neutral-800 text-xs font-medium space-y-1 divide-y divide-neutral-100 dark:divide-neutral-800">
                {confirmBroadcastType && reminderRecipients[confirmBroadcastType]?.length > 0 ? (
                  reminderRecipients[confirmBroadcastType].map((rec, idx) => (
                    <div key={idx} className="py-1 first:pt-0 last:pb-0 text-neutral-700 dark:text-neutral-300">
                      {rec}
                    </div>
                  ))
                ) : (
                  <span className="italic text-neutral-400">No recipients targeted.</span>
                )}
              </div>
            </div>

            <p className="text-xs text-neutral-500 leading-normal bg-neutral-100/50 dark:bg-neutral-900/50 p-3 rounded-lg border border-neutral-200 dark:border-neutral-800">
              ⚠️ In-app notifications will be delivered instantly to all matching recipients. This action will also be captured in the system governance audit trail.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmBroadcastType(null)} disabled={broadcasting}>
              Cancel
            </Button>
            <Button 
              onClick={handleSendBroadcast} 
              disabled={broadcasting || !confirmBroadcastType || (reminderEstimates[confirmBroadcastType] ?? 0) === 0}
              className="bg-amber-500 hover:bg-amber-600 text-white border-none font-bold animate-pulse"
            >
              {broadcasting ? "Sending Broadcast..." : "Send Broadcast"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
    </div>
  );
}
