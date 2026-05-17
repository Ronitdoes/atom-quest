import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    if (session.user.role === "ADMIN") redirect("/admin");
    if (session.user.role === "MANAGER") redirect("/manager");
    redirect("/employee");
  }

  // If no session, redirect to the login page
  redirect("/auth/login");
}
