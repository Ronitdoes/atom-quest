import { z } from "zod";
import { UomType } from "@prisma/client";

export const goalSchema = z.object({
  thrustArea: z.string().min(1, "Thrust area is required"),
  title: z.string().min(3, "Title must be at least 3 characters").max(100, "Title is too long"),
  description: z.string().max(500, "Description is too long").optional().or(z.literal("")),
  uomType: z.nativeEnum(UomType, {
    message: "Please select a valid UoM type",
  }),
  target: z.number().min(0, "Target must be at least 0"),
  weightage: z.number()
    .min(10, "Weightage must be at least 10%")
    .max(100, "Weightage cannot exceed 100%"),
  sharedGoalId: z.string().optional(),
});

export type GoalFormData = z.infer<typeof goalSchema>;

export const goalSheetSchema = z.object({
  goals: z.array(goalSchema)
    .min(1, "At least one goal is required")
    .max(8, "Maximum 8 goals allowed"),
}).refine((data) => {
  const totalWeightage = data.goals.reduce((sum, goal) => sum + goal.weightage, 0);
  return totalWeightage === 100;
}, {
  message: "Total weightage must sum up to exactly 100%",
  path: ["goals"],
});
