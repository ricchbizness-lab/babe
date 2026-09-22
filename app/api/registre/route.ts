import { NextResponse } from "next/server";
import { computeRegistreActivite } from "@/lib/registre";
import { requireSession, requireBusinessId, ownershipErrorToStatus } from "@/lib/ownership";

export async function GET() {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);
    const registre = await computeRegistreActivite(businessId);
    return NextResponse.json({ registre });
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}
