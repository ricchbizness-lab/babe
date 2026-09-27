-- AlterTable
ALTER TABLE "TeamMember" ADD COLUMN     "terrainToken" TEXT;

-- CreateTable
CREATE TABLE "Pointage" (
    "id" TEXT NOT NULL,
    "teamMemberId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pointage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Pointage_teamMemberId_idx" ON "Pointage"("teamMemberId");

-- CreateIndex
CREATE INDEX "Pointage_businessId_idx" ON "Pointage"("businessId");

-- CreateIndex
CREATE INDEX "Pointage_assignmentId_idx" ON "Pointage"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_terrainToken_key" ON "TeamMember"("terrainToken");

-- AddForeignKey
ALTER TABLE "Pointage" ADD CONSTRAINT "Pointage_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pointage" ADD CONSTRAINT "Pointage_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pointage" ADD CONSTRAINT "Pointage_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

