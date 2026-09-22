"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut, Settings } from "lucide-react";
import { Breadcrumb, Button, Card, CardTitle, Field, SelectField, useToast } from "@/components/ui";
import { fetchWithAuth } from "@/lib/fetchClient";
import { getInitials } from "@/lib/userDisplay";
import { LOCALE_FLAG, LOCALE_LABEL, SUPPORTED_LOCALES, type Locale } from "@/lib/i18n";

type UserProfile = { id: string; email: string; firstName: string | null; lastName: string | null; langue: string };

export default function ComptePage() {
  const router = useRouter();
  const toast = useToast();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [form, setForm] = useState({ firstName: "", lastName: "" });
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [savingLangue, setSavingLangue] = useState(false);

  useEffect(() => {
    fetchWithAuth("/api/user")
      .then((res) => res.json())
      .then((data) => {
        setUser(data.user);
        setForm({ firstName: data.user?.firstName || "", lastName: data.user?.lastName || "" });
      });
  }, []);

  async function handleLangueChange(langue: Locale) {
    if (!user) return;
    setSavingLangue(true);
    try {
      const res = await fetchWithAuth("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ langue }),
      });
      if (!res.ok) {
        toast.error("Impossible d'enregistrer la langue.");
        return;
      }
      const data = await res.json();
      setUser(data.user);
      toast.success("Langue mise à jour");
      router.refresh();
    } catch {
      toast.error("Impossible de joindre le serveur — réessayez.");
    } finally {
      setSavingLangue(false);
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetchWithAuth("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        toast.error("Impossible d'enregistrer les modifications.");
        return;
      }
      const data = await res.json();
      setUser(data.user);
      toast.success("Profil mis à jour");
      router.refresh();
    } catch {
      toast.error("Impossible de joindre le serveur — réessayez.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    await signOut({ callbackUrl: "/login" });
  }

  if (!user) {
    return (
      <div className="nova-page">
        <Breadcrumb items={[{ label: "Mon compte" }]} />
        <Card>
          <p className="nova-page-subtitle">Chargement...</p>
        </Card>
      </div>
    );
  }

  const initials = getInitials(user.firstName, user.lastName, user.email);
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");

  return (
    <div className="nova-page">
      <Breadcrumb items={[{ label: "Mon compte" }]} />

      <header className="nova-page-header">
        <h1>Mon compte</h1>
      </header>

      <Card>
        <div className="nova-account-header">
          <span className="nova-account-avatar">{initials}</span>
          <div>
            <div className="nova-account-name">{fullName || "Nom non renseigné"}</div>
            <p className="nova-page-subtitle">{user.email}</p>
          </div>
        </div>
      </Card>

      <Card>
        <CardTitle>Informations personnelles</CardTitle>
        <form onSubmit={handleSave}>
          <Field label="Email" value={user.email} disabled hint="Non modifiable" />
          <Field
            label="Prénom"
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            placeholder="Jean"
          />
          <Field
            label="Nom"
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            placeholder="Dupont"
          />
          <Button type="submit" disabled={saving}>
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </form>
      </Card>

      <Card>
        <CardTitle>Langue de l'interface</CardTitle>
        <SelectField
          label="Langue"
          value={user.langue}
          disabled={savingLangue}
          onChange={(e) => handleLangueChange(e.target.value as Locale)}
          hint="S'applique à la navigation, aux pages Tâches, Rapports vocaux et Planning."
        >
          {SUPPORTED_LOCALES.map((locale) => (
            <option key={locale} value={locale}>
              {LOCALE_FLAG[locale]} {LOCALE_LABEL[locale]}
            </option>
          ))}
        </SelectField>
      </Card>

      <Card>
        <CardTitle>Entreprise</CardTitle>
        <Link href="/dashboard/parametres" className="nova-inline-link">
          <Settings size={14} strokeWidth={1.75} style={{ verticalAlign: "-2px", marginRight: 4 }} />
          Paramètres entreprise
        </Link>
      </Card>

      <Card>
        <CardTitle>Session</CardTitle>
        <Button variant="danger" disabled={signingOut} onClick={handleSignOut}>
          <LogOut size={16} strokeWidth={1.75} />
          {signingOut ? "Déconnexion..." : "Se déconnecter"}
        </Button>
      </Card>
    </div>
  );
}
