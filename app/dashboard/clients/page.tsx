"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Download, Filter, UserPlus } from "lucide-react";
import { Avatar, Button, EmptyState, MetricBar, SearchInput, Table, TableSkeleton, Timestamp, type TableColumn } from "@/components/ui";
import { fetchWithAuth } from "@/lib/fetchClient";
import { downloadCSV, generateCSV } from "@/lib/csv";

type ClientRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  createdAt: string;
  devis: { amount: number | null; status: string }[];
  projects: { status: string }[];
};

function caTotalFor(c: ClientRow): number {
  return c.devis.filter((d) => d.status === "accepte").reduce((sum, d) => sum + (d.amount || 0), 0);
}

function chantiersActifsFor(c: ClientRow): number {
  return c.projects.filter((p) => p.status === "en_cours").length;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientRow[] | null>(null);
  const [query, setQuery] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);

  useEffect(() => {
    fetchWithAuth("/api/clients")
      .then((res) => res.json())
      .then((data) => setClients(data.clients ?? []));
  }, []);

  const filtered = (clients ?? []).filter((c) => {
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q ||
      c.name.toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.phone || "").toLowerCase().includes(q);
    const matchesFilter = !activeOnly || chantiersActifsFor(c) > 0;
    return matchesQuery && matchesFilter;
  });

  function handleExport() {
    const csv = generateCSV(
      ["Nom", "Email", "Téléphone", "Adresse"],
      filtered.map((c) => [c.name, c.email || "", c.phone || "", c.address || ""])
    );
    downloadCSV("clients.csv", csv);
  }

  const now = new Date();
  const caTotal = (clients ?? []).reduce((sum, c) => sum + caTotalFor(c), 0);
  const clientsActifs = (clients ?? []).filter((c) => chantiersActifsFor(c) > 0).length;
  const nouveauxCeMois = (clients ?? []).filter((c) => {
    const d = new Date(c.createdAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const columns: TableColumn<ClientRow>[] = [
    {
      key: "name",
      label: "Nom",
      sortable: true,
      render: (c) => (
        <span className="nova-identity-cell">
          <Avatar name={c.name} size={30} />
          <span className="nova-identity-cell-name">{c.name}</span>
        </span>
      ),
    },
    { key: "email", label: "Email", render: (c) => c.email || "—" },
    { key: "phone", label: "Téléphone", render: (c) => c.phone || "—" },
    {
      key: "caTotal",
      label: "CA total",
      align: "right",
      render: (c) => `${caTotalFor(c).toLocaleString("fr-FR")} €`,
      sortable: true,
      sortValue: (c) => caTotalFor(c),
      emphasis: "amount",
    },
    {
      key: "chantiersActifs",
      label: "Chantiers actifs",
      align: "right",
      render: (c) => chantiersActifsFor(c),
      sortable: true,
      sortValue: (c) => chantiersActifsFor(c),
    },
    {
      key: "createdAt",
      label: "Date d'ajout",
      render: (c) => <Timestamp date={c.createdAt} />,
      sortable: true,
      sortValue: (c) => new Date(c.createdAt).getTime(),
    },
    {
      key: "actions",
      label: "",
      align: "right",
      render: () => <ChevronRight size={16} strokeWidth={1.75} className="nova-ink-faint" />,
    },
  ];

  return (
    <div className="nova-page">
      <header className="nova-page-header-row">
        <div>
          <h1>Clients</h1>
          <p className="nova-page-subtitle">
            {clients === null ? "…" : `${clients.length} client${clients.length > 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="nova-header-actions">
          {clients !== null && clients.length > 0 && (
            <Button variant="secondary" onClick={handleExport}>
              <Download size={16} strokeWidth={1.75} />
              Exporter CSV
            </Button>
          )}
          <Link href="/dashboard/clients/nouveau" className="nova-btn nova-btn-primary">
            <UserPlus size={16} strokeWidth={1.75} />
            Nouveau client
          </Link>
        </div>
      </header>

      {clients !== null && clients.length > 0 && (
        <MetricBar
          items={[
            { label: "Total clients", value: clients.length },
            { label: "CA total généré", value: `${caTotal.toLocaleString("fr-FR")} €` },
            { label: "Clients avec chantier actif", value: clientsActifs },
            { label: "Nouveaux ce mois", value: nouveauxCeMois },
          ]}
        />
      )}

      <div className="nova-header-actions" style={{ justifyContent: "space-between" }}>
        <SearchInput value={query} onChange={setQuery} placeholder="Rechercher un client..." />
        <Button variant={activeOnly ? "primary" : "secondary"} onClick={() => setActiveOnly((v) => !v)}>
          <Filter size={15} strokeWidth={1.75} />
          Chantier actif
        </Button>
      </div>

      {clients === null ? (
        <TableSkeleton columns={6} />
      ) : clients.length === 0 ? (
        <EmptyState
          icon="crm"
          title="Aucun client pour l'instant — ajoutez votre premier client"
          description="Vos clients apparaîtront ici avec leurs chantiers et devis rattachés."
          actionLabel="Ajouter un client"
          actionHref="/dashboard/clients/nouveau"
        />
      ) : (
        <Table
          columns={columns}
          rows={filtered}
          getRowHref={(c) => `/dashboard/clients/${c.id}`}
          emptyLabel="Aucun résultat pour cette recherche."
          pageSize={10}
        />
      )}
    </div>
  );
}
