import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { redirect } from "next/navigation";
import LoginClient from "./LoginClient";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    if (session.user.role === "ADMIN") {
      redirect("/admin");
    } else if (session.user.role === "MANAGER") {
      redirect("/manager");
    } else {
      redirect("/employee");
    }
  }

  return <LoginClient />;
}
