/**
 * Interface générique de connexion à une Plateforme Agréée (PDP) pour la
 * conformité facturation électronique.
 *
 * IMPORTANT — à la différence de la transcription audio ou de l'envoi
 * d'email, ce module ne peut PAS être rendu fonctionnel avec une simple clé
 * API achetée en ligne. Voir README_EINVOICING.md pour la démarche réelle.
 */
export interface EInvoicingConnector {
  /** Envoie une facture au format structuré requis par la réforme (Factur-X/UBL/CII) vers un client donné. */
  sendInvoice(params: {
    devisId: string;
    clientSiret?: string;
    amount: number;
    label: string;
  }): Promise<{ externalId: string; status: string }>;

  /** Récupère les factures reçues depuis la dernière synchronisation. */
  getReceivedInvoices(since: Date): Promise<Array<{ externalId: string; amount: number; issuer: string; receivedAt: Date }>>;
}
