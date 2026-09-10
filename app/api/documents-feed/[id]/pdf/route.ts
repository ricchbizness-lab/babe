import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSimpleTextPDF } from "@/lib/facturx";
import { requireSession, requireBusinessId, assertOwnedByBusiness, ownershipErrorToStatus } from "@/lib/ownership";

const DOCUMENT_TYPE_LABEL: Record<string, string> = { brief: "Brief", marketing: "Contenu marketing", conseil: "Conseil" };

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    const dash = params.id.indexOf("-");
    const kind = params.id.slice(0, dash);
    const rawId = params.id.slice(dash + 1);
    if (!kind || !rawId) {
      return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
    }

    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) {
      return NextResponse.json({ error: "Profil entreprise introuvable" }, { status: 404 });
    }

    let pdfInput: { title: string; meta: string; content: string } | null = null;

    if (kind === "doc") {
      const doc = await assertOwnedByBusiness(await prisma.document.findUnique({ where: { id: rawId } }), businessId);
      pdfInput = {
        title: doc.title,
        meta: `${DOCUMENT_TYPE_LABEL[doc.type] || doc.type} — ${doc.createdAt.toLocaleDateString("fr-FR")}`,
        content: doc.content,
      };
    } else if (kind === "devis" || kind === "facture") {
      const devis = await assertOwnedByBusiness(
        await prisma.devis.findUnique({ where: { id: rawId }, include: { client: true } }),
        businessId
      );
      pdfInput = {
        title: devis.label,
        meta: `${devis.client?.name || "Sans client"} — ${devis.createdAt.toLocaleDateString("fr-FR")}`,
        content: devis.content || devis.description || "Aucun contenu généré pour ce devis.",
      };
    } else if (kind === "rapport") {
      const report = await assertOwnedByBusiness(await prisma.voiceReport.findUnique({ where: { id: rawId } }), businessId);
      pdfInput = {
        title: `Rapport — ${report.authorLabel}`,
        meta: report.createdAt.toLocaleDateString("fr-FR"),
        content: report.summary,
      };
    } else {
      return NextResponse.json({ error: "Aucun PDF disponible pour ce type d'élément" }, { status: 400 });
    }

    const pdfBytes = await generateSimpleTextPDF({ ...pdfInput, businessName: business.name });

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${params.id}.pdf"`,
      },
    });
  } catch (err) {
    console.error("Erreur /api/documents-feed/[id]/pdf:", err);
    const { status, message } = ownershipErrorToStatus(err);
    if (status !== 500) return NextResponse.json({ error: message }, { status });
    return NextResponse.json({ error: "Erreur lors de la génération du PDF" }, { status: 500 });
  }
}
