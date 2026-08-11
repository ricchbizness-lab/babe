import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeRegistreActivite } from "@/lib/registre";
import { AnalyseNovaSkeleton, Badge, Card, CardTitle, MetricCard, MetricsBandSkeleton, QuickAction } from "@/components/ui";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");

  const business = await prisma.business.findUnique({ where: { userId } });
  if (!business) redirect("/onboarding");

  return (
    <div className="nova-page">
      <header className="nova-page-header">
        <h1>{business.name}</h1>
        <p className="nova-page-subtitle">{business.sector}</p>
      </header>

      <Suspense fallback={<MetricsBandSkeleton />}>
        <MetricsBand businessId={business.id} />
      </Suspense>

      <Suspense fallback={<AnalyseNovaSkeleton />}>
        <AnalyseNova businessId={business.id} />
      </Suspense>

      <section>
        <h2 className="nova-section-title">Accès rapide</h2>
        <div className="nova-quick-actions-grid">
          <QuickAction label="Nouveau devis" href="/dashboard/devis" icon="devis" />
          <QuickAction label="Ajouter un client" href="/dashboard/clients" icon="user-plus" />
          <QuickAction label="Ajouter une tâche" href="/dashboard/taches" icon="taches" />
        </div>
      </section>
    </div>
  );
}

async function MetricsBand({ businessId }: { businessId: string }) {
  const [clientCount, projectCount, devisEnAttente, tachesEnAttente] = await Promise.all([
    prisma.client.count({ where: { businessId } }),
    prisma.project.count({ where: { businessId } }),
    prisma.devis.count({ where: { businessId, status: "envoye" } }),
    prisma.task.count({ where: { businessId, done: false } }),
  ]);

  return (
    <section className="nova-metrics-band">
      <MetricCard label="Clients" value={clientCount} href="/dashboard/clients" />
      <MetricCard label="Chantiers" value={projectCount} href="/dashboard/chantiers" />
      <MetricCard label="Devis en attente" value={devisEnAttente} href="/dashboard/devis" />
      <MetricCard label="Tâches en attente" value={tachesEnAttente} href="/dashboard/taches" />
    </section>
  );
}

async function AnalyseNova({ businessId }: { businessId: string }) {
  const registre = await computeRegistreActivite(businessId);

  return (
    <Card>
      <CardTitle>Analyse Nova</CardTitle>
      <p className="nova-analyse-intro">
        Des faits vérifiables tirés de votre activité — jamais une estimation présentée comme certaine.
      </p>
      <div className="nova-analyse-grid">
        <div>
          <div className="nova-analyse-value">{registre.caFacture.toLocaleString("fr-FR")} €</div>
          <div className="nova-analyse-label">CA facturé (devis acceptés)</div>
        </div>
        <div>
          <div className="nova-analyse-value">
            {registre.devisAcceptes} / {registre.devisTotal}
          </div>
          <div className="nova-analyse-label">Devis acceptés</div>
        </div>
        <div>
          <div className="nova-analyse-value">{registre.tachesTraiteesATemps}</div>
          <div className="nova-analyse-label">Tâches traitées</div>
        </div>
      </div>
      <div className="nova-analyse-estimate">
        <Badge tone="amber">Estimation, pas un fait</Badge>
        <span>
          Temps estimé gagné : environ {registre.tempsEstime.heures.toFixed(1)} h (≈{" "}
          {registre.tempsEstime.estimationEuros.toLocaleString("fr-FR")} € à {registre.tempsEstime.tauxHoraire} €/h) —
          hypothèse déclarée, jamais additionnée au CA ci-dessus.
        </span>
      </div>
    </Card>
  );
}
