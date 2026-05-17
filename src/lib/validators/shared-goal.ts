import { z } from "zod";
import { UomType } from "@prisma/client";

export const sharedGoalSchema = z.object({
  thrustArea: z.string().min(1, "Thrust area is required"),
  title: z.string().min(3, "Title must be at least 3 characters").max(100, "Title is too long"),
  description: z.string().max(500, "Description is too long").optional().or(z.literal("")),
  uomType: z.nativeEnum(UomType, {
    message: "Please select a valid UoM type",
  }),
  target: z.number().min(0, "Target must be at least 0"),
});

export type SharedGoalFormData = z.infer<typeof sharedGoalSchema>;

export const sharedGoalAssignmentSchema = z.object({
  sharedGoalId: z.string().min(1, "Shared goal ID is required"),
  userIds: z.array(z.string().min(1)).min(1, "At least one user must be assigned"),
});

export const sharedGoalAchievementSchema = z.object({
  quarter: z.number().int().min(1).max(4),
  value: z.number().min(0),
  status: z.enum(["Not Started", "On Track", "Completed"], {
    message: "Status must be 'Not Started', 'On Track', or 'Completed'",
  }),
  notes: z.string().max(1000, "Notes cannot exceed 1000 characters").optional().or(z.literal("")),
});

export type SharedGoalAchievementData = z.infer<typeof sharedGoalAchievementSchema>;
