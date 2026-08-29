"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Image as ImageIcon, Mic, Receipt } from "lucide-react";
import { EmptyState, SearchInput, Skeleton, Tabs, Timestamp } from "@/components/ui";
import { fetchWithAuth } from "@/lib/fetchClient";
import type { FeedItem } from "@/app/api/documents-feed/route";

const KIND_ICON: Record<FeedItem["kind"], typeof FileText> = {
  document: FileText,
  photo: ImageIcon,
  devis: FileText,
  facture: Receipt,
  rapport: Mic,
};

const TABS: { key: "tous" | "clients" | "chantiers" | "devis" | "factures" | "rapports"; label: string }[] = [
  { key: "tous", label: "Tous" },
  { key: "clients", label: "Clients" },
  { key: "chantiers", label: "Chantiers" },
  { key: "devis", label: "Devis" },
  { key: "factures", label: "Factures" },
  { key: "rapports", label: "Rapports" },
];

export default function DocumentsPage() {
  const [items, setItems] = useState<FeedItem[] | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("tous");
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetchWithAuth("/api/documents-feed")
      .then((res) => res.json())
      .then((data) => setItems(data.items ?? []));
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = (items ?? []).filter((item) => {
    const matchesTab = tab === "tous" || tab === "clients" || item.tab === tab;
    const matchesQuery =
      !q ||
      item.title.toLowerCase().includes(q) ||
      item.subtitle.toLowerCase().includes(q) ||
      (item.preview || "").toLowerCase().includes(q);
    return matchesTab && matchesQuery;
  });

  return (
    <div className="nova-page">
      <header className="nova-page-header">
        <h1>Documents</h1>
        <p className="nova-page-subtitle">
          {items === null ? "…" : `${items.length} élément${items.length > 1 ? "s" : ""}`}
        </p>
      </header>

      <SearchInput value={query} onChange={setQuery} placeholder="Rechercher dans tous les documents..." />

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {items === null ? (
        <Skeleton style={{ height: 300 }} />
      ) : tab === "clients" ? (
        <EmptyState
          icon="crm"
          title="Pas encore de documents liés à un client"
          description="Les documents générés (briefs, contenus marketing...) ne sont pour l'instant pas rattachés à un client précis dans les données de l'application."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="rapport"
          title={q ? "Aucun résultat pour cette recherche" : "Aucun document pour l'instant"}
          description={q ? undefined : "Les devis, factures, photos de chantier et rapports vocaux apparaîtront ici au fur et à mesure."}
        />
      ) : (
        <ul className="nova-report-list">
          {filtered.map((item) => {
            const Icon = KIND_ICON[item.kind];
            return (
              <li key={item.id} className="nova-report-row">
                {item.imagePreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imagePreview} alt="" className="nova-doc-thumb" />
                ) : (
                  <span className="nova-report-icon">
                    <Icon size={16} strokeWidth={1.75} />
                  </span>
                )}
                <div className="nova-report-info">
                  <Link href={item.href} className="nova-report-period nova-inline-link">
                    {item.title}
                  </Link>
                  <span className="nova-page-subtitle">{item.subtitle}</span>
                  {item.preview && <span className="nova-truncate">{item.preview}</span>}
                </div>
                <Timestamp date={item.date} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
