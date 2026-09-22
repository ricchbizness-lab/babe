"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Badge, Card, CardTitle, DonutChart, MetricBar, MiniLineChart, Skeleton, Table, useToast, type TableColumn } from "@/components/ui";
import { depensesForProject } from "@/lib/achats";
import { fetchWithAuth } from "@/lib/fetchClient";
import type { ChartPoint, DevisRow, ProjectRow, PurchaseRow } from "./page";

const STATUS_LABEL: Record<string, string> = {
  planifie: "Planifié",
  en_cours: "En cours",
  termine: "Terminé",
  annule: "Annulé",
};

type TopChantier = { id: string; name: string; marge: number; margePct: number };

export function AnalyseVueGlobale({
  loading,
  devis,
  projects,
  purchases,
  chart,
}: {
  loading: boolean;
  devis: DevisRow[];
  projects: ProjectRow[];
  purchases: PurchaseRow[];
  chart: ChartPoint[] | null;
}) {
  const toast = useToast();
  const [insight, setInsight] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const now = new Date();
  const devisAcceptes = devis.filter((d) => d.status === "accepte");
  const caAnnuel = devisAcceptes
    .filter((d) => new Date(d.updatedAt).getFullYear() === now.getFullYear())
    .reduce((sum, d) => sum + (d.amount || 0), 0);

  const tauxConversion = devis.length > 0 ? Math.round((devisAcceptes.length / devis.length) * 100) : 0;
  const chantiersActifs = projects.filter((p) => p.status === "en_cours").length;

  const margesProjets = projects
    .filter((p) => p.budgetPrevu != null && p.budgetPrevu > 0)
    .map((p) => {
      const depenses = depensesForProject(p.id, purchases);
      const marge = (p.budgetPrevu as number) - depenses;
      const margePct = (marge / (p.budgetPrevu as number)) * 100;
      return { id: p.id, name: p.name, marge, margePct };
    });
  const margeBruteMoyenne =
    margesProjets.length > 0 ? margesProjets.reduce((sum, p) => sum + p.margePct, 0) / margesProjets.length : null;

  const topChantiers: TopChantier[] = [...margesProjets].sort((a, b) => b.marge - a.marge).slice(0, 5);

  const statusSegments = ["planifie", "en_cours", "termine", "annule"].map((key) => ({
    label: STATUS_LABEL[key],
    value: projects.filter((p) => p.status === key).length,
  }));

  const topColumns: TableColumn<TopChantier>[] = [
    { key: "name", label: "Chantier", emphasis: "title" },
    {
      key: "marge",
      label: "Marge estimée",
      align: "right",
      render: (c) => `${c.marge.toLocaleString("fr-FR")} €`,
      emphasis: "amount",
    },
    { key: "margePct", label: "Marge %", align: "right", render: (c) => `${Math.round(c.margePct)}%` },
  ];

  async function handleGenerateInsight() {
    setGenerating(true);
    setInsight(null);
    try {
      const res = await fetchWithAuth("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: "analyse",
          input: {
            caAnnuel,
            margeBruteMoyenne: margeBruteMoyenne != null ? Math.round(margeBruteMoyenne) : null,
            tauxConversionDevis: tauxConversion,
            chantiersActifs,
            topChantier: topChantiers[0]?.name || null,
          },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Erreur lors de la génération des alertes Nova.");
        return;
      }
      const data = await res.json();
      setInsight(data.result || "");
    } catch {
      toast.error("Impossible de joindre le serveur — réessayez.");
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return <Skeleton style={{ height: 400 }} />;
  }

  return (
    <div className="nova-analyse-tab">
      <MetricBar
        items={[
          { label: "CA annuel", value: `${caAnnuel.toLocaleString("fr-FR")} €` },
          { label: "Marge brute moyenne", value: margeBruteMoyenne != null ? `${Math.round(margeBruteMoyenne)}%` : "—" },
          { label: "Taux conversion devis", value: `${tauxConversion}%` },
          { label: "Chantiers actifs", value: chantiersActifs },
        ]}
      />

      <Card>
        <CardTitle>Évolution du chiffre d'affaires (12 mois)</CardTitle>
        {chart === null ? (
          <Skeleton style={{ height: 220 }} />
        ) : (
          <MiniLineChart data={chart} seriesALabel="Chiffre d'affaires" seriesBLabel="Encaissé" />
        )}
      </Card>

      <div className="nova-analyse-grid-2">
        <Card>
          <CardTitle>Répartition des chantiers par statut</CardTitle>
          <DonutChart segments={statusSegments} />
        </Card>

        <Card>
          <CardTitle>Top 5 chantiers les plus rentables</CardTitle>
          {topChantiers.length === 0 ? (
            <p className="nova-page-subtitle">Renseignez un budget prévu sur vos chantiers pour voir ce classement.</p>
          ) : (
            <Table columns={topColumns} rows={topChantiers} emptyLabel="Aucun chantier avec budget renseigné." />
          )}
        </Card>
      </div>

      <Card accent={false} className="nova-ai-zone">
        <div className="nova-ai-zone-header">
          <Badge tone="teal">Alertes Nova</Badge>
          <button type="button" className="nova-btn nova-btn-secondary" onClick={handleGenerateInsight} disabled={generating}>
            <Sparkles size={15} strokeWidth={1.75} />
            {generating ? "Nova analyse..." : insight ? "Régénérer" : "Générer les alertes Nova"}
          </button>
        </div>
        {generating ? (
          <Skeleton style={{ height: 60 }} />
        ) : insight ? (
          <p className="nova-ai-content">{insight}</p>
        ) : (
          <p className="nova-page-subtitle">
            Nova peut analyser vos indicateurs et proposer des pistes à évaluer — jamais de décisions à votre place.
          </p>
        )}
      </Card>
    </div>
  );
}
