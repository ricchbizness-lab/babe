-- AlterTable
ALTER TABLE "Devis" ADD COLUMN     "clientTypeTVA" TEXT NOT NULL DEFAULT 'professionnel',
ADD COLUMN     "typeTravauxTVA" TEXT NOT NULL DEFAULT 'neuf';

