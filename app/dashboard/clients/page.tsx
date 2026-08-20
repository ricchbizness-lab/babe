"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, UserPlus } from "lucide-react";
import { Button, EmptyState, SearchInput, Table, TableSkeleton, Timestamp, type TableColumn } from "@/components/ui";
import { fetchWithAuth } from "@/lib/fetchClient";
import { downloadCSV, generateCSV } from "@/lib/csv";

type ClientRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  createdAt: string;
};

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientRow[] | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetchWithAuth("/api/clients")
      .then((res) => res.json())
      .then((data) => setClients(data.clients ?? []));
  }, []);

  const filtered = (clients ?? []).filter((c) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.phone || "").toLowerCase().includes(q)
    );
  });

  function handleExport() {
    const csv = generateCSV(
      ["Nom", "Email", "Téléphone", "Adresse"],
      filtered.map((c) => [c.name, c.email || "", c.phone || "", c.address || ""])
    );
    downloadCSV("clients.csv", csv);
  }

  const columns: TableColumn<ClientRow>[] = [
    { key: "name", label: "Nom", sortable: true },
    { key: "email", label: "Email", render: (c) => c.email || "—" },
    { key: "phone", label: "Téléphone", render: (c) => c.phone || "—" },
    {
      key: "createdAt",
      label: "Créé le",
      render: (c) => <Timestamp date={c.createdAt} />,
      sortable: true,
      sortValue: (c) => new Date(c.createdAt).getTime(),
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

      <SearchInput value={query} onChange={setQuery} placeholder="Rechercher un client..." />

      {clients === null ? (
        <TableSkeleton columns={4} />
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
        />
      )}
    </div>
  );
}
