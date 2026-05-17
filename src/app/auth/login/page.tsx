"use client";

import { useState, Suspense } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, LogIn } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        toast.error("Invalid credentials. Please try again.");
      } else {
        toast.success("Logged in successfully!");
        
        // If we are going to the home page, determine the dashboard based on role
        if (callbackUrl === "/") {
          const session = await getSession();
          if (session?.user?.role === "ADMIN") {
            router.push("/admin");
          } else if (session?.user?.role === "MANAGER") {
            router.push("/manager");
          } else {
            router.push("/employee");
          }
        } else {
          router.push(callbackUrl);
        }
        
        router.refresh();
      }
    } catch (error) {
      toast.error("An error occurred during login.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md border-neutral-200 shadow-xl dark:border-neutral-800">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-4">
           <div className="rounded-full bg-primary p-3 text-primary-foreground">
              <LogIn className="h-6 w-6" />
           </div>
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">Goal Tracking Portal</CardTitle>
        <CardDescription>
          Enter your credentials to access your account
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="name@example.com"
              required
              className="transition-all focus:ring-2 focus:ring-neutral-500"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              className="transition-all focus:ring-2 focus:ring-neutral-500"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 pt-4">
          <Button className="w-full" type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Logging in...
              </>
            ) : (
              "Log In"
            )}
          </Button>
          <div className="text-sm text-neutral-500 text-center">
            Use the demo accounts provided in the setup guide.
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12 dark:bg-neutral-950 sm:px-6 lg:px-8">
      <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin text-neutral-500" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}

