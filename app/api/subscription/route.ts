import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, ownershipErrorToStatus } from "@/lib/ownership";

export async function GET() {
  try {
    const { userId } = await requireSession();
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      select: { plan: true, status: true, currentPeriodEnd: true },
    });
    return NextResponse.json({ subscription });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}
