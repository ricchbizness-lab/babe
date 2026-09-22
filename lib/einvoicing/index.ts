import { EInvoicingConnector } from "./types";

/**
 * Aucune Plateforme Agréée n'est connectée dans cette version — voir
 * README_EINVOICING.md pour la démarche à suivre. Cette fonction lève une
 * erreur explicite plutôt que de simuler un succès, pour ne jamais laisser
 * croire que la conformité est active alors qu'elle ne l'est pas.
 */
export function getEInvoicingConnector(): EInvoicingConnector {
  throw new Error(
    "Aucune Plateforme Agréée connectée. Voir README_EINVOICING.md avant " +
    "d'activer toute fonctionnalité liée à la facturation électronique conforme."
  );
}
