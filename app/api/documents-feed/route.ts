import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, requireBusinessId, ownershipErrorToStatus } from "@/lib/ownership";

export type FeedItem = {
  id: string;
  tab: "chantiers" | "devis" | "factures" | "rapports";
  kind: "document" | "photo" | "devis" | "facture" | "rapport" | "attachment";
  title: string;
  subtitle: string;
  preview: string | null;
  /** Contenu complet (texte), pour l'affichage dans la modale de détail — absent pour photo/attachment. */
  content: string | null;
  imagePreview: string | null;
  date: string;
  href: string;
  /** Uniquement pour kind === "attachment" : fichier uploadé, pas de contenu généré à afficher/télécharger en PDF. */
  fileBase64?: string;
  mimeType?: string;
};

// Agrège en une seule réponse tout ce qui ressemble à un "document" dans
// l'app aujourd'hui : contenus générés (Document), photos de chantier
// (ProjectPhoto), devis/factures (Devis), rapports vocaux (VoiceReport) et
// pièces jointes uploadées (Attachment). Pas de nouveau modèle pour les 4
// premiers — uniquement de la lecture combinée, plafonnée à 50 éléments par
// source pour éviter un payload illimité.
export async function GET() {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    const [documents, photos, devis, voiceReports, attachments] = await Promise.all([
      prisma.document.findMany({ where: { businessId }, orderBy: { createdAt: "desc" }, take: 50 }),
      prisma.projectPhoto.findMany({
        where: { project: { businessId } },
        include: { project: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.devis.findMany({
        where: { businessId },
        include: { client: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.voiceReport.findMany({
        where: { businessId },
        include: { project: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.attachment.findMany({ where: { businessId }, orderBy: { createdAt: "desc" }, take: 50 }),
    ]);

    const DOCUMENT_TYPE_LABEL: Record<string, string> = { brief: "Brief", marketing: "Contenu marketing", conseil: "Conseil" };
    const ATTACHMENT_CATEGORY_LABEL: Record<string, string> = {
      contrat: "Contrat",
      attestation: "Attestation",
      photo: "Photo",
      autre: "Autre",
    };

    const items: FeedItem[] = [
      ...documents.map((d) => ({
        id: `doc-${d.id}`,
        tab: "rapports" as const,
        kind: "document" as const,
        title: d.title,
        subtitle: DOCUMENT_TYPE_LABEL[d.type] || d.type,
        preview: d.content.slice(0, 160),
        content: d.content,
        imagePreview: null,
        date: d.createdAt.toISOString(),
        href: "/dashboard/copilote",
      })),
      ...photos.map((p) => ({
        id: `photo-${p.id}`,
        tab: "chantiers" as const,
        kind: "photo" as const,
        title: p.caption || "Photo de chantier",
        subtitle: p.project.name,
        preview: null,
        content: null,
        imagePreview: p.imageBase64,
        date: p.createdAt.toISOString(),
        href: `/dashboard/chantiers/${p.project.id}`,
      })),
      ...devis
        .filter((d) => d.status !== "accepte")
        .map((d) => ({
          id: `devis-${d.id}`,
          tab: "devis" as const,
          kind: "devis" as const,
          title: d.label,
          subtitle: d.client?.name || "Sans client",
          preview: d.description || null,
          content: d.content || null,
          imagePreview: null,
          date: d.createdAt.toISOString(),
          href: `/dashboard/devis/${d.id}`,
        })),
      ...devis
        .filter((d) => d.status === "accepte")
        .map((d) => ({
          id: `facture-${d.id}`,
          tab: "factures" as const,
          kind: "facture" as const,
          title: d.label,
          subtitle: d.client?.name || "Sans client",
          preview: d.description || null,
          content: d.content || null,
          imagePreview: null,
          date: d.updatedAt.toISOString(),
          href: `/dashboard/facturation/${d.id}`,
        })),
      ...voiceReports.map((r) => ({
        id: `rapport-${r.id}`,
        tab: "rapports" as const,
        kind: "rapport" as const,
        title: `Rapport — ${r.authorLabel}`,
        subtitle: r.project?.name || "Sans chantier",
        preview: r.summary,
        content: r.summary,
        imagePreview: null,
        date: r.createdAt.toISOString(),
        href: "/dashboard/rapports-vocaux",
      })),
      ...attachments.map((a) => ({
        id: `attachment-${a.id}`,
        tab: "rapports" as const,
        kind: "attachment" as const,
        title: a.name,
        subtitle: ATTACHMENT_CATEGORY_LABEL[a.category] || a.category,
        preview: null,
        content: null,
        imagePreview: a.mimeType.startsWith("image/") ? a.fileBase64 : null,
        date: a.createdAt.toISOString(),
        href: "/dashboard/documents",
        fileBase64: a.fileBase64,
        mimeType: a.mimeType,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({ items });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}
