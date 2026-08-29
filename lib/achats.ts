/** Numéro de commande achat, recalculé à la volée depuis la position chronologique — même principe que la numérotation de facture (lib/facturation.ts), jamais stocké. */
export function purchaseReference(positionZeroBased: number, orderDate: string): string {
  const year = new Date(orderDate).getFullYear();
  return `A-${year}-${String(positionZeroBased + 1).padStart(3, "0")}`;
}

/** Dépenses réelles d'un chantier — somme des achats non annulés qui lui sont rattachés. */
export function depensesForProject(projectId: string, purchases: { amount: number; status: string; project: { id: string } | null }[]): number {
  return purchases
    .filter((p) => p.project?.id === projectId && p.status !== "annule")
    .reduce((sum, p) => sum + p.amount, 0);
}
