import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "8 caractères minimum"),
});

export const userSchema = z.object({
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  langue: z.enum(["fr", "en", "ar", "pt"]).optional(),
});

export const businessSchema = z.object({
  name: z.string().min(1).max(200),
  sector: z.string().min(1).max(200),
  mission: z.string().max(1000).optional(),
  tone: z.enum(["pro", "chaleureux", "direct"]).default("pro"),
  tauxHoraire: z.number().min(0).max(1000).default(40),
  accountantEmail: z.string().email().optional().or(z.literal("")),
  address: z.string().max(300).optional(),
  siret: z.string().max(20).optional(),
  formeJuridique: z.string().max(50).optional(),
  capitalSocial: z.number().min(0).optional(),
  codeAPE: z.string().max(10).optional(),
  conditionsPaiement: z.string().max(500).optional(),
  logoBase64: z.string().max(2_900_000).optional().or(z.literal("")),
  metier: z.enum(["plomberie", "electricite", "maconnerie", "peinture", "menuiserie", "carrelage", "chauffage", "toiture", "autre"]).optional(),
});

export const clientSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(30).optional(),
  address: z.string().max(300).optional(),
  notes: z.string().max(2000).optional(),
  typeClient: z.enum(["particulier", "professionnel", "collectivite"]).default("particulier"),
});

export const projectSchema = z.object({
  name: z.string().min(1).max(200),
  clientId: z.string().optional(),
  address: z.string().max(300).optional(),
  status: z.enum(["planifie", "en_cours", "termine", "annule"]).default("planifie"),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  budgetPrevu: z.number().min(0).optional(),
  photoCouverture: z.string().max(2_900_000).optional().or(z.literal("")),
});

export const projectStepSchema = z.object({
  title: z.string().min(1).max(200),
  status: z.enum(["a_faire", "en_cours", "termine"]).default("a_faire"),
  // Pas de défaut ici volontairement : l'absence d'ordre signale à la route
  // POST qu'elle doit calculer l'ajout en fin de liste, plutôt que de tout
  // caler silencieusement à 0.
  order: z.number().int().min(0).optional(),
});

export const projectStepUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  status: z.enum(["a_faire", "en_cours", "termine"]).optional(),
  order: z.number().int().min(0).optional(),
});

export const projectPhotoSchema = z.object({
  imageBase64: z.string().min(1).max(2_900_000),
  caption: z.string().max(300).optional(),
});

export const devisLineSchema = z.object({
  type: z.enum(["prestation", "materiel", "deplacement", "maindoeuvre", "autre"]),
  description: z.string().min(1).max(500),
  quantite: z.number().min(0).default(1),
  unite: z.string().max(20).optional(),
  prixUnitaire: z.number().min(0),
  tva: z.number().min(0).max(100).default(20),
});

export const devisLineUpdateSchema = devisLineSchema.partial();

export const devisSchema = z.object({
  label: z.string().min(1).max(200),
  clientId: z.string().optional(),
  description: z.string().max(2000).optional(),
  amount: z.number().min(0).optional(),
  content: z.string().max(20000).optional(),
  remise: z.number().min(0).max(100).optional(),
  notesDevis: z.string().max(2000).optional(),
  typeTravauxTVA: z.enum(["neuf", "renovation", "energie", "entretien"]).default("neuf"),
  clientTypeTVA: z.enum(["particulier", "professionnel", "collectivite"]).default("professionnel"),
  lines: z.array(devisLineSchema).optional(),
});

export const devisUpdateSchema = z.object({
  status: z.enum(["brouillon", "envoye", "accepte", "refuse"]).optional(),
  paymentStatus: z.enum(["en_attente", "payee", "en_retard"]).optional(),
  label: z.string().min(1).max(200).optional(),
  amount: z.number().min(0).optional(),
  content: z.string().max(20000).optional(),
  remise: z.number().min(0).max(100).optional(),
  notesDevis: z.string().max(2000).optional(),
  typeTravauxTVA: z.enum(["neuf", "renovation", "energie", "entretien"]).optional(),
  clientTypeTVA: z.enum(["particulier", "professionnel", "collectivite"]).optional(),
});

export const situationFactureSchema = z.object({
  pourcentageAvancement: z.number().min(0).max(100),
  montantHT: z.number().min(0),
});

export const situationFactureUpdateSchema = z.object({
  pourcentageAvancement: z.number().min(0).max(100).optional(),
  montantHT: z.number().min(0).optional(),
  statut: z.enum(["brouillon", "envoyee", "payee"]).optional(),
});

export const OUVRAGE_TYPES = ["plomberie", "electricite", "maconnerie", "peinture", "sol", "menuiserie", "autre"] as const;

export const OUVRAGE_TYPE_LABEL: Record<(typeof OUVRAGE_TYPES)[number], string> = {
  plomberie: "Plomberie",
  electricite: "Électricité",
  maconnerie: "Maçonnerie",
  peinture: "Peinture",
  sol: "Sol",
  menuiserie: "Menuiserie",
  autre: "Autre",
};

export const ouvrageTypeSchema = z.object({
  label: z.string().min(1).max(200),
  type: z.enum(OUVRAGE_TYPES),
  unite: z.string().min(1).max(20),
  prixUnitaireHT: z.number().min(0),
  tvaDefaut: z.number().min(0).max(100).default(20),
  description: z.string().max(500).optional(),
});

export const ouvrageTypeUpdateSchema = ouvrageTypeSchema.partial();

export const taskSchema = z.object({
  text: z.string().min(1).max(500),
  projectId: z.string().optional(),
  dueDate: z.string().datetime().optional(),
});

export const taskUpdateSchema = z.object({
  done: z.boolean().optional(),
  text: z.string().min(1).max(500).optional(),
  dueDate: z.string().datetime().optional(),
});

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export const agentSchema = z.object({
  module: z.enum(["brief", "devis", "marketing", "conseil", "reponse_client", "relance", "relance_devis", "analyse"]),
  input: z.record(z.string(), z.unknown()).optional(),
});

export const teamMemberSchema = z.object({
  name: z.string().min(1).max(200),
  role: z.string().max(200).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(30).optional(),
});

export const assignmentSchema = z.object({
  teamMemberId: z.string(),
  projectId: z.string().optional(),
  date: z.string().datetime(),
  note: z.string().max(500).optional(),
});

export const teamMemberUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  role: z.string().max(200).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(30).optional(),
});

export const assignmentUpdateSchema = z.object({
  projectId: z.string().optional(),
  date: z.string().datetime().optional(),
  note: z.string().max(500).optional(),
});

export const supplierSchema = z.object({
  name: z.string().min(1).max(200),
  contact: z.string().max(200).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(30).optional(),
  category: z.string().max(100).optional(),
});

export const supplierUpdateSchema = supplierSchema.partial();

export const purchaseSchema = z.object({
  supplierId: z.string(),
  projectId: z.string().optional(),
  description: z.string().min(1).max(500),
  amount: z.number().min(0),
  status: z.enum(["en_attente", "en_cours", "recu", "annule"]).default("en_attente"),
  orderDate: z.string().datetime().optional(),
  expectedDate: z.string().datetime().optional(),
});

export const purchaseUpdateSchema = z.object({
  supplierId: z.string().optional(),
  projectId: z.string().optional(),
  description: z.string().min(1).max(500).optional(),
  amount: z.number().min(0).optional(),
  status: z.enum(["en_attente", "en_cours", "recu", "annule"]).optional(),
  orderDate: z.string().datetime().optional(),
  expectedDate: z.string().datetime().optional(),
});

export const voiceReportSchema = z.object({
  projectId: z.string().optional(),
  authorLabel: z.string().min(1).max(200),
  // Mode démo : texte direct. Mode production : audio envoyé en base64,
  // transcrit à la volée (voir lib/transcription.ts), jamais stocké tel quel.
  transcriptText: z.string().min(1).max(5000).optional(),
  audioBase64: z.string().optional(),
  audioMimeType: z.string().optional(),
}).refine((d) => d.transcriptText || d.audioBase64, {
  message: "Fournir soit transcriptText (démo), soit audioBase64 (production).",
});

export const attachmentSchema = z.object({
  name: z.string().min(1).max(200),
  fileBase64: z.string().min(1).max(2_900_000),
  mimeType: z.enum(["application/pdf", "image/png", "image/jpeg"]),
  category: z.enum(["contrat", "attestation", "photo", "autre"]),
});
