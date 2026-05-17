-- AlterTable
ALTER TABLE "Goal" ADD COLUMN     "sharedGoalId" TEXT;

-- CreateTable
CREATE TABLE "SharedGoal" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "thrustArea" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "uomType" "UomType" NOT NULL,
    "target" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SharedGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharedGoalAssignment" (
    "id" TEXT NOT NULL,
    "sharedGoalId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SharedGoalAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SharedGoalAssignment_sharedGoalId_userId_key" ON "SharedGoalAssignment"("sharedGoalId", "userId");

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_sharedGoalId_fkey" FOREIGN KEY ("sharedGoalId") REFERENCES "SharedGoal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedGoal" ADD CONSTRAINT "SharedGoal_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedGoalAssignment" ADD CONSTRAINT "SharedGoalAssignment_sharedGoalId_fkey" FOREIGN KEY ("sharedGoalId") REFERENCES "SharedGoal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedGoalAssignment" ADD CONSTRAINT "SharedGoalAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
