"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Bell, 
  LogOut, 
  User as UserIcon, 
  Settings, 
  ClipboardCheck, 
  Zap, 
  ArrowRightLeft, 
  Users, 
  Target, 
  Activity, 
  Unlock, 
  History, 
  TrendingUp 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";

interface AdminNavbarProps {
  onTabChange?: (tab: string) => void;
  activeTab?: string;
  className?: string;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  link?: string | null;
  createdAt: string;
}

export function AdminNavbar({ onTabChange, activeTab, className }: AdminNavbarProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const user = session?.user;

  // Get initials from name
  const initials = user?.name
    ? user.name.split(" ").map(n => n[0]).join("").toUpperCase()
    : "??";

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  const lastFetchTimeRef = useRef<number>(0);
  const lastActiveTimeRef = useRef<number>(0);

  const fetchNotifications = async () => {
    try {
      const response = await fetch("/api/notifications");
      if (response.ok) {
        const result = await response.json();
        setNotifications(Array.isArray(result) ? result : result?.data ?? []);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  useEffect(() => {
    if (!session?.user) return;

    lastActiveTimeRef.current = Date.now();
    let intervalId: NodeJS.Timeout;
    const ACTIVE_INTERVAL = 30000; // 30 seconds
    const BACKOFF_INTERVAL = 300000; // 5 minutes
    const IDLE_THRESHOLD = 300000; // 5 minutes
    const COOLDOWN_THRESHOLD = 30000; // 30 seconds fetch cooldown

    const fetchWithCooldown = async (force = false) => {
      if (!force && Date.now() - lastFetchTimeRef.current < COOLDOWN_THRESHOLD) return;
      lastFetchTimeRef.current = Date.now();
      await fetchNotifications();
    };

    const poll = async () => {
      // 1. Skip if page is hidden
      if (document.hidden) return;

      // 2. Skip if user is idle
      const isIdle = Date.now() - lastActiveTimeRef.current > IDLE_THRESHOLD;
      if (isIdle) {
        // Slow down the interval when idle by clearing and setting backoff interval
        clearInterval(intervalId);
        intervalId = setInterval(poll, BACKOFF_INTERVAL);
        return;
      }

      await fetchWithCooldown();
    };

    // Initial fetch on mount - respects cooldown
    fetchWithCooldown(false);

    // Start active polling
    intervalId = setInterval(poll, ACTIVE_INTERVAL);

    // Track user activity to update last active timestamp
    const recordActivity = () => {
      const wasIdle = Date.now() - lastActiveTimeRef.current > IDLE_THRESHOLD;
      lastActiveTimeRef.current = Date.now();

      // If user was idle and is now active, speed up polling again instantly
      if (wasIdle) {
        clearInterval(intervalId);
        fetchWithCooldown(); // Fetch immediately on wake up if past cooldown
        intervalId = setInterval(poll, ACTIVE_INTERVAL);
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        lastActiveTimeRef.current = Date.now(); // reset activity
        fetchWithCooldown(); // Fetch immediately on wake up if past cooldown
      }
    };

    // Register event listeners
    window.addEventListener("mousemove", recordActivity);
    window.addEventListener("keydown", recordActivity);
    window.addEventListener("scroll", recordActivity);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("mousemove", recordActivity);
      window.removeEventListener("keydown", recordActivity);
      window.removeEventListener("scroll", recordActivity);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [session]);

  const handleNotificationClick = async (notif: NotificationItem) => {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: notif.id }),
      });

      setNotifications((prev) => prev.filter((n) => n.id !== notif.id));

      if (notif.link?.startsWith("/") && !notif.link.startsWith("//")) {
        router.push(notif.link);
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setLoadingNotifs(true);
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      setNotifications([]);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    } finally {
      setLoadingNotifs(false);
    }
  };

  return (
    <header className={cn("h-16 border-b border-zinc-800 bg-[#09090b]/90 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-40 text-white", className)}>
      {/* Brand & Left Section */}
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-3">
          {/* Mini Logo - Neutral theme */}
          <div className="relative size-7 flex items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 shadow-[0_0_8px_rgba(255,255,255,0.05)]">
            <Zap className="size-4 text-zinc-300 fill-zinc-300" />
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-0.5 leading-none">
              Governance
            </div>
            <h1 className="text-sm font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 via-zinc-200 to-zinc-400 tracking-tight leading-normal py-0.5">
              Admin Control Panel
            </h1>
          </div>
        </div>

        {/* Shadcn Navigation Menu in the Center-Left */}
        <NavigationMenu className="hidden lg:flex">
          <NavigationMenuList className="gap-1">
            {/* Quick Navigation / Dashboard Tabs */}
            <NavigationMenuItem>
              <NavigationMenuTrigger className="bg-transparent hover:bg-zinc-900 focus:bg-zinc-900 text-zinc-400 hover:text-zinc-100 rounded-lg h-9 text-xs px-3">
                Quick Access
              </NavigationMenuTrigger>
              <NavigationMenuContent className="p-3 w-[400px] bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl">
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => onTabChange?.("overview")}
                    className={cn(
                      "flex items-start gap-2.5 p-2 rounded-lg text-left transition-all hover:bg-zinc-900 group",
                      activeTab === "overview" && "bg-zinc-900/50"
                    )}
                  >
                    <Activity className="size-4 text-zinc-400 group-hover:text-zinc-200 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-zinc-200">System Overview</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">Workflow stages & counts</div>
                    </div>
                  </button>

                  <button 
                    onClick={() => onTabChange?.("completion")}
                    className={cn(
                      "flex items-start gap-2.5 p-2 rounded-lg text-left transition-all hover:bg-zinc-900 group",
                      activeTab === "completion" && "bg-zinc-900/50"
                    )}
                  >
                    <ClipboardCheck className="size-4 text-zinc-400 group-hover:text-zinc-200 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-zinc-200">Completion Tracker</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">Goal sheets submission</div>
                    </div>
                  </button>

                  <button 
                    onClick={() => onTabChange?.("analytics")}
                    className={cn(
                      "flex items-start gap-2.5 p-2 rounded-lg text-left transition-all hover:bg-zinc-900 group",
                      activeTab === "analytics" && "bg-zinc-900/50"
                    )}
                  >
                    <TrendingUp className="size-4 text-zinc-400 group-hover:text-zinc-200 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-zinc-200">Analytics Portal</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">Organization effectiveness</div>
                    </div>
                  </button>

                  <button 
                    onClick={() => onTabChange?.("users")}
                    className={cn(
                      "flex items-start gap-2.5 p-2 rounded-lg text-left transition-all hover:bg-zinc-900 group",
                      activeTab === "users" && "bg-zinc-900/50"
                    )}
                  >
                    <Users className="size-4 text-zinc-400 group-hover:text-zinc-200 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-zinc-200">Users Control</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">Edit roles & managers</div>
                    </div>
                  </button>

                  <button 
                    onClick={() => onTabChange?.("goals")}
                    className={cn(
                      "flex items-start gap-2.5 p-2 rounded-lg text-left transition-all hover:bg-zinc-900 group",
                      activeTab === "goals" && "bg-zinc-900/50"
                    )}
                  >
                    <Unlock className="size-4 text-zinc-400 group-hover:text-zinc-200 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-zinc-200">Unlock Overrides</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">Release locked goal sheets</div>
                    </div>
                  </button>

                  <button 
                    onClick={() => onTabChange?.("logs")}
                    className={cn(
                      "flex items-start gap-2.5 p-2 rounded-lg text-left transition-all hover:bg-zinc-900 group",
                      activeTab === "logs" && "bg-zinc-900/50"
                    )}
                  >
                    <History className="size-4 text-zinc-400 group-hover:text-zinc-200 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-zinc-200">Audit Logs</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">System-wide transaction events</div>
                    </div>
                  </button>

                  <button 
                    onClick={() => onTabChange?.("profile")}
                    className={cn(
                      "flex items-start gap-2.5 p-2 rounded-lg text-left transition-all hover:bg-zinc-900 group",
                      activeTab === "profile" && "bg-zinc-900/50"
                    )}
                  >
                    <UserIcon className="size-4 text-zinc-400 group-hover:text-zinc-200 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-zinc-200">Profile Settings</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">Manage your personal details</div>
                    </div>
                  </button>
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>

      {/* Right Section: Notifications & User Dropdown */}
      <div className="flex items-center gap-3">
        {/* Interactive Notification Bell */}
        <DropdownMenu>
          <DropdownMenuTrigger render={(triggerProps) => (
            <Button 
              {...triggerProps}
              variant="ghost" 
              size="icon" 
              className="relative text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-full size-9 shrink-0"
            >
              <Bell className="size-4" />
              {notifications.length > 0 && (
                <span className="absolute top-1.5 right-1.5 size-2 bg-zinc-400 rounded-full ring-2 ring-[#09090b] animate-pulse" />
              )}
            </Button>
          )} />
          <DropdownMenuContent align="end" className="w-80 mt-2 p-0 overflow-hidden bg-zinc-950 shadow-2xl border border-zinc-800 rounded-xl">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <span className="text-xs font-bold text-zinc-200">System Notifications</span>
              {notifications.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleMarkAllRead} 
                  disabled={loadingNotifs}
                  className="text-[9px] uppercase font-bold text-zinc-400 hover:text-white hover:bg-zinc-900 h-6 px-2 rounded-md"
                >
                  Mark all as read
                </Button>
              )}
            </div>
            
            <div className="max-h-[280px] overflow-y-auto divide-y divide-zinc-900">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center gap-2">
                  <div className="size-9 rounded-full bg-zinc-900 flex items-center justify-center">
                    <Bell className="size-4 text-zinc-500" />
                  </div>
                  <div className="text-xs font-semibold text-zinc-300">All caught up!</div>
                  <div className="text-[10px] text-zinc-500">No new alerts to process.</div>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div 
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className="p-4 hover:bg-zinc-900 cursor-pointer flex gap-3 transition-colors duration-150 group"
                  >
                    <div className="size-8 rounded-full bg-zinc-900 flex items-center justify-center shrink-0 mt-0.5 border border-zinc-800">
                      <ClipboardCheck className="size-4 text-zinc-400 group-hover:text-zinc-200" />
                    </div>
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="text-xs font-bold text-zinc-200 leading-tight">
                        {notif.title}
                      </div>
                      <div className="text-[10px] text-zinc-400 leading-normal break-words">
                        {notif.message}
                      </div>
                      <div className="text-[9px] text-zinc-500 font-mono">
                        {new Date(notif.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-6 w-px bg-zinc-800 shrink-0" />

        {/* User Account Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger render={(triggerProps) => (
            <Button 
              {...triggerProps}
              variant="ghost" 
              className="pl-2 pr-3 py-1.5 h-auto rounded-full hover:bg-zinc-900 flex items-center gap-2 shrink-0"
            >
              {/* Neutral avatar gradient */}
              <div className="size-7.5 rounded-full bg-gradient-to-tr from-zinc-700 via-zinc-800 to-zinc-600 flex items-center justify-center text-zinc-200 font-bold text-xs border border-zinc-700 shadow-sm">
                {initials}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-bold text-zinc-200 leading-none">
                  {user?.name || "Demo Admin"}
                </div>
                <div className="text-[9px] text-zinc-500 mt-1 uppercase tracking-wider font-extrabold leading-none">
                  {user?.role || "ADMIN"}
                </div>
              </div>
            </Button>
          )} />
          <DropdownMenuContent align="end" className="w-52 mt-2 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-zinc-400 text-xs">My Account</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-zinc-900" />
              <DropdownMenuItem 
                onClick={() => onTabChange?.("profile")}
                className="cursor-pointer text-zinc-300 hover:text-white hover:bg-zinc-900 text-xs"
              >
                <UserIcon className="mr-2 size-4 text-zinc-500" />
                <span>Profile Settings</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="bg-zinc-900" />
            <DropdownMenuItem 
              className="text-rose-400 focus:text-rose-300 hover:bg-rose-950/20 cursor-pointer text-xs" 
              onClick={() => signOut({ callbackUrl: "/auth/login" })}
            >
              <LogOut className="mr-2 size-4" />
              <span>Log Out Portal</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
