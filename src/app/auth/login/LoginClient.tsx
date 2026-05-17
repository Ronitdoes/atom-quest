"use client";

import { useState, Suspense, useEffect, useRef } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, LogIn, Target, Shield, Cpu, Zap } from "lucide-react";
import gsap from "gsap";

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
    <Card className="w-full max-w-md bg-zinc-950/40 border border-zinc-850/80 shadow-2xl rounded-2xl backdrop-blur-md">
      <CardHeader className="space-y-1.5 text-center pb-4">
        <div className="flex justify-center mb-3">
           <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-3.5 text-zinc-300 shadow-md">
              <LogIn className="h-6 w-6" />
           </div>
        </div>
        <CardTitle className="text-2xl font-black tracking-tight text-zinc-150">Goal Tracking Portal</CardTitle>
        <CardDescription className="text-xs text-zinc-450">
          Enter your credentials to access your account
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Email Address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="name@example.com"
              required
              className="bg-zinc-900/60 border-zinc-800 text-zinc-100 placeholder-zinc-500 focus:ring-1 focus:ring-zinc-700 h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              className="bg-zinc-900/60 border-zinc-800 text-zinc-100 placeholder-zinc-550 focus:ring-1 focus:ring-zinc-700 h-10"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 pt-4 pb-6">
          <Button className="w-full bg-white text-zinc-950 hover:bg-zinc-100 font-bold rounded-xl h-11 transition-all" type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Logging in...
              </>
            ) : (
              "Log In"
            )}
          </Button>
          <div className="text-[10px] text-zinc-550 text-center uppercase tracking-wider font-mono">
            Use the demo accounts provided in the setup guide.
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function LoginClient() {
  const leftColRef = useRef<HTMLDivElement>(null);
  const rightColRef = useRef<HTMLDivElement>(null);
  const leftContentRef = useRef<HTMLDivElement>(null);
  const rightContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only run animation on client side, and safe-guard references
    if (!leftColRef.current || !rightColRef.current) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline();

      // Set initial values for smooth animation start
      gsap.set(leftColRef.current, { xPercent: -100, opacity: 0 });
      gsap.set(rightColRef.current, { xPercent: 100, opacity: 0 });

      // Stagger elements: title block + children of highlights container
      const introElements = leftContentRef.current ? Array.from(leftContentRef.current.children) : [];
      const highlights = leftContentRef.current?.querySelector(".highlights-container");
      const highlightItems = highlights ? Array.from(highlights.children) : [];

      // Consolidate left column child components for single clean stagger transition
      const leftElements = [
        ...introElements.filter(el => !el.classList.contains("highlights-container")),
        ...highlightItems
      ];

      if (leftElements.length > 0) {
        gsap.set(leftElements, { y: 35, opacity: 0 });
      }
      if (rightContentRef.current) {
        gsap.set(rightContentRef.current, { y: 35, opacity: 0 });
      }

      // Slide and merge the two columns together to the center
      tl.to([leftColRef.current, rightColRef.current], {
        xPercent: 0,
        opacity: 1,
        duration: 1.25,
        ease: "power4.out",
      });

      // Stagger reveal the left-side text content elements
      if (leftElements.length > 0) {
        tl.to(leftElements, {
          y: 0,
          opacity: 1,
          duration: 0.75,
          stagger: 0.08,
          ease: "power3.out",
        }, "-=0.75");
      }

      // Stagger reveal the login form card container
      if (rightContentRef.current) {
        tl.to(rightContentRef.current, {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: "power3.out",
        }, "-=0.5");
      }
    });

    return () => ctx.revert();
  }, []);

  return (
    <div className="flex min-h-screen bg-[#09090b] overflow-hidden">
      {/* Left Column - Project Context (hidden on small screens, flex on large) */}
      <div 
        ref={leftColRef}
        className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-zinc-950 via-zinc-900 to-black border-r border-zinc-900/80 p-16 flex-col items-center justify-between text-center relative opacity-0"
      >
        {/* Subtle mesh glowing spheres */}
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-zinc-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-blue-500/[0.02] rounded-full blur-3xl pointer-events-none" />
        
        {/* Header - Brand info (Center Aligned) */}
        <div className="flex flex-col items-center gap-2 relative z-10 w-full">
          <div className="size-11 rounded-2xl bg-zinc-900 border border-zinc-800/80 flex items-center justify-center shadow-lg">
            <Zap className="h-5 w-5 text-zinc-350 fill-zinc-350/5" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-white uppercase font-sans">AtomQuest</h1>
            <p className="text-[9px] text-zinc-500 tracking-widest font-mono uppercase">Performance Portal</p>
          </div>
        </div>

        {/* Center - Context Pitch (Center Aligned) */}
        <div ref={leftContentRef} className="max-w-md space-y-10 relative z-10 my-auto flex flex-col items-center text-center mx-auto">
          <div className="space-y-4 text-center">
            <h2 className="text-3xl lg:text-4xl font-black tracking-tight leading-tight text-zinc-100 bg-gradient-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
              Aligning Ambition with Real-Time Execution.
            </h2>
            <p className="text-zinc-400 text-xs leading-relaxed opacity-90 max-w-sm mx-auto">
              AtomQuest is an enterprise performance workspace designed to cascade organizational objectives into trackable goals, secure check-ins, and structured manager reviews.
            </p>
          </div>

          {/* Highlights List (Center Aligned Cards) */}
          <div className="space-y-6 pt-2 highlights-container w-full max-w-sm flex flex-col items-center">
            <div className="flex flex-col items-center text-center gap-2 group">
              <div className="size-8 rounded-lg bg-zinc-900/60 border border-zinc-850 flex items-center justify-center flex-shrink-0 group-hover:border-zinc-700 transition-colors">
                <Target className="h-4 w-4 text-zinc-400" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-zinc-200">Strategic Alignment</h4>
                <p className="text-[11px] text-zinc-500 leading-normal max-w-xs">
                  Cascade key corporate thrust areas directly down to measurable, role-isolated goal sheets.
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center text-center gap-2 group">
              <div className="size-8 rounded-lg bg-zinc-900/60 border border-zinc-850 flex items-center justify-center flex-shrink-0 group-hover:border-zinc-700 transition-colors">
                <Cpu className="h-4 w-4 text-zinc-400" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-zinc-200">Role-Based Workspaces</h4>
                <p className="text-[11px] text-zinc-500 leading-normal max-w-xs">
                  Dedicated high-speed dashboard controls tailored for Employees, Managers, and Portal Administrators.
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center text-center gap-2 group">
              <div className="size-8 rounded-lg bg-zinc-900/60 border border-zinc-850 flex items-center justify-center flex-shrink-0 group-hover:border-zinc-700 transition-colors">
                <Shield className="h-4 w-4 text-zinc-400" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-zinc-200">Tamper-Proof Audit Logging</h4>
                <p className="text-[11px] text-zinc-500 leading-normal max-w-xs">
                  Secure Redis-backed rate limiting and immutable log histories tracking every goal sheet transition.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column - Login Page Form */}
      <div 
        ref={rightColRef}
        className="w-full lg:w-1/2 min-h-screen flex items-center justify-center bg-[#09090b] px-4 sm:px-6 lg:px-8 relative opacity-0"
      >
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-zinc-500/[0.02] rounded-full blur-3xl pointer-events-none" />
        <div ref={rightContentRef} className="w-full max-w-md relative z-10">
          <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin text-neutral-500" />}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
