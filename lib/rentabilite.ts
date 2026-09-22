export type MargeTone = "success" | "amber" | "danger";

/** Code couleur de la marge réelle d'un chantier — vert si > 20%, orange si 10-20%, rouge si < 10% (module B3). */
export function margeTone(margePct: number): MargeTone {
  if (margePct > 20) return "success";
  if (margePct >= 10) return "amber";
  return "danger";
}
