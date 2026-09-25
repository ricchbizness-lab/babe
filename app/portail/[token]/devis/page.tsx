import { notFound } from "next/navigation";
import { PortalDevisPrint } from "@/components/PortalDevisPrint";
import { getPortalDevisPrintData } from "@/lib/portal";

export default async function PortalDevisPage({ params }: { params: { token: string } }) {
  const data = await getPortalDevisPrintData(params.token);
  if (!data) notFound();

  const devis = {
    ...data.devis,
    createdAt: data.devis.createdAt.toISOString(),
    updatedAt: data.devis.updatedAt.toISOString(),
  };

  return <PortalDevisPrint token={params.token} devis={devis} business={data.business} />;
}
