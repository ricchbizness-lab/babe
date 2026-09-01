"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, Banknote, Building2, CreditCard, Grid2x2, Mail, Trash2, Upload, UserCog, Users } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardTitle,
  Field,
  SelectField,
  Skeleton,
  Tabs,
  TextareaField,
  useToast,
  NAV_ITEMS,
  SOON_ITEMS,
  type BadgeTone,
} from "@/components/ui";
import { fetchWithAuth } from "@/lib/fetchClient";

type BusinessForm = {
  name: string;
  sector: string;
  mission: string;
  tone: "pro" | "chaleureux" | "direct";
  tauxHoraire: string;
  accountantEmail: string;
  siret: string;
  formeJuridique: string;
  capitalSocial: string;
  codeAPE: string;
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
  formeJuridique: "",
  capitalSocial: "",
  codeAPE: "",
  conditionsPaiement: "",
  logoBase64: "",
};

const LOGO_MAX_BYTES = 2 * 1024 * 1024;
const LOGO_ALLOWED_TYPES = ["image/png", "image/jpeg"];

type UserInfo = { email: string; firstName: string | null; lastName: string | null };
type SubscriptionInfo = { plan: string; status: string; currentPeriodEnd: string | null } | null;

const PLAN_LABEL: Record<string, string> = { essentiel: "Essentiel", pro: "Pro", premium: "Premium" };
const STATUS_LABEL: Record<string, string> = { inactive: "Inactif", active: "Actif", past_due: "Paiement en retard", canceled: "Résilié" };
const STATUS_TONE: Record<string, BadgeTone> = { inactive: "neutral", active: "success", past_due: "danger", canceled: "neutral" };

const TABS: { key: "entreprise" | "utilisateurs" | "modules" | "notifications" | "abonnement"; label: string }[] = [
  { key: "entreprise", label: "Mon entreprise" },
  { key: "utilisateurs", label: "Utilisateurs" },
  { key: "modules", label: "Modules" },
  { key: "notifications", label: "Notifications" },
  { key: "abonnement", label: "Abonnement" },
];

export default function ParametresPage() {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("entreprise");
  const [form, setForm] = useState<BusinessForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [logoError, setLogoError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<UserInfo | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo>(null);
  const [subscriptionLoaded, setSubscriptionLoaded] = useState(false);
  const [managingSubscription, setManagingSubscription] = useState(false);

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
          formeJuridique: b?.formeJuridique || "",
          capitalSocial: b?.capitalSocial != null ? String(b.capitalSocial) : "",
          codeAPE: b?.codeAPE || "",
          conditionsPaiement: b?.conditionsPaiement || "",
          logoBase64: b?.logoBase64 || "",
        });
      });
    fetchWithAuth("/api/user")
      .then((res) => res.json())
      .then((data) => setUser(data.user));
    fetchWithAuth("/api/subscription")
      .then((res) => res.json())
      .then((data) => {
        setSubscription(data.subscription);
        setSubscriptionLoaded(true);
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
          formeJuridique: form.formeJuridique || undefined,
          capitalSocial: form.capitalSocial ? Number(form.capitalSocial) : undefined,
          codeAPE: form.codeAPE || undefined,
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

  async function handleManageSubscription() {
    setManagingSubscription(true);
    try {
      const res = await fetchWithAuth("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: subscription?.plan || "pro" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Impossible d'ouvrir la gestion de l'abonnement.");
        return;
      }
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      toast.error("Impossible de joindre le serveur — réessayez.");
    } finally {
      setManagingSubscription(false);
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
        <p className="nova-page-subtitle">Profil de votre entreprise et de votre compte</p>
      </header>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === "entreprise" && (
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
            <Field label="Nom de l'entreprise" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
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
              Facturation et mentions légales
            </CardTitle>
            <Field
              label="Taux horaire (€)"
              type="number"
              min="0"
              step="0.5"
              value={form.tauxHoraire}
              onChange={(e) => setForm({ ...form, tauxHoraire: e.target.value })}
            />
            <Field label="SIRET" value={form.siret} onChange={(e) => setForm({ ...form, siret: e.target.value })} hint="Affiché sur vos factures." />
            <SelectField
              label="Forme juridique"
              value={form.formeJuridique}
              onChange={(e) => setForm({ ...form, formeJuridique: e.target.value })}
            >
              <option value="">Non renseignée</option>
              <option value="auto-entrepreneur">Auto-entrepreneur</option>
              <option value="EI">Entreprise individuelle (EI)</option>
              <option value="EURL">EURL</option>
              <option value="SARL">SARL</option>
              <option value="SAS">SAS</option>
              <option value="SASU">SASU</option>
              <option value="autre">Autre</option>
            </SelectField>
            <Field
              label="Capital social (€)"
              type="number"
              min="0"
              step="100"
              value={form.capitalSocial}
              onChange={(e) => setForm({ ...form, capitalSocial: e.target.value })}
              hint="Laisser vide si non applicable (auto-entreprise, EI...)."
            />
            <Field
              label="Code APE"
              value={form.codeAPE}
              onChange={(e) => setForm({ ...form, codeAPE: e.target.value })}
              placeholder="4120A"
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
      )}

      {tab === "utilisateurs" && (
        <Card>
          <CardTitle>
            <Users size={16} strokeWidth={1.75} />
            Utilisateurs
          </CardTitle>
          {user === null ? (
            <Skeleton style={{ height: 60 }} />
          ) : (
            <div className="nova-detail-list">
              <div>
                <dt>Compte</dt>
                <dd>{[user.firstName, user.lastName].filter(Boolean).join(" ") || user.email}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{user.email}</dd>
              </div>
            </div>
          )}
          <p className="nova-page-subtitle" style={{ marginTop: 16 }}>
            NOVA ne prend pour l'instant en charge qu'un seul utilisateur par entreprise — l'invitation de
            collaborateurs avec leur propre accès n'est pas encore disponible.
          </p>
          <Link href="/dashboard/compte" className="nova-btn nova-btn-secondary">
            <UserCog size={16} strokeWidth={1.75} />
            Gérer mon compte
          </Link>
        </Card>
      )}

      {tab === "modules" && (
        <Card>
          <CardTitle>
            <Grid2x2 size={16} strokeWidth={1.75} />
            Modules
          </CardTitle>
          <p className="nova-analyse-intro">Modules actifs sur votre espace.</p>
          <ul className="nova-module-list">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <span>{item.label}</span>
                <Badge tone="success">Actif</Badge>
              </li>
            ))}
          </ul>
          <p className="nova-analyse-intro" style={{ marginTop: 24 }}>
            Bientôt disponible.
          </p>
          <ul className="nova-module-list">
            {SOON_ITEMS.map((item) => (
              <li key={item.label}>
                <span>{item.label}</span>
                <Badge tone="neutral">Prochainement</Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {tab === "notifications" && (
        <Card>
          <CardTitle>
            <Bell size={16} strokeWidth={1.75} />
            Préférences de notification
          </CardTitle>
          <p className="nova-page-subtitle">Bientôt disponible — vous pourrez bientôt choisir quels événements déclenchent une notification.</p>
        </Card>
      )}

      {tab === "abonnement" && (
        <Card>
          <CardTitle>
            <CreditCard size={16} strokeWidth={1.75} />
            Abonnement
          </CardTitle>
          {!subscriptionLoaded ? (
            <Skeleton style={{ height: 60 }} />
          ) : (
            <>
              <div className="nova-detail-list">
                <div>
                  <dt>Palier actuel</dt>
                  <dd>{PLAN_LABEL[subscription?.plan || "essentiel"] || subscription?.plan}</dd>
                </div>
                <div>
                  <dt>Statut</dt>
                  <dd>
                    <Badge tone={STATUS_TONE[subscription?.status || "inactive"]}>
                      {STATUS_LABEL[subscription?.status || "inactive"]}
                    </Badge>
                  </dd>
                </div>
                {subscription?.currentPeriodEnd && (
                  <div>
                    <dt>Renouvellement</dt>
                    <dd>{new Date(subscription.currentPeriodEnd).toLocaleDateString("fr-FR")}</dd>
                  </div>
                )}
              </div>
              <Button onClick={handleManageSubscription} disabled={managingSubscription} style={{ marginTop: 16 }}>
                <CreditCard size={16} strokeWidth={1.75} />
                {managingSubscription ? "Redirection..." : "Gérer l'abonnement"}
              </Button>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
