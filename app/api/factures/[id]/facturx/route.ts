import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateFacturX } from "@/lib/facturx";
import { invoiceNumber, sortByAcceptedDate } from "@/lib/facturation";
import { requireSession, requireBusinessId, assertOwnedByBusiness, ownershipErrorToStatus } from "@/lib/ownership";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    const devis = await assertOwnedByBusiness(
      await prisma.devis.findUnique({
        where: { id: params.id },
        include: { client: true, lines: { orderBy: { createdAt: "asc" } } },
      }),
      businessId
    );

    if (devis.status !== "accepte") {
      return NextResponse.json({ error: "Ce devis n'est pas encore accepté — pas de facture Factur-X tant que le statut n'est pas « accepté »." }, { status: 400 });
    }

    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) {
      return NextResponse.json({ error: "Profil entreprise introuvable" }, { status: 404 });
    }

    const accepted = await prisma.devis.findMany({ where: { businessId, status: "accepte" }, select: { id: true, updatedAt: true } });
    const chronological = sortByAcceptedDate(accepted.map((d) => ({ id: d.id, updatedAt: d.updatedAt.toISOString() })));
    const index = chronological.findIndex((d) => d.id === devis.id);
    const numero = invoiceNumber(index === -1 ? 0 : index, devis.updatedAt.toISOString());

    const pdfBytes = await generateFacturX({
      numero,
      date: devis.updatedAt.toISOString(),
      business: {
        name: business.name,
        siret: business.siret,
        address: business.address,
        codeAPE: business.codeAPE,
        logoBase64: business.logoBase64,
        conditionsPaiement: business.conditionsPaiement,
      },
      client: devis.client
        ? { name: devis.client.name, email: devis.client.email, address: devis.client.address }
        : null,
      label: devis.label,
      description: devis.description,
      lines: devis.lines,
      fallbackAmountHT: devis.amount,
      remisePct: devis.remise || 0,
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="facture-${numero}.pdf"`,
      },
    });
  } catch (err) {
    console.error("Erreur /api/factures/[id]/facturx:", err);
    const { status, message } = ownershipErrorToStatus(err);
    if (status !== 500) return NextResponse.json({ error: message }, { status });
    return NextResponse.json({ error: "Erreur lors de la génération de la facture Factur-X" }, { status: 500 });
  }
}
