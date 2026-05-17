-- Add check constraint for weightage
ALTER TABLE "Goal" ADD CONSTRAINT "weightage_min_check" CHECK ("weightage" >= 10);