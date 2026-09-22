import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateReportPDF } from "@/lib/facturx";
import { requireSession, requireBusinessId, assertOwnedByBusiness, ownershipErrorToStatus } from "@/lib/ownership";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireSession();
    const businessId = await requireBusinessId(userId);

    const report = await assertOwnedByBusiness(
      await prisma.strategicReport.findUnique({ where: { id: params.id } }),
      businessId
    );

    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) {
      return NextResponse.json({ error: "Profil entreprise introuvable" }, { status: 404 });
    }

    const pdfBytes = await generateReportPDF({
      period: report.period,
      content: report.content,
      status: report.status,
      reviewedBy: report.reviewedBy,
      businessName: business.name,
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="rapport-${report.period}.pdf"`,
      },
    });
  } catch (err) {
    console.error("Erreur /api/strategic-reports/[id]/pdf:", err);
    const { status, message } = ownershipErrorToStatus(err);
    if (status !== 500) return NextResponse.json({ error: message }, { status });
    return NextResponse.json({ error: "Erreur lors de la génération du PDF" }, { status: 500 });
  }
}
