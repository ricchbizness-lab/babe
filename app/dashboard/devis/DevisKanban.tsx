"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, Skeleton, type BadgeTone } from "@/components/ui";
import { relanceLevel, daysSinceSent } from "@/lib/relance";
import type { DevisRow } from "./page";

type ColumnDef = {
  key: string;
  label: string;
  tone: BadgeTone;
  match: (d: DevisRow) => boolean;
};

const COLUMNS: ColumnDef[] = [
  { key: "brouillon", label: "Brouillon", tone: "neutral", match: (d) => d.status === "brouillon" },
  {
    key: "envoye",
    label: "Envoyé",
    tone: "blue",
    match: (d) => d.status === "envoye" && relanceLevel(d.status, d.updatedAt).level === "none",
  },
  {
    key: "en_attente",
    label: "En attente",
    tone: "amber",
    match: (d) => d.status === "envoye" && relanceLevel(d.status, d.updatedAt).level !== "none",
  },
  { key: "accepte", label: "Accepté", tone: "success", match: (d) => d.status === "accepte" },
  { key: "refuse", label: "Refusé", tone: "danger", match: (d) => d.status === "refuse" },
];

function formatModifiedLabel(updatedAt: string) {
  const days = daysSinceSent(updatedAt);
  if (days <= 0) return "Modifié aujourd'hui";
  if (days === 1) return "Modifié il y a 1 jour";
  return `Modifié il y a ${days} jours`;
}

export function KanbanSkeleton() {
  return (
    <div className="nova-kanban" aria-hidden="true">
      {COLUMNS.map((col) => (
        <div className="nova-kanban-column" key={col.key}>
          <div className="nova-kanban-column-header">
            <Skeleton style={{ width: 80, height: 20 }} />
            <Skeleton style={{ width: 40, height: 14 }} />
          </div>
          <div className="nova-kanban-column-body">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} style={{ height: 110, borderRadius: 10 }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function DevisKanban({ devis }: { devis: DevisRow[] }) {
  const router = useRouter();

  const references = useMemo(() => {
    const chronological = [...devis].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const map = new Map<string, string>();
    chronological.forEach((d, i) => {
      const year = new Date(d.createdAt).getFullYear();
      map.set(d.id, `D-${year}-${String(i + 1).padStart(3, "0")}`);
    });
    return map;
  }, [devis]);

  return (
    <div className="nova-kanban">
      {COLUMNS.map((col) => {
        const items = devis.filter(col.match);
        const total = items.reduce((sum, d) => sum + (d.amount || 0), 0);
        return (
          <div className="nova-kanban-column" key={col.key}>
            <div className="nova-kanban-column-header">
              <div className="nova-kanban-column-title">
                <Badge tone={col.tone}>{col.label}</Badge>
                <span className="nova-kanban-column-count">{items.length}</span>
              </div>
              <span className="nova-kanban-column-amount">{total.toLocaleString("fr-FR")} €</span>
            </div>
            <div className="nova-kanban-column-body">
              {items.length === 0 ? (
                <div className="nova-kanban-empty">Aucun devis</div>
              ) : (
                items.map((d) => {
                  const relance = relanceLevel(d.status, d.updatedAt);
                  return (
                    <div
                      key={d.id}
                      className="nova-kanban-card"
                      role="link"
                      tabIndex={0}
                      onClick={() => router.push(`/dashboard/devis/${d.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") router.push(`/dashboard/devis/${d.id}`);
                      }}
                    >
                      <div className="nova-kanban-card-top">
                        <span className="nova-kanban-card-ref">Devis #{references.get(d.id)}</span>
                        {d.paymentStatus === "payee" && <Badge tone="success">Signé</Badge>}
                      </div>
                      <div className="nova-kanban-card-client">{d.client?.name || "Client non renseigné"}</div>
                      {(d.description || d.label) && (
                        <div className="nova-kanban-card-desc">{d.description || d.label}</div>
                      )}
                      <div className="nova-kanban-card-amount">
                        {d.amount != null ? `${d.amount.toLocaleString("fr-FR")} €` : "—"}
                      </div>
                      <div className="nova-kanban-card-footer">
                        <span className="nova-kanban-card-date">{formatModifiedLabel(d.updatedAt)}</span>
                        {relance.level !== "none" && (
                          <span
                            className={`nova-kanban-relance-dot ${
                              relance.level === "danger" ? "nova-kanban-relance-dot-danger" : "nova-kanban-relance-dot-orange"
                            }`}
                            aria-hidden="true"
                          />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <Link href="/dashboard/devis/nouveau" className="nova-kanban-add-btn">
              + Nouveau devis
            </Link>
          </div>
        );
      })}
    </div>
  );
}
