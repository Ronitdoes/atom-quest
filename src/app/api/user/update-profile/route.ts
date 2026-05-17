import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { db } from "@/lib/db/db";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { safeErrorResponse, BadRequestError } from "@/lib/security/api";

const updateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
  confirmPassword: z.string().optional(),
}).superRefine((data, ctx) => {
  const hasPasswordUpdate = !!(data.currentPassword || data.newPassword || data.confirmPassword);
  if (hasPasswordUpdate) {
    if (!data.currentPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Current password is required to change password",
        path: ["currentPassword"],
      });
    }
    if (!data.newPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "New password is required to change password",
        path: ["newPassword"],
      });
    } else {
      if (data.newPassword.length < 8) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "New password must be at least 8 characters long",
          path: ["newPassword"],
        });
      }
      if (!/[A-Z]/.test(data.newPassword)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "New password must contain at least one uppercase letter",
          path: ["newPassword"],
        });
      }
      if (!/[a-z]/.test(data.newPassword)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "New password must contain at least one lowercase letter",
          path: ["newPassword"],
        });
      }
      if (!/[0-9]/.test(data.newPassword)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "New password must contain at least one number",
          path: ["newPassword"],
        });
      }
      if (!/[^A-Za-z0-9]/.test(data.newPassword)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "New password must contain at least one special character",
          path: ["newPassword"],
        });
      }
    }
    if (data.newPassword !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "New passwords do not match",
        path: ["confirmPassword"],
      });
    }
  }
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Protect against brute-force (max 10 updates per minute)
    await assertRateLimit(`profile:update:${session.user.id}`, 10, 60);

    const body = await req.json();
    const validated = updateProfileSchema.parse(body);

    // Fetch user from DB
    const user = await db.user.findUnique({
      where: { id: session.user.id }
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const updateData: { name?: string; password?: string } = {};
    const auditActions: string[] = [];

    // 1. Handle Name Change
    if (validated.name && validated.name !== user.name) {
      updateData.name = validated.name;
      auditActions.push(`Name changed from "${user.name}" to "${validated.name}"`);
    }

    // 2. Handle Password Change
    if (validated.newPassword && validated.currentPassword) {
      // Verify current password matches
      const isMatch = await bcrypt.compare(validated.currentPassword, user.password);
      if (!isMatch) {
        throw new BadRequestError("Current password is incorrect");
      }

      // Verify new password isn't the same as current
      if (validated.currentPassword === validated.newPassword) {
        throw new BadRequestError("New password cannot be the same as the current password");
      }

      // Hash the new password
      updateData.password = await bcrypt.hash(validated.newPassword, 10);
      auditActions.push("Password updated securely");
    }

    // If nothing has actually changed
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: "No profile changes detected" });
    }

    // Perform database transaction
    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: updateData
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "PROFILE_UPDATE",
          entityType: "User",
          entityId: user.id,
          newValue: {
            changes: auditActions,
            message: "User updated their profile successfully"
          }
        }
      });
    });

    return NextResponse.json({ 
      message: "Profile updated successfully!",
      user: {
        name: updateData.name || user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error("[PROFILE_UPDATE_POST]", error);
    return safeErrorResponse(error);
  }
}
