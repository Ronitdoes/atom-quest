import { z } from "zod";

export const goalAchievementSchema = z.object({
  goalId: z.string().min(1, "Goal ID is required"),
  value: z.number({ message: "Achievement value must be a valid number" }),
  status: z.enum(["Not Started", "On Track", "Completed"], {
    message: "Status must be 'Not Started', 'On Track', or 'Completed'",
  }),
  notes: z.string().max(1000, "Notes cannot exceed 1000 characters").optional().or(z.literal("")),
});

export const checkInSchema = z.object({
  cycleId: z.string().min(1, "Cycle ID is required"),
  quarter: z.number().int().min(1).max(4, "Quarter must be between 1 and 4"),
  notes: z.string().max(2000, "Overall notes cannot exceed 2000 characters").optional().or(z.literal("")),
  achievements: z.array(goalAchievementSchema).min(1, "At least one goal achievement update is required"),
});

export type GoalAchievementInput = z.infer<typeof goalAchievementSchema>;
export type CheckInInput = z.infer<typeof checkInSchema>;
