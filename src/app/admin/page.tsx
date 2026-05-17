import { Header } from "@/components/shared/header";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { redirect } from "next/navigation";
import { AdminDashboardClient } from "@/components/admin/AdminDashboardClient";

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    redirect("/auth/login");
  }

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50/50 dark:bg-background">
      <Header 
        title="Admin Control Panel" 
        breadcrumb="Governance"
      />
      
      <AdminDashboardClient 
        adminName={session.user.name ?? null} 
        adminEmail={session.user.email ?? null} 
      />
    </div>
  );
}


