import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validation";
import { checkRateLimit, getRequestKey } from "@/lib/rateLimit";

export async function POST(req: Request) {
  // Limite le risque d'énumération de comptes / brute-force sur l'inscription.
  const key = `register:${getRequestKey(req)}`;
  if (!checkRateLimit(key, 5, 60_000)) {
    return NextResponse.json({ error: "Trop de tentatives, réessayez dans une minute." }, { status: 429 });
  }

  const body = await req.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Réponse volontairement générique pour limiter l'énumération de comptes.
    return NextResponse.json({ error: "Impossible de créer ce compte." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const user = await prisma.user.create({
    data: { email, passwordHash },
  });

  return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
}
