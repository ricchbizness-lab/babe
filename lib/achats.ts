/** Numéro de commande achat, recalculé à la volée depuis la position chronologique — même principe que la numérotation de facture (lib/facturation.ts), jamais stocké. */
export function purchaseReference(positionZeroBased: number, orderDate: string): string {
  const year = new Date(orderDate).getFullYear();
  return `A-${year}-${String(positionZeroBased + 1).padStart(3, "0")}`;
}
