import { NextResponse } from "next/server";
import { getPortalData } from "@/lib/portal";

/**
 * Route publique — volontairement AUCUN requireSession ici. C'est le
 * portail client final : le lien doit fonctionner sans compte NOVA.
 * getPortalData() est la seule source de vérité sur ce qui est exposé.
 */
export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const project = await getPortalData(params.token);
  if (!project) {
    return NextResponse.json({ error: "Lien invalide" }, { status: 404 });
  }
  return NextResponse.json({ project });
}
