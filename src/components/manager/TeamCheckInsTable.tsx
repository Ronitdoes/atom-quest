import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableWrapper } from "@/components/shared/table-wrapper";
import { buttonVariants } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Lock, ArrowRight, Hourglass } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface QuarterStatus {
  status: "LOCKED" | "NOT_STARTED" | "PENDING_REVIEW" | "REVIEWED";
  checkInId?: string;
}

interface TeamCheckInMember {
  id: string;
  name: string | null;
  email: string;
  hasApprovedSheet: boolean;
  quarters: QuarterStatus[];
}

interface TeamCheckInsTableProps {
  members: TeamCheckInMember[];
}

export function TeamCheckInsTable({ members }: TeamCheckInsTableProps) {
  const getBadge = (status: QuarterStatus["status"]) => {
    switch (status) {
      case "LOCKED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-400 border border-neutral-200 dark:bg-neutral-900/50 dark:text-neutral-600 dark:border-neutral-800">
            <Lock className="w-3.5 h-3.5" />
            Locked
          </span>
        );
      case "NOT_STARTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-50 text-neutral-400 border border-neutral-200 dark:bg-neutral-900/10 dark:text-neutral-500 dark:border-neutral-800/40">
            <Hourglass className="w-3.5 h-3.5 animate-pulse" />
            Not Started
          </span>
        );
      case "PENDING_REVIEW":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            Needs Review
          </span>
        );
      case "REVIEWED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30">
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
            Reviewed
          </span>
        );
    }
  };

  return (
    <TableWrapper
      title="Team Quarterly Check-ins"
      description="Track and review target achievements, progress metrics, and qualitative check-in submissions for Q1-Q4."
    >
      <Table>
        <TableHeader>
          <TableRow className="bg-neutral-50/50 dark:bg-neutral-900/50">
            <TableHead className="font-semibold text-neutral-900 dark:text-neutral-100">Member</TableHead>
            <TableHead className="font-semibold text-neutral-900 dark:text-neutral-100 text-center">Q1</TableHead>
            <TableHead className="font-semibold text-neutral-900 dark:text-neutral-100 text-center">Q2</TableHead>
            <TableHead className="font-semibold text-neutral-900 dark:text-neutral-100 text-center">Q3</TableHead>
            <TableHead className="font-semibold text-neutral-900 dark:text-neutral-100 text-center">Q4</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-32 text-center text-neutral-500">
                No team members assigned or found.
              </TableCell>
            </TableRow>
          ) : (
            members.map((member) => (
              <TableRow key={member.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/50 transition-colors">
                <TableCell className="py-4">
                  <div className="flex flex-col">
                    <span className="font-medium text-neutral-900 dark:text-neutral-100">
                      {member.name || "Unnamed User"}
                    </span>
                    <span className="text-xs text-neutral-500">{member.email}</span>
                  </div>
                </TableCell>
                {[1, 2, 3, 4].map((q) => {
                  const qData = member.quarters[q - 1];
                  const canReview = qData.status === "PENDING_REVIEW" || qData.status === "REVIEWED";

                  return (
                    <TableCell key={q} className="py-4 text-center">
                      <div className="flex flex-col items-center gap-2">
                        {getBadge(qData.status)}
                        {canReview && (
                          <Link
                            href={`/manager/check-ins?userId=${member.id}&quarter=${q}`}
                            className={cn(
                              buttonVariants({
                                variant: qData.status === "PENDING_REVIEW" ? "default" : "secondary",
                                size: "xs",
                              }),
                              "h-7 text-[11px] px-2.5 rounded-md flex items-center gap-1 transition-all duration-200"
                            )}
                          >
                            <span>{qData.status === "PENDING_REVIEW" ? "Review" : "View"}</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableWrapper>
  );
}
