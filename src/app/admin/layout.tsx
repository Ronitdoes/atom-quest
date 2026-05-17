import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/login");
  }

  if (session.user.role !== "ADMIN") {
    if (session.user.role === "MANAGER") {
      redirect("/manager");
    } else if (session.user.role === "EMPLOYEE") {
      redirect("/employee");
    } else {
      redirect("/auth/login");
    }
  }

  return <>{children}</>;
}
