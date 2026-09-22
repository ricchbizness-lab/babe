import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "./prisma";

/**
 * Couche d'autorisation centralisée.
 *
 * L'audit de sécurité du premier prototype NOVA a identifié une faille IDOR
 * (Broken Object Level Authorization, OWASP API1) : plusieurs routes
 * vérifiaient qu'un utilisateur était connecté, mais jamais que l'objet
 * manipulé (tâche, document, devis...) appartenait bien à son entreprise.
 *
 * Règle du projet : AUCUNE route API ne doit faire un update/delete Prisma
 * sans passer par `requireBusinessId` puis filtrer la requête sur
 * `businessId`. Ne jamais faire `prisma.task.update({ where: { id } })`
 * seul — toujours `where: { id, businessId }`.
 */

export class UnauthorizedError extends Error {}
export class ForbiddenError extends Error {}

/** Retourne l'utilisateur connecté ou lève une erreur. À utiliser en tête de chaque route protégée. */
export async function requireSession() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) throw new UnauthorizedError("Non authentifié");
  return { userId, session };
}

/** Retourne le businessId de l'utilisateur connecté, ou lève une erreur s'il n'a pas encore de profil entreprise. */
export async function requireBusinessId(userId: string): Promise<string> {
  const business = await prisma.business.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!business) throw new ForbiddenError("Profil entreprise manquant");
  return business.id;
}

/**
 * Vérifie qu'un enregistrement donné appartient bien au businessId fourni,
 * avant toute lecture/modification/suppression. Lève ForbiddenError sinon.
 * Utiliser systématiquement avant un update/delete sur Task, Document,
 * Devis, Project, Client.
 */
export async function assertOwnedByBusiness<T extends { businessId: string } | null>(
  record: T,
  businessId: string
): Promise<NonNullable<T>> {
  if (!record || record.businessId !== businessId) {
    throw new ForbiddenError("Ressource introuvable ou non autorisée");
  }
  return record as NonNullable<T>;
}

/** Traduit les erreurs d'autorisation en réponses HTTP cohérentes. Utiliser dans chaque catch de route. */
export function ownershipErrorToStatus(err: unknown): { status: number; message: string } {
  if (err instanceof UnauthorizedError) return { status: 401, message: err.message };
  if (err instanceof ForbiddenError) return { status: 403, message: err.message };
  return { status: 500, message: "Erreur serveur" };
}
