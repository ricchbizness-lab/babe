import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, requireBusinessId, assertOwnedByBusiness, ownershipErrorToStatus } from "@/lib/ownership";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    await assertOwnedByBusiness(await prisma.devis.findUnique({ where: { id: params.id } }), businessId);

    const signatureRequests = await prisma.signatureRequest.findMany({
      where: { devisId: params.id, businessId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ signatureRequests });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}

/** Génère (ou réutilise, si une demande non signée existe déjà) le lien de signature du devis envoyé. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    const devis = await assertOwnedByBusiness(await prisma.devis.findUnique({ where: { id: params.id } }), businessId);

    if (devis.status !== "envoye") {
      return NextResponse.json(
        { error: "Ce devis doit être au statut « envoyé » pour demander une signature." },
        { status: 400 }
      );
    }

    const existing = await prisma.signatureRequest.findFirst({
      where: { devisId: devis.id, businessId, signedAt: null },
      orderBy: { createdAt: "desc" },
    });

    const signatureRequest =
      existing ??
      (await prisma.signatureRequest.create({
        data: { devisId: devis.id, businessId, token: crypto.randomUUID() },
      }));

    const url = `${new URL(req.url).origin}/signature/${signatureRequest.token}`;
    return NextResponse.json({ signatureRequest, url }, { status: existing ? 200 : 201 });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}
