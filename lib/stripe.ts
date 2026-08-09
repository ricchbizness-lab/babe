import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("STRIPE_SECRET_KEY manquant — les routes Stripe échoueront tant qu'il n'est pas défini.");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-06-20",
});

// Tarification à plat par entreprise (voir NOVA_Concept_v4_Plateforme.md) —
// pas de facturation par utilisateur/collaborateur au lancement.
export const PLAN_PRICE_IDS: Record<string, string | undefined> = {
  essentiel: process.env.STRIPE_PRICE_ESSENTIEL,
  pro: process.env.STRIPE_PRICE_PRO,
  premium: process.env.STRIPE_PRICE_PREMIUM,
};
