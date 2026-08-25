"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Banknote, Building2, Mail, Trash2, Upload, UserCog } from "lucide-react";
import { Button, Card, CardTitle, Field, SelectField, TextareaField, useToast } from "@/components/ui";
import { fetchWithAuth } from "@/lib/fetchClient";

type BusinessForm = {
  name: string;
  sector: string;
  mission: string;
  tone: "pro" | "chaleureux" | "direct";
  tauxHoraire: string;
  accountantEmail: string;
  siret: string;
  conditionsPaiement: string;
  logoBase64: string;
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
  logoBase64: "",
};

const LOGO_MAX_BYTES = 2 * 1024 * 1024;
const LOGO_ALLOWED_TYPES = ["image/png", "image/jpeg"];

export default function ParametresPage() {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState<BusinessForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [logoError, setLogoError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchWithAuth("/api/business")
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
          logoBase64: b?.logoBase64 || "",
        });
      });
  }, []);

  function handleLogoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !form) return;
    setLogoError("");
    if (!LOGO_ALLOWED_TYPES.includes(file.type)) {
      setLogoError("Format non supporté — utilisez un fichier PNG ou JPG.");
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      setLogoError("Fichier trop volumineux — 2 Mo maximum.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => (prev ? { ...prev, logoBase64: String(reader.result) } : prev));
    };
    reader.readAsDataURL(file);
  }

  function handleRemoveLogo() {
    setForm((prev) => (prev ? { ...prev, logoBase64: "" } : prev));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setError("");
    setSaving(true);
    try {
      const res = await fetchWithAuth("/api/business", {
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
          logoBase64: form.logoBase64,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message = data.error || "Impossible d'enregistrer — vérifiez les champs.";
        setError(message);
        toast.error(message);
        return;
      }
      toast.success("Paramètres enregistrés");
      router.refresh();
    } catch {
      const message = "Impossible de joindre le serveur — réessayez.";
      setError(message);
      toast.error(message);
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

      <form onSubmit={handleSubmit} className="nova-settings-form">
        <Card>
          <CardTitle>
            <Building2 size={16} strokeWidth={1.75} />
            Profil entreprise
          </CardTitle>
          <div className="nova-logo-upload">
            <div className="nova-logo-upload-preview">
              {form.logoBase64 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.logoBase64} alt="Logo de l'entreprise" />
              ) : (
                <span className="nova-logo-upload-placeholder">Aucun logo</span>
              )}
            </div>
            <div className="nova-logo-upload-actions">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleLogoChange}
                className="nova-visually-hidden"
                id="logo-upload-input"
              />
              <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                <Upload size={16} strokeWidth={1.75} />
                {form.logoBase64 ? "Changer le logo" : "Ajouter un logo"}
              </Button>
              {form.logoBase64 && (
                <Button type="button" variant="ghost" onClick={handleRemoveLogo}>
                  <Trash2 size={16} strokeWidth={1.75} />
                  Retirer
                </Button>
              )}
              <p className="nova-hint-standalone">PNG ou JPG, 2 Mo maximum. Enregistré avec le profil ci-dessous.</p>
              {logoError && <div className="error">{logoError}</div>}
            </div>
          </div>
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
        </Card>

        <Card>
          <CardTitle>
            <Mail size={16} strokeWidth={1.75} />
            Communication
          </CardTitle>
          <Field
            label="Email du comptable"
            type="email"
            value={form.accountantEmail}
            onChange={(e) => setForm({ ...form, accountantEmail: e.target.value })}
            hint="Pour l'envoi du rapport stratégique (copilote financier)."
          />
        </Card>

        <Card>
          <CardTitle>
            <Banknote size={16} strokeWidth={1.75} />
            Facturation
          </CardTitle>
          <Field
            label="Taux horaire (€)"
            type="number"
            min="0"
            step="0.5"
            value={form.tauxHoraire}
            onChange={(e) => setForm({ ...form, tauxHoraire: e.target.value })}
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
        </Card>

        {error && <div className="error">{error}</div>}
        <Button type="submit" disabled={saving}>
          {saving ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </form>

      <Card>
        <CardTitle>
          <UserCog size={16} strokeWidth={1.75} />
          Compte
        </CardTitle>
        <p className="nova-page-subtitle">Email de connexion, mot de passe et informations personnelles.</p>
        <Link href="/dashboard/compte" className="nova-btn nova-btn-secondary">
          Gérer mon compte
        </Link>
      </Card>
    </div>
  );
}
