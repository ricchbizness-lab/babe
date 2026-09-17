import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getOuvragesForMetier } from "@/lib/ouvragesByMetier";
import { METIERS } from "@/lib/metiers";
import { requireSession, requireBusinessId, ownershipErrorToStatus } from "@/lib/ownership";

const schema = z.object({ metier: z.enum(METIERS) });

/** Action explicite depuis les paramètres ("mettre à jour la bibliothèque") — additive, n'écrase jamais les ouvrages existants, contrairement au pré-remplissage automatique à l'onboarding qui ne joue que sur une bibliothèque vide. */
export async function POST(req: Request) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const toCreate = getOuvragesForMetier(parsed.data.metier);
    await prisma.ouvrageType.createMany({
      data: toCreate.map((o) => ({ ...o, businessId })),
    });

    return NextResponse.json({ added: toCreate.length });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}
