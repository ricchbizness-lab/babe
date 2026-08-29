import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { projectPhotoSchema } from "@/lib/validation";
import { requireSession, requireBusinessId, assertOwnedByBusiness, ownershipErrorToStatus } from "@/lib/ownership";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    const project = await assertOwnedByBusiness(await prisma.project.findUnique({ where: { id: params.id } }), businessId);

    const photos = await prisma.projectPhoto.findMany({ where: { projectId: project.id }, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ photos });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    const project = await assertOwnedByBusiness(await prisma.project.findUnique({ where: { id: params.id } }), businessId);

    const body = await req.json();
    const parsed = projectPhotoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const photo = await prisma.projectPhoto.create({
      data: { imageBase64: parsed.data.imageBase64, caption: parsed.data.caption, projectId: project.id },
    });
    return NextResponse.json({ photo }, { status: 201 });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}
