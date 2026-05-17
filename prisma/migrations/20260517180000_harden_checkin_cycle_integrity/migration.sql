-- Add cycle scoping to check-ins and prevent duplicate user/cycle/quarter submissions.
ALTER TABLE "CheckIn" ADD COLUMN "cycleId" TEXT NOT NULL DEFAULT '2024';

CREATE UNIQUE INDEX "CheckIn_userId_cycleId_quarter_key" ON "CheckIn"("userId", "cycleId", "quarter");
