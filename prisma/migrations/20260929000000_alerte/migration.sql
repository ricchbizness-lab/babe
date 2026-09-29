-- CreateTable
CREATE TABLE "Alerte" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "priorite" TEXT NOT NULL,
    "lien" TEXT,
    "lu" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alerte_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Alerte_businessId_idx" ON "Alerte"("businessId");

-- CreateIndex
CREATE INDEX "Alerte_lu_idx" ON "Alerte"("lu");

-- AddForeignKey
ALTER TABLE "Alerte" ADD CONSTRAINT "Alerte_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

