import { NextResponse } from "next/server";
import { diagnosticSchema, estimateDiagnostic } from "@/lib/diagnostic";
import { checkRateLimit, getRequestKey } from "@/lib/rateLimit";

// Route publique, volontairement sans authentification : c'est le point
// d'entrée avant tout compte, tout paiement, toute connexion de données.
export async function POST(req: Request) {
  const key = `diagnostic:${getRequestKey(req)}`;
  if (!checkRateLimit(key, 20, 60_000)) {
    return NextResponse.json({ error: "Trop de tentatives, réessayez dans un instant." }, { status: 429 });
  }

  const body = await req.json();
  const parsed = diagnosticSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const estimation = estimateDiagnostic(parsed.data);
  return NextResponse.json({ estimation });
}
