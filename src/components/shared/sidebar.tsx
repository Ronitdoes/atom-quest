"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LucideIcon, LayoutDashboard, Target, Users, Settings, LogOut, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

interface SidebarProps {
  items: NavItem[];
  className?: string;
}

export function Sidebar({ items, className }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className={cn("flex flex-col h-full bg-white dark:bg-neutral-950 border-r border-neutral-200 dark:border-neutral-800 w-64 transition-all duration-300", className)}>
      <div className="p-6">
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-neutral-600 flex items-center justify-center">
            <Target className="text-white w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
            AtomQuest
          </span>
        </Link>
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-4">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                isActive
                  ? "bg-neutral-50 dark:bg-neutral-900/20 text-neutral-700 dark:text-neutral-400"
                  : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900 hover:text-neutral-900 dark:hover:text-neutral-200"
              )}
            >
              <div className="flex items-center">
                <Icon className={cn(
                  "mr-3 h-5 w-5 transition-colors",
                  isActive ? "text-neutral-600 dark:text-neutral-400" : "text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300"
                )} />
                {item.title}
              </div>
              {isActive && <ChevronRight className="h-4 w-4 opacity-70" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-neutral-100 dark:border-neutral-800">
        <Button
          variant="ghost"
          className="w-full justify-start text-neutral-600 dark:text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/10"
          onClick={() => {}} // Handle logout
        >
          <LogOut className="mr-3 h-5 w-5" />
          Log Out
        </Button>
      </div>
    </div>
  );
}

