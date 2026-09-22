import { Construction, Droplet, Flame, Grid3x3, Home, PaintBucket, Ruler, Wrench, Zap, type LucideIcon } from "lucide-react";
import type { BadgeTone } from "@/components/ui";

export const METIERS = [
  "plomberie",
  "electricite",
  "maconnerie",
  "peinture",
  "menuiserie",
  "carrelage",
  "chauffage",
  "toiture",
  "autre",
] as const;
export type Metier = (typeof METIERS)[number];

export const METIER_LABEL: Record<Metier, string> = {
  plomberie: "Plomberie",
  electricite: "Électricité",
  maconnerie: "Maçonnerie",
  peinture: "Peinture",
  menuiserie: "Menuiserie",
  carrelage: "Carrelage",
  chauffage: "Chauffage",
  toiture: "Toiture",
  autre: "Autre",
};

export const METIER_ICON: Record<Metier, LucideIcon> = {
  plomberie: Droplet,
  electricite: Zap,
  maconnerie: Construction,
  peinture: PaintBucket,
  menuiserie: Ruler,
  carrelage: Grid3x3,
  chauffage: Flame,
  toiture: Home,
  autre: Wrench,
};

/** Couleur d'accent par métier (module B4/sprint 1 point 3) — puisée dans la palette de tons déjà existante (jamais de couleur hors charte). */
export const METIER_TONE: Record<Metier, BadgeTone> = {
  plomberie: "blue",
  electricite: "amber",
  maconnerie: "neutral",
  peinture: "teal",
  menuiserie: "success",
  carrelage: "blue",
  chauffage: "amber",
  toiture: "neutral",
  autre: "teal",
};
