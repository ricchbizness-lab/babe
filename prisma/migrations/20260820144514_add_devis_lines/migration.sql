-- AlterTable
ALTER TABLE "Devis" ADD COLUMN     "notesDevis" TEXT,
ADD COLUMN     "remise" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "DevisLine" (
    "id" TEXT NOT NULL,
    "devisId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantite" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unite" TEXT,
    "prixUnitaire" DOUBLE PRECISION NOT NULL,
    "tva" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DevisLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DevisLine_devisId_idx" ON "DevisLine"("devisId");

-- AddForeignKey
ALTER TABLE "DevisLine" ADD CONSTRAINT "DevisLine_devisId_fkey" FOREIGN KEY ("devisId") REFERENCES "Devis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

