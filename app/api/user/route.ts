import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { userSchema } from "@/lib/validation";
import { requireSession, ownershipErrorToStatus } from "@/lib/ownership";

export async function GET() {
  try {
    const { userId } = await requireSession();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true },
    });
    return NextResponse.json({ user });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: Request) {
  try {
    const { userId } = await requireSession();
    const body = await req.json();
    const parsed = userSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    // Toujours scopé sur l'utilisateur de la session — impossible de
    // modifier le profil de quelqu'un d'autre, par construction.
    const user = await prisma.user.update({
      where: { id: userId },
      data: parsed.data,
      select: { id: true, email: true, firstName: true, lastName: true },
    });
    return NextResponse.json({ user });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}
