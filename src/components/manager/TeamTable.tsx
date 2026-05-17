import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableWrapper } from "@/components/shared/table-wrapper";
import { StatusBadge } from "@/components/shared/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Eye, Clock } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface TeamMember {
  id: string;
  name: string | null;
  email: string;
  status: string;
  updatedAt: Date;
  goalSheetId: string | null;
}

interface TeamTableProps {
  members: TeamMember[];
}

export function TeamTable({ members }: TeamTableProps) {
  return (
    <TableWrapper
      title="Team Members"
      description="List of your team members and their goal setting status."
    >
      <Table>
        <TableHeader>
          <TableRow className="bg-neutral-50/50 dark:bg-neutral-900/50">
            <TableHead className="font-semibold text-neutral-900 dark:text-neutral-100">Member</TableHead>
            <TableHead className="font-semibold text-neutral-900 dark:text-neutral-100">Goal Status</TableHead>
            <TableHead className="font-semibold text-neutral-900 dark:text-neutral-100">Last Updated</TableHead>
            <TableHead className="text-right font-semibold text-neutral-900 dark:text-neutral-100">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="h-32 text-center text-neutral-500">
                No team members found.
              </TableCell>
            </TableRow>
          ) : (
            members.map((member) => (
              <TableRow key={member.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/50 transition-colors">
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium text-neutral-900 dark:text-neutral-100">
                      {member.name || "Unnamed User"}
                    </span>
                    <span className="text-xs text-neutral-500">{member.email}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <StatusBadge status={member.status} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center text-xs text-neutral-500">
                    <Clock className="mr-1 h-3 w-3" />
                    {formatDistanceToNow(member.updatedAt, { addSuffix: true })}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Link 
                    href={`/manager/approvals?userId=${member.id}&cycleId=2026`}
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "sm" }),
                      "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800",
                      !member.goalSheetId && "pointer-events-none opacity-50"
                    )}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    View
                  </Link>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableWrapper>
  );
}

