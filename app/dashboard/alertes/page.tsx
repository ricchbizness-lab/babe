"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Clock, Info } from "lucide-react";
import { Badge, Button, EmptyState, MetricBar, Skeleton, Tabs, Timestamp, useToast, type BadgeTone } from "@/components/ui";
import { fetchWithAuth } from "@/lib/fetchClient";

type Priorite = "haute" | "moyenne" | "basse";

type Alerte = {
  id: string;
  type: string;
  titre: string;
  message: string;
  priorite: Priorite;
  lien: string | null;
  lu: boolean;
  createdAt: string;
};

const PRIORITE_ORDER: Priorite[] = ["haute", "moyenne", "basse"];
const PRIORITE_LABEL: Record<Priorite, string> = {
  haute: "Haute priorité",
  moyenne: "Priorité moyenne",
  basse: "Priorité basse",
};
const PRIORITE_BADGE_LABEL: Record<Priorite, string> = { haute: "Haute", moyenne: "Moyenne", basse: "Basse" };
const PRIORITE_BADGE_TONE: Record<Priorite, BadgeTone> = { haute: "danger", moyenne: "amber", basse: "blue" };
const PRIORITE_ICON_TONE: Record<Priorite, "danger" | "amber" | "blue"> = { haute: "danger", moyenne: "amber", basse: "blue" };
const PRIORITE_ICON: Record<Priorite, typeof AlertTriangle> = { haute: AlertTriangle, moyenne: Clock, basse: Info };

export default function AlertesPage() {
  const toast = useToast();
  const [alertes, setAlertes] = useState<Alerte[] | null>(null);
  const [tab, setTab] = useState<"toutes" | "non_lues" | "lues">("non_lues");
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);

  useEffect(() => {
    // Génération silencieuse comme sur le dashboard principal — utile si
    // cette page est ouverte directement sans être passé par l'accueil.
    fetchWithAuth("/api/alertes/generer", { method: "POST" })
      .catch(() => {})
      .finally(reload);
  }, []);

  function reload() {
    fetchWithAuth("/api/alertes")
      .then((res) => res.json())
      .then((data) => setAlertes(data.alertes ?? []));
  }

  const list = alertes ?? [];
  const nonLues = list.filter((a) => !a.lu);
  const lues = list.filter((a) => a.lu);
  const filtered = tab === "toutes" ? list : tab === "non_lues" ? nonLues : lues;
  const hautesNonLues = list.filter((a) => a.priorite === "haute" && !a.lu);

  async function markAsRead(id: string) {
    setMarkingId(id);
    try {
      const res = await fetchWithAuth(`/api/alertes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lu: true }),
      });
      if (!res.ok) {
        toast.error("Impossible de marquer cette alerte comme lue.");
        return;
      }
      setAlertes((prev) => (prev ?? []).map((a) => (a.id === id ? { ...a, lu: true } : a)));
    } catch {
      toast.error("Impossible de joindre le serveur — réessayez.");
    } finally {
      setMarkingId(null);
    }
  }

  async function markAllAsRead() {
    if (nonLues.length === 0) return;
    setMarkingAllRead(true);
    try {
      const results = await Promise.all(
        nonLues.map((a) =>
          fetchWithAuth(`/api/alertes/${a.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lu: true }),
          })
        )
      );
      if (results.some((r) => !r.ok)) {
        toast.error("Certaines alertes n'ont pas pu être marquées comme lues.");
      } else {
        toast.success("Toutes les alertes ont été marquées comme lues");
      }
      setAlertes((prev) => (prev ?? []).map((a) => ({ ...a, lu: true })));
    } catch {
      toast.error("Impossible de joindre le serveur — réessayez.");
    } finally {
      setMarkingAllRead(false);
    }
  }

  const groups = PRIORITE_ORDER.map((p) => ({ priorite: p, items: filtered.filter((a) => a.priorite === p) })).filter(
    (g) => g.items.length > 0
  );

  const emptyLabel =
    tab === "non_lues" ? "Aucune alerte non lue" : tab === "lues" ? "Aucune alerte lue pour le moment" : "Aucune alerte pour le moment";

  return (
    <div className="nova-page">
      <header className="nova-page-header-row">
        <div>
          <h1>Alertes</h1>
          <p className="nova-page-subtitle">
            {alertes === null ? "…" : `${list.length} alerte${list.length > 1 ? "s" : ""}`}
          </p>
        </div>
        {nonLues.length > 0 && (
          <Button variant="secondary" onClick={markAllAsRead} disabled={markingAllRead}>
            {markingAllRead ? "Mise à jour..." : "Tout marquer comme lu"}
          </Button>
        )}
      </header>

      {alertes !== null && list.length > 0 && (
        <MetricBar
          items={[
            { label: "Total", value: list.length },
            { label: "Non lues", value: nonLues.length },
            { label: "Haute priorité", value: hautesNonLues.length },
          ]}
        />
      )}

      <Tabs
        tabs={[
          { key: "toutes", label: "Toutes" },
          { key: "non_lues", label: "Non lues" },
          { key: "lues", label: "Lues" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {alertes === null ? (
        <Skeleton style={{ height: 220 }} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="alertes"
          title={emptyLabel}
          description="Nova analyse vos devis, factures, chantiers et tâches pour vous signaler ce qui mérite votre attention."
        />
      ) : (
        <div className="nova-alertes-groups">
          {groups.map((group) => (
            <section key={group.priorite}>
              <h2 className="nova-section-title">{PRIORITE_LABEL[group.priorite]}</h2>
              <div className="nova-alerte-list">
                {group.items.map((a) => {
                  const Icon = PRIORITE_ICON[a.priorite];
                  return (
                    <div key={a.id} className={`nova-alerte-card ${a.lu ? "nova-alerte-card-lue" : ""}`}>
                      <span className={`nova-alerte-icon nova-stat-icon-${PRIORITE_ICON_TONE[a.priorite]}`}>
                        <Icon size={18} strokeWidth={1.75} />
                      </span>
                      <div className="nova-alerte-body">
                        <div className="nova-alerte-header">
                          <span className="nova-alerte-titre">{a.titre}</span>
                          <Badge tone={PRIORITE_BADGE_TONE[a.priorite]}>{PRIORITE_BADGE_LABEL[a.priorite]}</Badge>
                        </div>
                        <p className="nova-alerte-message">{a.message}</p>
                        <Timestamp date={a.createdAt} />
                      </div>
                      <div className="nova-alerte-actions">
                        {a.lien && (
                          <Link href={a.lien} className="nova-btn nova-btn-secondary">
                            Voir
                          </Link>
                        )}
                        {!a.lu && (
                          <Button variant="ghost" disabled={markingId === a.id} onClick={() => markAsRead(a.id)}>
                            {markingId === a.id ? "..." : "Marquer comme lu"}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
