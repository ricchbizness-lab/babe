"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Breadcrumb, Button, Card, DatePickerField, Field, SelectField, useToast } from "@/components/ui";
import { fetchWithAuth } from "@/lib/fetchClient";
import { clearFormDraft, useFormDraft } from "@/lib/formDraft";

const DRAFT_KEY = "nova_draft_chantier";

type ClientOption = { id: string; name: string };

export default function NewChantierPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [form, setForm] = useState({
    name: searchParams.get("name") || "",
    clientId: searchParams.get("clientId") || "",
    address: "",
    status: "planifie",
    startDate: "",
    endDate: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useFormDraft(DRAFT_KEY, form, setForm);

  useEffect(() => {
    fetchWithAuth("/api/clients")
      .then((res) => res.json())
      .then((data) => setClients(data.clients ?? []));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetchWithAuth("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          clientId: form.clientId || undefined,
          address: form.address || undefined,
          status: form.status,
          startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
          endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
        }),
      });
      if (!res.ok) {
        const message = "Impossible de créer le chantier — vérifiez les champs.";
        setError(message);
        toast.error(message);
        return;
      }
      const data = await res.json();
      clearFormDraft(DRAFT_KEY);
      toast.success("Chantier créé");
      router.refresh();
      router.push(`/dashboard/chantiers/${data.project.id}`);
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
      <Breadcrumb items={[{ label: "Chantiers", href: "/dashboard/chantiers" }, { label: "Nouveau chantier" }]} />

      <header className="nova-page-header">
        <h1>Nouveau chantier</h1>
      </header>

      <Card>
        <form onSubmit={handleSubmit}>
          <Field
            label="Nom du chantier"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Rénovation toiture — 12 rue des Lilas"
          />
          <SelectField
            label="Client rattaché"
            value={form.clientId}
            onChange={(e) => setForm({ ...form, clientId: e.target.value })}
          >
            <option value="">Aucun client rattaché</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </SelectField>
          <Field
            label="Adresse"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="12 rue des Lilas, 75011 Paris"
          />
          <SelectField label="Statut" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="planifie">Planifié</option>
            <option value="en_cours">En cours</option>
            <option value="termine">Terminé</option>
            <option value="annule">Annulé</option>
          </SelectField>
          <DatePickerField
            label="Date de début"
            value={form.startDate}
            onChange={(value) => setForm({ ...form, startDate: value })}
          />
          <DatePickerField
            label="Date de fin"
            value={form.endDate}
            onChange={(value) => setForm({ ...form, endDate: value })}
          />
          {error && <div className="error">{error}</div>}
          <Button type="submit" disabled={loading}>
            {loading ? "Création..." : "Créer le chantier"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
