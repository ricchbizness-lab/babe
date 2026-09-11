import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateFacturX } from "@/lib/facturx";
import { invoiceNumber, sortByAcceptedDate } from "@/lib/facturation";
import { computeDevisTotals, tvaByRate } from "@/lib/devisTotals";
import { suggestedTvaRate } from "@/lib/tva";
import { requireSession, requireBusinessId, ForbiddenError, ownershipErrorToStatus } from "@/lib/ownership";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    const situation = await prisma.situationFacture.findUnique({
      where: { id: params.id },
      include: { devis: { include: { client: true, lines: { orderBy: { createdAt: "asc" } } } } },
    });
    if (!situation || situation.businessId !== businessId) {
      throw new ForbiddenError("Ressource introuvable ou non autorisée");
    }
    if (situation.statut !== "payee") {
      return NextResponse.json({ error: "La Factur-X n'est disponible que pour une situation payée." }, { status: 400 });
    }

    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) {
      return NextResponse.json({ error: "Profil entreprise introuvable" }, { status: 404 });
    }

    const devis = situation.devis;
    const remisePct = devis.remise || 0;
    const totalDevisHT = devis.lines.length > 0 ? computeDevisTotals(devis.lines, remisePct).totalHT : devis.amount || 0;
    // Le montant de la situation peut avoir été ajusté manuellement — on
    // répartit ce montant réel (et non le % théorique) sur les taux de TVA
    // du devis au prorata, pour rester exact même après ajustement.
    const scale = totalDevisHT > 0 ? situation.montantHT / totalDevisHT : 1;

    const buckets = devis.lines.length > 0 ? tvaByRate(devis.lines, remisePct) : [];
    const situationLines =
      buckets.length > 0
        ? buckets.map((b) => ({
            id: `${situation.id}-${b.rate}`,
            description: `Situation n°${situation.numero} (${situation.pourcentageAvancement}% d'avancement) — ${devis.label}`,
            quantite: 1,
            prixUnitaire: b.base * scale,
            tva: b.rate,
            unite: null,
          }))
        : [
            {
              id: situation.id,
              description: `Situation n°${situation.numero} (${situation.pourcentageAvancement}% d'avancement) — ${devis.label}`,
              quantite: 1,
              prixUnitaire: situation.montantHT,
              tva: suggestedTvaRate(devis.typeTravauxTVA, devis.clientTypeTVA),
              unite: null,
            },
          ];

    const accepted = await prisma.devis.findMany({ where: { businessId, status: "accepte" }, select: { id: true, updatedAt: true } });
    const chronological = sortByAcceptedDate(accepted.map((d) => ({ id: d.id, updatedAt: d.updatedAt.toISOString() })));
    const index = chronological.findIndex((d) => d.id === devis.id);
    const devisNumero = invoiceNumber(index === -1 ? 0 : index, devis.updatedAt.toISOString());
    const numero = `${devisNumero}-S${situation.numero}`;

    const pdfBytes = await generateFacturX({
      numero,
      date: situation.createdAt.toISOString(),
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
      label: `${devis.label} — situation n°${situation.numero}`,
      description: null,
      lines: situationLines,
      fallbackAmountHT: null,
      remisePct: 0,
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="situation-${numero}.pdf"`,
      },
    });
  } catch (err) {
    console.error("Erreur /api/situations/[id]/facturx:", err);
    const { status, message } = ownershipErrorToStatus(err);
    if (status !== 500) return NextResponse.json({ error: message }, { status });
    return NextResponse.json({ error: "Erreur lors de la génération de la Factur-X" }, { status: 500 });
  }
}
