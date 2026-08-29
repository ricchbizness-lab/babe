"use client";

import { useEffect, useState } from "react";
import { Tabs } from "@/components/ui";
import { fetchWithAuth } from "@/lib/fetchClient";
import { AnalyseVueGlobale } from "./AnalyseVueGlobale";
import { AnalyseChantiers } from "./AnalyseChantiers";
import { AnalyseClients } from "./AnalyseClients";
import { AnalyseCommercial } from "./AnalyseCommercial";

export type DevisRow = {
  id: string;
  label: string;
  amount: number | null;
  status: string;
  paymentStatus: string;
  createdAt: string;
  updatedAt: string;
  client: { id: string; name: string } | null;
};

export type ProjectRow = {
  id: string;
  name: string;
  status: string;
  budgetPrevu: number | null;
  tasks: { done: boolean }[];
  client: { id: string; name: string } | null;
};

export type PurchaseRow = {
  id: string;
  amount: number;
  status: string;
  project: { id: string; name: string } | null;
};

export type ChartPoint = { month: string; ca: number; encaisse: number };

export default function AnalysePage() {
  const [tab, setTab] = useState<"global" | "chantiers" | "clients" | "commercial">("global");
  const [devis, setDevis] = useState<DevisRow[] | null>(null);
  const [projects, setProjects] = useState<ProjectRow[] | null>(null);
  const [purchases, setPurchases] = useState<PurchaseRow[] | null>(null);
  const [chart, setChart] = useState<ChartPoint[] | null>(null);

  useEffect(() => {
    fetchWithAuth("/api/devis")
      .then((res) => res.json())
      .then((data) => setDevis(data.devis ?? []));
    fetchWithAuth("/api/projects")
      .then((res) => res.json())
      .then((data) => setProjects(data.projects ?? []));
    fetchWithAuth("/api/purchases")
      .then((res) => res.json())
      .then((data) => setPurchases(data.purchases ?? []));
    fetchWithAuth("/api/dashboard-overview?months=12")
      .then((res) => res.json())
      .then((data) => setChart(data.chart ?? []));
  }, []);

  const loading = devis === null || projects === null || purchases === null;

  return (
    <div className="nova-page">
      <header className="nova-page-header">
        <h1>Analyse</h1>
        <p className="nova-page-subtitle">Rentabilité et pilotage de l'activité — options à évaluer, jamais de directives.</p>
      </header>

      <Tabs
        tabs={[
          { key: "global", label: "Vue globale" },
          { key: "chantiers", label: "Chantiers" },
          { key: "clients", label: "Clients" },
          { key: "commercial", label: "Commercial" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "global" && (
        <AnalyseVueGlobale loading={loading} devis={devis ?? []} projects={projects ?? []} purchases={purchases ?? []} chart={chart} />
      )}
      {tab === "chantiers" && <AnalyseChantiers loading={loading} projects={projects ?? []} purchases={purchases ?? []} />}
      {tab === "clients" && <AnalyseClients loading={loading} devis={devis ?? []} projects={projects ?? []} />}
      {tab === "commercial" && <AnalyseCommercial loading={loading} devis={devis ?? []} />}
    </div>
  );
}
