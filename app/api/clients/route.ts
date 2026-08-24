import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clientSchema } from "@/lib/validation";
import { requireSession, requireBusinessId, ownershipErrorToStatus } from "@/lib/ownership";

export async function GET(req: Request) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);
    const search = new URL(req.url).searchParams.get("search")?.trim();
    const clients = await prisma.client.findMany({
      where: search
        ? {
            businessId,
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
            ],
          }
        : { businessId },
      include: {
        devis: { select: { amount: true, status: true } },
        projects: { select: { status: true } },
      },
      orderBy: { createdAt: "desc" },
      take: search ? 8 : undefined,
    });
    return NextResponse.json({ clients });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);
    const body = await req.json();
    const parsed = clientSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const client = await prisma.client.create({
      data: { ...parsed.data, businessId },
    });
    return NextResponse.json({ client }, { status: 201 });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}
