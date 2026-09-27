"use client";

import { useState } from "react";
import { CheckCircle2, MapPin } from "lucide-react";
import { Button, ToastProvider, useToast, initialsFromName } from "@/components/ui";
import type { TerrainData } from "@/lib/terrain";

type Assignment = TerrainData["assignments"][number];
type PointageRow = TerrainData["pointages"][number];

type Props = {
  teamMemberId: string;
  token: string;
  member: TerrainData["member"];
  assignments: Assignment[];
  pointages: PointageRow[];
};

/** Géolocalisation ponctuelle au moment du pointage — jamais de tracking continu. Résout `null` si le navigateur ou l'utilisateur la refuse, le pointage reste possible sans coordonnées. */
function getPosition(): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      () => resolve(null),
      { timeout: 8000 }
    );
  });
}

function heure(date: Date): string {
  return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function TerrainInner({ teamMemberId, token, member, assignments, pointages: initialPointages }: Props) {
  const toast = useToast();
  const [pointages, setPointages] = useState(initialPointages);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  function lastPointageFor(assignmentId: string): PointageRow | null {
    const list = pointages.filter((p) => p.assignmentId === assignmentId);
    return list.length > 0 ? list[list.length - 1] : null;
  }

  async function handlePointage(assignment: Assignment, type: "arrivee" | "depart") {
    setLoadingId(assignment.id);
    try {
      const pos = await getPosition();
      const res = await fetch("/api/pointage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamMemberId,
          token,
          assignmentId: assignment.id,
          type,
          latitude: pos?.coords.latitude,
          longitude: pos?.coords.longitude,
        }),
      });
      if (!res.ok) {
        toast.error("Impossible d'enregistrer le pointage — réessayez.");
        return;
      }
      const data = await res.json();
      setPointages((prev) => [...prev, data.pointage]);
      toast.success(type === "arrivee" ? "Arrivée enregistrée" : "Départ enregistré");
    } catch {
      toast.error("Impossible de joindre le serveur — réessayez.");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="nova-portal">
      <div className="nova-portal-card">
        <header className="nova-portal-header">
          <div className="nova-portal-logo nova-portal-logo-fallback">{initialsFromName(member.name)}</div>
          <div>
            <div className="nova-portal-business">{member.name}</div>
            <div className="nova-portal-tagline">Pointage terrain</div>
          </div>
        </header>

        <section className="nova-portal-section">
          <h2>Vos affectations aujourd'hui</h2>
          {assignments.length === 0 ? (
            <p className="nova-portal-empty">Aucune affectation aujourd'hui.</p>
          ) : (
            <div className="nova-terrain-assignments">
              {assignments.map((a) => {
                const last = lastPointageFor(a.id);
                const projectName = a.project?.name || "Sans chantier";
                return (
                  <div key={a.id} className="nova-terrain-assignment-card">
                    <div className="nova-terrain-assignment-title">{projectName}</div>
                    {a.project?.address && <div className="nova-terrain-assignment-address">{a.project.address}</div>}
                    {a.note && <div className="nova-terrain-assignment-note">{a.note}</div>}

                    {!last ? (
                      <Button
                        onClick={() => handlePointage(a, "arrivee")}
                        disabled={loadingId === a.id}
                        className="nova-portal-contact-btn"
                      >
                        <MapPin size={18} strokeWidth={1.75} />
                        {loadingId === a.id ? "Localisation..." : `J'arrive sur le chantier ${projectName}`}
                      </Button>
                    ) : last.type === "arrivee" ? (
                      <>
                        <p className="nova-terrain-status nova-terrain-status-success">
                          <CheckCircle2 size={16} strokeWidth={1.75} />
                          Arrivé à {heure(last.timestamp)}
                        </p>
                        <Button
                          variant="secondary"
                          onClick={() => handlePointage(a, "depart")}
                          disabled={loadingId === a.id}
                          className="nova-portal-contact-btn"
                        >
                          {loadingId === a.id ? "Localisation..." : "Je quitte le chantier"}
                        </Button>
                      </>
                    ) : (
                      <p className="nova-terrain-status">
                        <CheckCircle2 size={16} strokeWidth={1.75} />
                        Départ enregistré à {heure(last.timestamp)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
      <footer className="nova-portal-footer">Propulsé par Nova</footer>
    </div>
  );
}

export function TerrainView(props: Props) {
  return (
    <ToastProvider>
      <TerrainInner {...props} />
    </ToastProvider>
  );
}
