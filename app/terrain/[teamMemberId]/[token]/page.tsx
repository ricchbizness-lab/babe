import { notFound } from "next/navigation";
import { TerrainView } from "@/components/TerrainView";
import { getTerrainData } from "@/lib/terrain";

export default async function TerrainPage({ params }: { params: { teamMemberId: string; token: string } }) {
  const data = await getTerrainData(params.teamMemberId, params.token);
  if (!data) notFound();

  return (
    <TerrainView
      teamMemberId={params.teamMemberId}
      token={params.token}
      member={data.member}
      assignments={data.assignments}
      pointages={data.pointages}
    />
  );
}
