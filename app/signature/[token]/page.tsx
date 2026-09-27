import { notFound } from "next/navigation";
import { SignaturePad } from "@/components/SignaturePad";
import { getSignatureRequestData } from "@/lib/signature";

export default async function SignaturePage({ params }: { params: { token: string } }) {
  const request = await getSignatureRequestData(params.token);
  if (!request) notFound();

  const devis = {
    id: request.devis.id,
    label: request.devis.label,
    description: request.devis.description,
    amount: request.devis.amount,
    remise: request.devis.remise,
    createdAt: request.devis.createdAt.toISOString(),
    updatedAt: request.devis.updatedAt.toISOString(),
    lines: request.devis.lines,
    client: request.devis.client,
  };

  const alreadySigned = request.signedAt
    ? { signedAt: request.signedAt.toISOString(), signatureData: request.signatureData }
    : null;

  return <SignaturePad token={params.token} devis={devis} business={request.business} alreadySigned={alreadySigned} />;
}
