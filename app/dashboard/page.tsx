import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");

  const business = await prisma.business.findUnique({ where: { userId } });
  if (!business) redirect("/onboarding");

  const [clientCount, projectCount, taskCount, devisCount] = await Promise.all([
    prisma.client.count({ where: { businessId: business.id } }),
    prisma.project.count({ where: { businessId: business.id } }),
    prisma.task.count({ where: { businessId: business.id, done: false } }),
    prisma.devis.count({ where: { businessId: business.id } }),
  ]);

  return (
    <div style={{ maxWidth: 720, margin: "60px auto", padding: "0 24px" }}>
      <h1 style={{ fontSize: 26 }}>{business.name}</h1>
      <p style={{ color: "var(--ink-soft)" }}>{business.sector}</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 28 }}>
        <Stat label="Clients" value={clientCount} />
        <Stat label="Chantiers" value={projectCount} />
        <Stat label="Tâches en attente" value={taskCount} />
        <Stat label="Devis" value={devisCount} />
      </div>

      <p style={{ marginTop: 40, fontSize: 13, color: "var(--ink-soft)" }}>
        Socle opérationnel de base — CRM, chantiers, devis, tâches. Les
        rapports vocaux terrain et le copilote financier ne sont pas encore
        implémentés dans cette version (voir NOVA_Brief_Technique_v3.md,
        Phase 2 et 3).
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 10, padding: 16 }}>
      <div style={{ fontSize: 26, fontWeight: 700, color: "var(--teal)" }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 6 }}>{label}</div>
    </div>
  );
}
