const GRAPH_API_VERSION = "v18.0";

export type WhatsappResult = { ok: true } | { ok: false; error: string };

/** Numéro international : "+" optionnel puis 8 à 15 chiffres (format E.164 assoupli). */
export function isInternationalPhone(phone: string): boolean {
  return /^\+?[1-9]\d{7,14}$/.test(phone.replace(/[\s.-]/g, ""));
}

async function parseGraphError(res: Response): Promise<string> {
  const data = await res.json().catch(() => null);
  return data?.error?.message || `Erreur de l'API WhatsApp (${res.status})`;
}

/** Envoie un message texte via l'API WhatsApp Business (Meta Graph API). */
export async function sendWhatsappMessage(
  phoneId: string,
  token: string,
  to: string,
  message: string
): Promise<WhatsappResult> {
  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: message } }),
    });
    if (!res.ok) return { ok: false, error: await parseGraphError(res) };
    return { ok: true };
  } catch {
    return { ok: false, error: "Impossible de joindre l'API WhatsApp — réessayez." };
  }
}

/** Vérifie que le Phone Number ID et le token sont valides, sans envoyer de message (lecture seule). */
export async function testWhatsappConnection(
  phoneId: string,
  token: string
): Promise<{ ok: true; displayName: string | null } | { ok: false; error: string }> {
  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneId}?fields=verified_name,display_phone_number`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return { ok: false, error: await parseGraphError(res) };
    const data = await res.json();
    return { ok: true, displayName: data?.verified_name || data?.display_phone_number || null };
  } catch {
    return { ok: false, error: "Impossible de joindre l'API WhatsApp — réessayez." };
  }
}
