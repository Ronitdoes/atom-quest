"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Search, Menu, LogOut, User as UserIcon, Settings, ClipboardCheck, Zap } from "lucide-react";
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

interface HeaderProps {
  title: string;
  breadcrumb?: string;
  onMenuClick?: () => void;
  className?: string;
  onTabChange?: (tab: string) => void;
  activeTab?: string;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  link?: string | null;
  createdAt: string;
}

export function Header({ title, breadcrumb, onMenuClick, className, onTabChange, activeTab }: HeaderProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const user = session?.user;

  // Get initials from name
  const initials = user?.name
    ? user.name.split(" ").map(n => n[0]).join("").toUpperCase()
    : "??";

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const lastFetchTimeRef = useRef<number>(0);
  const lastActiveTimeRef = useRef<number>(0);

  const fetchNotifications = async () => {
    try {
      const response = await fetch("/api/notifications");
      if (response.ok) {
        const result = await response.json();
        setNotifications(Array.isArray(result) ? result : result.data ?? []);
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

    // Initial fetch on mount / session reference recreation - respects cooldown
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
      setLoading(true);
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      setNotifications([]);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <header className={cn("h-16 border-b border-zinc-800 bg-[#09090b]/90 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-30 text-white", className)}>
      <div className="flex items-center gap-4">
        {onMenuClick && (
          <Button variant="ghost" size="icon" className="lg:hidden text-zinc-400 hover:text-white hover:bg-zinc-900" onClick={onMenuClick}>
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <div className="flex items-center gap-3">
          {/* Mini Logo - Neutral theme */}
          <div className="relative size-7 flex items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 shadow-[0_0_8px_rgba(255,255,255,0.05)]">
            <Zap className="size-4 text-zinc-300 fill-zinc-300" />
          </div>
          <div>
            {breadcrumb && (
              <div className="text-[9px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-0.5 leading-none">
                {breadcrumb}
              </div>
            )}
            <h1 className="text-sm font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 via-zinc-200 to-zinc-400 tracking-tight leading-normal py-0.5">
              {title}
            </h1>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* Interactive Notification Bell */}
        <DropdownMenu>
          <DropdownMenuTrigger render={(triggerProps) => (
            <Button 
              {...triggerProps}
              variant="ghost" 
              size="icon" 
              className="relative text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-full h-9 w-9"
            >
              <Bell className="h-5 w-5" />
              {notifications.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-zinc-950 animate-pulse" />
              )}
            </Button>
          )} />
          <DropdownMenuContent align="end" className="w-80 mt-2 p-0 overflow-hidden bg-zinc-950 shadow-2xl border border-zinc-800 rounded-xl text-white">
            <div className="flex items-center justify-between p-4 border-b border-zinc-900">
              <span className="text-sm font-bold text-zinc-200">Notifications</span>
              {notifications.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleMarkAllRead} 
                  disabled={loading}
                  className="text-[10px] uppercase font-bold text-zinc-500 hover:text-zinc-200 h-6 px-2 rounded-md hover:bg-zinc-900"
                >
                  Mark all as read
                </Button>
              )}
            </div>
            
            <div className="max-h-[300px] overflow-y-auto divide-y divide-zinc-900">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-850 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-zinc-550" />
                  </div>
                  <div className="text-xs font-semibold text-zinc-400">All caught up!</div>
                  <div className="text-[10px] text-zinc-600">No new notifications to show.</div>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div 
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className="p-4 hover:bg-zinc-900/50 cursor-pointer flex gap-3 transition-colors duration-150 group"
                  >
                    <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-850 flex items-center justify-center shrink-0 mt-0.5">
                      <ClipboardCheck className="w-4 h-4 text-zinc-500 group-hover:text-zinc-350" />
                    </div>
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="text-xs font-bold text-zinc-200 group-hover:text-white leading-tight">
                        {notif.title}
                      </div>
                      <div className="text-[11px] text-zinc-500 group-hover:text-zinc-400 leading-relaxed break-words">
                        {notif.message}
                      </div>
                      <div className="text-[9px] text-zinc-650 uppercase tracking-tighter">
                        {new Date(notif.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <div className="h-8 w-px bg-zinc-800 mx-1" />
        
        <DropdownMenu>
          <DropdownMenuTrigger render={(triggerProps) => (
            <Button 
              {...triggerProps}
              variant="ghost" 
              className="pl-2 pr-3 py-1.5 h-auto rounded-full hover:bg-zinc-900 flex items-center gap-2 hover:text-white"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-zinc-700 to-zinc-500 flex items-center justify-center text-white font-bold text-xs shadow-sm border border-zinc-600">
                {initials}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-bold text-zinc-200 leading-none">
                  {user?.name || "User"}
                </div>
                <div className="text-[9px] text-zinc-500 mt-1 uppercase tracking-wider font-extrabold leading-none">
                  {user?.role || "Role"}
                </div>
              </div>
            </Button>
          )} />
          <DropdownMenuContent align="end" className="w-52 mt-2 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl text-white">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-zinc-400 text-xs">My Account</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-zinc-900" />
              <DropdownMenuItem 
                onClick={() => {
                  if (onTabChange) {
                    onTabChange("profile");
                  } else {
                    if (user?.role === "MANAGER") {
                      router.push("/manager?tab=profile");
                    } else if (user?.role === "EMPLOYEE") {
                      router.push("/employee?tab=profile");
                    }
                  }
                }}
                className="cursor-pointer text-zinc-300 hover:text-white hover:bg-zinc-900 text-xs"
              >
                <UserIcon className="mr-2 size-4 text-zinc-500" />
                <span>Profile Settings</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="bg-zinc-900" />
            <DropdownMenuItem 
              className="text-rose-400 focus:text-rose-350 hover:bg-rose-950/20 cursor-pointer text-xs" 
              onClick={() => signOut({ callbackUrl: "/auth/login" })}
            >
              <LogOut className="mr-2 h-4 text-rose-500 size-4" />
              <span>Log Out Portal</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}


