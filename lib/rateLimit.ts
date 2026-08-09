/**
 * Rate limiting en mémoire — suffisant pour un MVP sur une seule instance,
 * PAS suffisant en production sur une plateforme serverless multi-instance
 * (chaque instance a sa propre mémoire, la limite n'est donc pas globale).
 *
 * Avant mise en production réelle : remplacer par un store partagé,
 * par exemple Upstash Ratelimit (Redis), qui fonctionne correctement à
 * travers plusieurs instances serverless.
 */

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

/** Identifiant de requête à utiliser pour la clé de rate limit (IP, à défaut d'autre chose en dev). */
export function getRequestKey(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || "unknown";
}
