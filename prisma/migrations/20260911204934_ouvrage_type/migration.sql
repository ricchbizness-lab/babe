-- CreateTable
CREATE TABLE "OuvrageType" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "unite" TEXT NOT NULL,
    "prixUnitaireHT" DOUBLE PRECISION NOT NULL,
    "tvaDefaut" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OuvrageType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OuvrageType_businessId_idx" ON "OuvrageType"("businessId");

-- AddForeignKey
ALTER TABLE "OuvrageType" ADD CONSTRAINT "OuvrageType_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

