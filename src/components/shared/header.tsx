"use client";

import { useState, useEffect } from "react";
import { Bell, Search, Menu, LogOut, User as UserIcon, Settings, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSession, signOut } from "next-auth/react";
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
}

export function Header({ title, breadcrumb, onMenuClick, className }: HeaderProps) {
  const { data: session } = useSession();
  const user = session?.user;

  // Get initials from name
  const initials = user?.name
    ? user.name.split(" ").map(n => n[0]).join("").toUpperCase()
    : "??";

  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    try {
      const response = await fetch("/api/notifications");
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchNotifications();
      // Poll notifications every 30 seconds for live updates
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [session]);

  const handleNotificationClick = async (notif: any) => {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: notif.id }),
      });

      setNotifications((prev) => prev.filter((n) => n.id !== notif.id));

      if (notif.link) {
        window.location.href = notif.link;
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setLoading(true);
      for (const notif of notifications) {
        await fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: notif.id }),
        });
      }
      setNotifications([]);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <header className={cn("h-16 border-b border-border bg-white/80 dark:bg-background/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-30", className)}>
      <div className="flex items-center gap-4">
        {onMenuClick && (
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <div>
          {breadcrumb && (
            <div className="text-[10px] uppercase tracking-wider font-bold text-neutral-400 dark:text-neutral-500 mb-0.5">
              {breadcrumb}
            </div>
          )}
          <h1 className="text-xl font-bold text-neutral-900 dark:text-white tracking-tight">
            {title}
          </h1>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search goals..."
            className="h-9 w-64 bg-neutral-100 dark:bg-neutral-900 border-none rounded-lg pl-10 pr-4 text-sm focus:ring-2 focus:ring-neutral-500 transition-all outline-none"
          />
        </div>
        
        {/* Interactive Notification Bell */}
        <DropdownMenu>
          <DropdownMenuTrigger render={(triggerProps) => (
            <Button 
              {...triggerProps}
              variant="ghost" 
              size="icon" 
              className="relative text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 rounded-full h-9 w-9"
            >
              <Bell className="h-5 w-5" />
              {notifications.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white dark:ring-neutral-950 animate-pulse" />
              )}
            </Button>
          )} />
          <DropdownMenuContent align="end" className="w-80 mt-2 p-0 overflow-hidden bg-white dark:bg-neutral-950 shadow-xl border border-neutral-150 dark:border-neutral-800">
            <div className="flex items-center justify-between p-4 border-b border-neutral-100 dark:border-neutral-800">
              <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Notifications</span>
              {notifications.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleMarkAllRead} 
                  disabled={loading}
                  className="text-[10px] uppercase font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200 h-6 px-2 rounded-md"
                >
                  Mark all as read
                </Button>
              )}
            </div>
            
            <div className="max-h-[300px] overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-neutral-400" />
                  </div>
                  <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400">All caught up!</div>
                  <div className="text-[10px] text-neutral-400">No new notifications to show.</div>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div 
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className="p-4 hover:bg-neutral-50 dark:hover:bg-neutral-900 cursor-pointer flex gap-3 transition-colors duration-150 group"
                  >
                    <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0 mt-0.5">
                      <ClipboardCheck className="w-4 h-4 text-neutral-500 group-hover:text-neutral-800 dark:group-hover:text-neutral-200" />
                    </div>
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100 leading-tight">
                        {notif.title}
                      </div>
                      <div className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed break-words">
                        {notif.message}
                      </div>
                      <div className="text-[9px] text-neutral-400 uppercase tracking-tighter">
                        {new Date(notif.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <div className="h-8 w-px bg-border mx-1" />
        
        <DropdownMenu>
          <DropdownMenuTrigger render={(triggerProps) => (
            <Button 
              {...triggerProps}
              variant="ghost" 
              className="pl-2 pr-3 py-1.5 h-auto rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900 flex items-center gap-2"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-neutral-600 to-neutral-400 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                {initials}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 leading-none">
                  {user?.name || "User"}
                </div>
                <div className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-1 uppercase tracking-tighter font-bold">
                  {user?.role || "Role"}
                </div>
              </div>
            </Button>
          )} />
          <DropdownMenuContent align="end" className="w-56 mt-2">
            <DropdownMenuGroup>
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer">
                <UserIcon className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-rose-600 focus:text-rose-600 cursor-pointer" 
              onClick={() => signOut({ callbackUrl: "/auth/login" })}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}


