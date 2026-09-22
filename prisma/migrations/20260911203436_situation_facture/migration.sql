-- CreateTable
CREATE TABLE "SituationFacture" (
    "id" TEXT NOT NULL,
    "devisId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "pourcentageAvancement" DOUBLE PRECISION NOT NULL,
    "montantHT" DOUBLE PRECISION NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'brouillon',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SituationFacture_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SituationFacture_devisId_idx" ON "SituationFacture"("devisId");

-- CreateIndex
CREATE INDEX "SituationFacture_businessId_idx" ON "SituationFacture"("businessId");

-- AddForeignKey
ALTER TABLE "SituationFacture" ADD CONSTRAINT "SituationFacture_devisId_fkey" FOREIGN KEY ("devisId") REFERENCES "Devis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SituationFacture" ADD CONSTRAINT "SituationFacture_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

