import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "8 caractères minimum"),
});

export const userSchema = z.object({
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
});

export const businessSchema = z.object({
  name: z.string().min(1).max(200),
  sector: z.string().min(1).max(200),
  mission: z.string().max(1000).optional(),
  tone: z.enum(["pro", "chaleureux", "direct"]).default("pro"),
  tauxHoraire: z.number().min(0).max(1000).default(40),
  accountantEmail: z.string().email().optional().or(z.literal("")),
  siret: z.string().max(20).optional(),
  conditionsPaiement: z.string().max(500).optional(),
  logoBase64: z.string().max(2_900_000).optional().or(z.literal("")),
});

export const clientSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(30).optional(),
  address: z.string().max(300).optional(),
  notes: z.string().max(2000).optional(),
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
});

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
