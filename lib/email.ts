/**
 * Envoi d'email via Resend (API simple, bon niveau de délivrabilité).
 * Nécessite RESEND_API_KEY et EMAIL_FROM dans les variables d'environnement.
 * Pour changer de fournisseur (SendGrid, Postmark...), ne modifier que ce fichier.
 */

const RESEND_URL = "https://api.resend.com/emails";

export async function sendEmail(to: string[], subject: string, html: string) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error(
      "RESEND_API_KEY manquant — créer un compte sur resend.com, générer une clé API, " +
      "et l'ajouter à .env avant d'activer l'envoi de rapports."
    );
  }
  if (!process.env.EMAIL_FROM) {
    throw new Error("EMAIL_FROM manquant — adresse d'envoi à configurer (domaine vérifié sur Resend).");
  }

  const res = await fetch(RESEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, html }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Échec de l'envoi de l'email (${res.status}): ${errText}`);
  }

  return res.json();
}
