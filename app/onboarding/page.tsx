"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { METIERS, METIER_ICON, METIER_LABEL, type Metier } from "@/lib/metiers";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [sector, setSector] = useState("");
  const [mission, setMission] = useState("");
  const [metier, setMetier] = useState<Metier | "">("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleStep1Submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim() || !sector.trim()) {
      setError("Indiquez au moins le nom et le secteur.");
      return;
    }
    setStep(2);
  }

  async function handleFinish() {
    setError("");
    setLoading(true);
    const res = await fetch("/api/business", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, sector, mission, tone: "pro", tauxHoraire: 40, metier: metier || undefined }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("Impossible d'enregistrer le profil.");
      return;
    }
    router.push("/dashboard");
  }

  if (step === 2) {
    return (
      <div className="card onboarding-metier-card">
        <h1 style={{ fontSize: 22, marginBottom: 4 }}>Quel est votre métier ?</h1>
        <p style={{ color: "var(--ink-soft)", fontSize: 13.5, marginBottom: 20 }}>
          Cela pré-configure votre bibliothèque d'ouvrages avec des prestations courantes pour votre métier — vous
          pourrez toujours l'ajuster ensuite.
        </p>
        <div className="onboarding-metier-grid">
          {METIERS.map((m) => {
            const Icon = METIER_ICON[m];
            const selected = metier === m;
            return (
              <button
                key={m}
                type="button"
                className={`onboarding-metier-tile ${selected ? "onboarding-metier-tile-selected" : ""}`}
                onClick={() => setMetier(m)}
              >
                <span className="onboarding-metier-tile-icon">
                  <Icon size={32} strokeWidth={1.75} />
                </span>
                <span className="onboarding-metier-tile-label">{METIER_LABEL[m]}</span>
              </button>
            );
          })}
        </div>
        {error && <div className="error">{error}</div>}
        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <button type="button" onClick={() => setStep(1)} style={{ flex: "0 0 auto" }}>
            ← Retour
          </button>
          <button className="primary" type="button" disabled={loading} style={{ flex: 1 }} onClick={handleFinish}>
            {loading ? "Création..." : "Créer mon espace →"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Créons votre profil entreprise</h1>
      <p style={{ color: "var(--ink-soft)", fontSize: 13.5, marginBottom: 20 }}>
        Trois informations suffisent pour commencer.
      </p>
      <form onSubmit={handleStep1Submit}>
        <label>Nom de l'entreprise</label>
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Menuiserie Roux" />
        <label>Secteur d'activité</label>
        <input required value={sector} onChange={(e) => setSector(e.target.value)} placeholder="Plomberie, menuiserie..." />
        <label>Ce que vous faites au quotidien</label>
        <textarea rows={3} value={mission} onChange={(e) => setMission(e.target.value)} />
        {error && <div className="error">{error}</div>}
        <button className="primary" type="submit" style={{ width: "100%", marginTop: 8 }}>
          Continuer →
        </button>
      </form>
    </div>
  );
}
