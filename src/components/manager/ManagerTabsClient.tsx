"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TeamTable } from "./TeamTable";
import { TeamCheckInsTable } from "./TeamCheckInsTable";
import { SharedGoalManager } from "./SharedGoalManager";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Calendar, Target, User } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

interface ManagerTabsClientProps {
  initialTab: string;
  teamMembers: any[];
  checkInStatus: any[];
  userName: string | null;
  userEmail: string | null;
}

export function ManagerTabsClient({
  initialTab,
  teamMembers,
  checkInStatus,
  userName,
  userEmail,
}: ManagerTabsClientProps) {
  const router = useRouter();
  const { update } = useSession();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(initialTab);

  // Profile Update State
  const [profileName, setProfileName] = useState(userName || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Sync name when prop changes
  useEffect(() => {
    if (userName) {
      setProfileName(userName);
    }
  }, [userName]);

  // Listen to searchParams changes (e.g. clicking Profile Settings in dropdown)
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", value);
    window.history.replaceState(null, "", `/manager?${params.toString()}`);
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const hasPasswordInput = !!(currentPassword || newPassword || confirmPassword);
    if (hasPasswordInput) {
      if (!currentPassword || !newPassword || !confirmPassword) {
        toast.error("Please fill in all password fields to update your password.");
        return;
      }
      if (newPassword !== confirmPassword) {
        toast.error("New passwords do not match.");
        return;
      }
    }

    if (!profileName.trim()) {
      toast.error("Name cannot be empty.");
      return;
    }

    setChangingPassword(true);
    try {
      const payload: any = { name: profileName };
      if (hasPasswordInput) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
        payload.confirmPassword = confirmPassword;
      }

      const res = await fetch("/api/user/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Profile updated successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        await update();
        router.refresh();
      } else {
        toast.error(data.message || "Failed to update profile.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while updating your profile.");
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="team" className="gap-2">
          <Users className="h-4 w-4" />
          Team Status
        </TabsTrigger>
        <TabsTrigger value="checkins" className="gap-2">
          <Calendar className="h-4 w-4" />
          Team Check-ins
        </TabsTrigger>
        <TabsTrigger value="shared" className="gap-2">
          <Target className="h-4 w-4" />
          Shared Goals
        </TabsTrigger>
        <TabsTrigger value="profile" className="gap-2">
          <User className="h-4 w-4" />
          Profile Settings
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="team" className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <Users className="h-5 w-5 text-neutral-500" />
            Team Status
          </h3>
        </div>
        <TeamTable members={teamMembers} />
      </TabsContent>

      <TabsContent value="checkins">
        <TeamCheckInsTable members={checkInStatus} />
      </TabsContent>

      <TabsContent value="shared">
        <SharedGoalManager teamMembers={teamMembers} />
      </TabsContent>

      <TabsContent value="profile" className="space-y-6">
        {/* Profile Inputs */}
        <Card className="bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Manager Profile Settings</CardTitle>
            <CardDescription className="text-xs text-neutral-500">Manage your supervisor account details and change your security credentials.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prof-name" className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Full Name</Label>
                  <Input id="prof-name" value={profileName} onChange={(e) => setProfileName(e.target.value)} className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prof-email" className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Email Address</Label>
                  <Input id="prof-email" defaultValue={userEmail || "manager@atomquest.gov"} disabled className="bg-neutral-100 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-500 cursor-not-allowed" />
                </div>
              </div>
              
              <div className="h-px bg-neutral-100 dark:bg-neutral-850/50 my-6" />
              
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Change Security Password</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="prof-curr" className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Current Password</Label>
                    <Input id="prof-curr" type="password" placeholder="••••••••" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prof-new" className="text-xs font-bold text-neutral-400 uppercase tracking-wider">New Password</Label>
                    <Input id="prof-new" type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prof-conf" className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Confirm Password</Label>
                    <Input id="prof-conf" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={changingPassword} className="bg-neutral-800 hover:bg-neutral-700 text-white dark:bg-neutral-200 dark:hover:bg-neutral-100 dark:text-neutral-950 font-bold px-6 h-10 text-xs shadow-md">
                  {changingPassword ? "Saving Changes..." : "Save Account Changes"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
