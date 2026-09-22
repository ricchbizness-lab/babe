-- CreateTable
CREATE TABLE "AttestationTVA" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "devisId" TEXT,
    "adresseTravaux" TEXT NOT NULL,
    "dateConstruction" TEXT NOT NULL,
    "typeLogement" TEXT NOT NULL,
    "usageLogement" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttestationTVA_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AttestationTVA_businessId_idx" ON "AttestationTVA"("businessId");

-- CreateIndex
CREATE INDEX "AttestationTVA_clientId_idx" ON "AttestationTVA"("clientId");

-- CreateIndex
CREATE INDEX "AttestationTVA_devisId_idx" ON "AttestationTVA"("devisId");

-- AddForeignKey
ALTER TABLE "AttestationTVA" ADD CONSTRAINT "AttestationTVA_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttestationTVA" ADD CONSTRAINT "AttestationTVA_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttestationTVA" ADD CONSTRAINT "AttestationTVA_devisId_fkey" FOREIGN KEY ("devisId") REFERENCES "Devis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

