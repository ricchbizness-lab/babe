import { notFound } from "next/navigation";
import { PortalView } from "@/components/PortalView";
import { getPortalData } from "@/lib/portal";

export default async function PortalPage({ params }: { params: { token: string } }) {
  const project = await getPortalData(params.token);
  if (!project) notFound();

  return <PortalView project={project} />;
}
