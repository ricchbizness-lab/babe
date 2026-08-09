"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [sector, setSector] = useState("");
  const [mission, setMission] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim() || !sector.trim()) {
      setError("Indiquez au moins le nom et le secteur.");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/business", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, sector, mission, tone: "pro", tauxHoraire: 40 }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("Impossible d'enregistrer le profil.");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <div className="card">
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Créons votre profil entreprise</h1>
      <p style={{ color: "var(--ink-soft)", fontSize: 13.5, marginBottom: 20 }}>
        Trois informations suffisent pour commencer.
      </p>
      <form onSubmit={handleSubmit}>
        <label>Nom de l'entreprise</label>
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Menuiserie Roux" />
        <label>Secteur d'activité</label>
        <input required value={sector} onChange={(e) => setSector(e.target.value)} placeholder="Plomberie, menuiserie..." />
        <label>Ce que vous faites au quotidien</label>
        <textarea rows={3} value={mission} onChange={(e) => setMission(e.target.value)} />
        {error && <div className="error">{error}</div>}
        <button className="primary" type="submit" disabled={loading} style={{ width: "100%", marginTop: 8 }}>
          {loading ? "Création..." : "Créer mon espace →"}
        </button>
      </form>
    </div>
  );
}
