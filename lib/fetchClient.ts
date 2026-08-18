/**
 * Wrapper de fetch() pour toutes les pages clientes du dashboard : intercepte
 * les réponses 401 (session expirée côté NextAuth) pour prévenir l'utilisateur
 * et le rediriger vers /login, au lieu de laisser chaque page échouer
 * silencieusement sur des appels API qui ne répondent plus.
 */

export const SESSION_EXPIRED_EVENT = "nova:session-expired";

export async function fetchWithAuth(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
    setTimeout(() => {
      window.location.href = "/login";
    }, 1000);
  }
  return res;
}
