import { NextResponse } from "next/server";
import { parsePeriod } from "@/lib/dates";
import { computeComptabiliteData } from "@/lib/comptabiliteData";
import { requireSession, requireBusinessId, ownershipErrorToStatus } from "@/lib/ownership";

export async function GET(req: Request) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    const period = new URL(req.url).searchParams.get("period") || "";
    const range = parsePeriod(period);
    if (!range) {
      return NextResponse.json(
        { error: "Format de période invalide — utilisez AAAA (année), AAAA-MM (mois) ou AAAA-TN (trimestre, ex. 2026-T3)." },
        { status: 400 }
      );
    }

    const data = await computeComptabiliteData(businessId, range);
    return NextResponse.json(data);
  } catch (err) {
    const { status, message } = ownershipErrorToStatus(err);
    return NextResponse.json({ error: message }, { status });
  }
}
