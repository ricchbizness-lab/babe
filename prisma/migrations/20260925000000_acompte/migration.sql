-- CreateTable
CREATE TABLE "Acompte" (
    "id" TEXT NOT NULL,
    "devisId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "pourcentage" DOUBLE PRECISION NOT NULL,
    "montantHT" DOUBLE PRECISION NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'en_attente',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Acompte_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Acompte_devisId_idx" ON "Acompte"("devisId");

-- CreateIndex
CREATE INDEX "Acompte_businessId_idx" ON "Acompte"("businessId");

-- AddForeignKey
ALTER TABLE "Acompte" ADD CONSTRAINT "Acompte_devisId_fkey" FOREIGN KEY ("devisId") REFERENCES "Devis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Acompte" ADD CONSTRAINT "Acompte_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

