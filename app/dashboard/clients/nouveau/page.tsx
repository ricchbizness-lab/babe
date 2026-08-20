"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Breadcrumb, Button, Card, Field, TextareaField, useToast } from "@/components/ui";
import { fetchWithAuth } from "@/lib/fetchClient";
import { clearFormDraft, useFormDraft } from "@/lib/formDraft";

const DRAFT_KEY = "nova_draft_client";

export default function NewClientPage() {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", notes: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useFormDraft(DRAFT_KEY, form, setForm);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetchWithAuth("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const message = "Impossible de créer le client — vérifiez les champs.";
        setError(message);
        toast.error(message);
        return;
      }
      const data = await res.json();
      clearFormDraft(DRAFT_KEY);
      toast.success("Client créé");
      router.refresh();
      router.push(`/dashboard/clients/${data.client.id}`);
    } catch {
      const message = "Impossible de joindre le serveur — réessayez.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="nova-page">
      <Breadcrumb items={[{ label: "Clients", href: "/dashboard/clients" }, { label: "Nouveau client" }]} />

      <header className="nova-page-header">
        <h1>Nouveau client</h1>
      </header>

      <Card>
        <form onSubmit={handleSubmit}>
          <Field
            label="Nom"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Jean Dupont"
          />
          <Field
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="jean.dupont@exemple.fr"
          />
          <Field
            label="Téléphone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="06 12 34 56 78"
          />
          <Field
            label="Adresse"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="12 rue des Lilas, 75011 Paris"
          />
          <TextareaField
            label="Notes"
            rows={3}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          {error && <div className="error">{error}</div>}
          <Button type="submit" disabled={loading}>
            {loading ? "Création..." : "Créer le client"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
