"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button, Card, CardTitle, Field, SelectField, TextareaField } from "@/components/ui";

type BusinessForm = {
  name: string;
  sector: string;
  mission: string;
  tone: "pro" | "chaleureux" | "direct";
  tauxHoraire: string;
  accountantEmail: string;
  siret: string;
  conditionsPaiement: string;
};

const EMPTY_FORM: BusinessForm = {
  name: "",
  sector: "",
  mission: "",
  tone: "pro",
  tauxHoraire: "40",
  accountantEmail: "",
  siret: "",
  conditionsPaiement: "",
};

export default function ParametresPage() {
  const [form, setForm] = useState<BusinessForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/business")
      .then((res) => res.json())
      .then((data) => {
        const b = data.business;
        setForm({
          name: b?.name || "",
          sector: b?.sector || "",
          mission: b?.mission || "",
          tone: b?.tone || "pro",
          tauxHoraire: String(b?.tauxHoraire ?? 40),
          accountantEmail: b?.accountantEmail || "",
          siret: b?.siret || "",
          conditionsPaiement: b?.conditionsPaiement || "",
        });
      });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setError("");
    setSaved(false);
    setSaving(true);
    try {
      const res = await fetch("/api/business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          sector: form.sector,
          mission: form.mission || undefined,
          tone: form.tone,
          tauxHoraire: Number(form.tauxHoraire) || 0,
          accountantEmail: form.accountantEmail,
          siret: form.siret || undefined,
          conditionsPaiement: form.conditionsPaiement || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Impossible d'enregistrer — vérifiez les champs.");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Impossible de joindre le serveur — réessayez.");
    } finally {
      setSaving(false);
    }
  }

  if (!form) {
    return (
      <div className="nova-page">
        <header className="nova-page-header">
          <h1>Paramètres</h1>
        </header>
        <Card>
          <p className="nova-page-subtitle">Chargement...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="nova-page">
      <header className="nova-page-header">
        <h1>Paramètres</h1>
        <p className="nova-page-subtitle">Profil de votre entreprise</p>
      </header>

      <Card>
        <CardTitle>Profil entreprise</CardTitle>
        <form onSubmit={handleSubmit}>
          <Field
            label="Nom de l'entreprise"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Field
            label="Secteur d'activité"
            required
            value={form.sector}
            onChange={(e) => setForm({ ...form, sector: e.target.value })}
            placeholder="Plomberie, menuiserie..."
          />
          <TextareaField
            label="Ce que vous faites au quotidien"
            rows={3}
            value={form.mission}
            onChange={(e) => setForm({ ...form, mission: e.target.value })}
          />
          <SelectField
            label="Ton des textes générés par l'IA"
            value={form.tone}
            onChange={(e) => setForm({ ...form, tone: e.target.value as BusinessForm["tone"] })}
          >
            <option value="pro">Professionnel</option>
            <option value="chaleureux">Chaleureux</option>
            <option value="direct">Direct</option>
          </SelectField>
          <Field
            label="Taux horaire (€)"
            type="number"
            min="0"
            step="0.5"
            value={form.tauxHoraire}
            onChange={(e) => setForm({ ...form, tauxHoraire: e.target.value })}
          />
          <Field
            label="Email du comptable"
            type="email"
            value={form.accountantEmail}
            onChange={(e) => setForm({ ...form, accountantEmail: e.target.value })}
            hint="Pour l'envoi du rapport stratégique (copilote financier)."
          />
          <Field
            label="SIRET"
            value={form.siret}
            onChange={(e) => setForm({ ...form, siret: e.target.value })}
            hint="Affiché sur vos factures."
          />
          <TextareaField
            label="Conditions de paiement"
            rows={2}
            value={form.conditionsPaiement}
            onChange={(e) => setForm({ ...form, conditionsPaiement: e.target.value })}
            placeholder="Paiement sous 30 jours"
            hint="Affiché en pied de page de vos factures."
          />
          {error && <div className="error">{error}</div>}
          {saved && <div className="nova-save-confirm">Modifications enregistrées.</div>}
          <Button type="submit" disabled={saving}>
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
