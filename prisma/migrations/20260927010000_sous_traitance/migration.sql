-- CreateTable
CREATE TABLE "SousTraitant" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "siret" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "specialty" TEXT NOT NULL,
    "tvaIntracom" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SousTraitant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContratSousTraitance" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "sousTraitantId" TEXT NOT NULL,
    "projectId" TEXT,
    "devisId" TEXT,
    "description" TEXT NOT NULL,
    "montantHT" DOUBLE PRECISION NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'en_cours',
    "dateDebut" TIMESTAMP(3),
    "dateFin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContratSousTraitance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SousTraitant_businessId_idx" ON "SousTraitant"("businessId");

-- CreateIndex
CREATE INDEX "ContratSousTraitance_businessId_idx" ON "ContratSousTraitance"("businessId");

-- CreateIndex
CREATE INDEX "ContratSousTraitance_sousTraitantId_idx" ON "ContratSousTraitance"("sousTraitantId");

-- CreateIndex
CREATE INDEX "ContratSousTraitance_projectId_idx" ON "ContratSousTraitance"("projectId");

-- CreateIndex
CREATE INDEX "ContratSousTraitance_devisId_idx" ON "ContratSousTraitance"("devisId");

-- AddForeignKey
ALTER TABLE "SousTraitant" ADD CONSTRAINT "SousTraitant_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContratSousTraitance" ADD CONSTRAINT "ContratSousTraitance_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContratSousTraitance" ADD CONSTRAINT "ContratSousTraitance_sousTraitantId_fkey" FOREIGN KEY ("sousTraitantId") REFERENCES "SousTraitant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContratSousTraitance" ADD CONSTRAINT "ContratSousTraitance_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContratSousTraitance" ADD CONSTRAINT "ContratSousTraitance_devisId_fkey" FOREIGN KEY ("devisId") REFERENCES "Devis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

