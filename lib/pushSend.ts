import webPush from "web-push";
import { prisma } from "@/lib/prisma";

/**
 * Envoi de notifications push (web-push / VAPID) — utilisé par
 * /api/push/notify et directement par /api/alertes/generer (appel de
 * fonction partagée plutôt qu'un aller-retour HTTP interne vers sa propre
 * route). Reprend les mêmes variables d'environnement que l'abonnement
 * client existant (lib/push.ts, dashboard/parametres) :
 * NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY.
 */

let configured = false;

function ensureConfigured(): boolean {
  if (configured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  webPush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:contact@nova-app.fr", publicKey, privateKey);
  configured = true;
  return true;
}

export type PushPayload = { title: string; body: string; url?: string };

/** Envoie une notification à tous les abonnements push de l'utilisateur — silencieux si les clés VAPID ne sont pas configurées pour cet environnement. */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!ensureConfigured()) return;

  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webPush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        );
      } catch (err) {
        // Abonnement expiré ou révoqué côté navigateur — on le supprime pour
        // ne pas réessayer indéfiniment contre un endpoint mort.
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          console.error("Erreur envoi push:", err);
        }
      }
    })
  );
}
