import { prisma } from "@/lib/prisma";

/**
 * Données de la page publique de signature (/signature/[token]) — même
 * principe que getPortalData pour le portail client : un seul endroit qui
 * décide ce qui est renvoyé pour un accès sans compte.
 */
export async function getSignatureRequestData(token: string) {
  const request = await prisma.signatureRequest.findUnique({
    where: { token },
    include: {
      devis: {
        include: {
          lines: { orderBy: { createdAt: "asc" } },
          client: { select: { name: true, email: true, phone: true, address: true } },
        },
      },
      business: {
        select: { name: true, siret: true, address: true, logoBase64: true, conditionsPaiement: true },
      },
    },
  });
  return request;
}

export type SignatureRequestData = NonNullable<Awaited<ReturnType<typeof getSignatureRequestData>>>;
