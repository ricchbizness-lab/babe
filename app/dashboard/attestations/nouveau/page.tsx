"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Breadcrumb, Button, Card, Field, SelectField, useToast } from "@/components/ui";
import { fetchWithAuth } from "@/lib/fetchClient";
import { TYPE_LOGEMENT_LABEL, USAGE_LOGEMENT_LABEL } from "@/lib/attestationTva";

type ClientOption = { id: string; name: string };
type DevisOption = { id: string; label: string; clientId: string | null };

export default function NewAttestationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const [clients, setClients] = useState<ClientOption[] | null>(null);
  const [devisList, setDevisList] = useState<DevisOption[] | null>(null);
  const [form, setForm] = useState({
    clientId: searchParams.get("clientId") || "",
    devisId: searchParams.get("devisId") || "",
    adresseTravaux: "",
    dateConstruction: "",
    typeLogement: "maison",
    usageLogement: "residence_principale",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchWithAuth("/api/clients")
      .then((res) => res.json())
      .then((data) => setClients((data.clients ?? []).map((c: ClientOption) => ({ id: c.id, name: c.name }))));
    fetchWithAuth("/api/devis")
      .then((res) => res.json())
      .then((data) =>
        setDevisList((data.devis ?? []).map((d: { id: string; label: string; client: { id: string } | null }) => ({
          id: d.id,
          label: d.label,
          clientId: d.client?.id || null,
        })))
      );
  }, []);

  const devisForClient = (devisList ?? []).filter((d) => !form.clientId || d.clientId === form.clientId);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.clientId) {
      setError("Sélectionnez un client.");
      return;
    }
    if (!form.adresseTravaux.trim()) {
      setError("Renseignez l'adresse des travaux.");
      return;
    }
    if (!form.dateConstruction.trim()) {
      setError("Renseignez la date de construction du logement.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetchWithAuth("/api/attestations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, devisId: form.devisId || undefined }),
      });
      if (!res.ok) {
        const message = "Impossible de créer l'attestation — vérifiez les champs.";
        setError(message);
        toast.error(message);
        return;
      }
      const data = await res.json();
      toast.success("Attestation créée");
      router.push(`/dashboard/attestations/${data.attestation.id}/imprimer`);
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
      <Breadcrumb items={[{ label: "Attestations TVA", href: "/dashboard/attestations" }, { label: "Nouvelle attestation" }]} />

      <header className="nova-page-header">
        <h1>Nouvelle attestation TVA</h1>
        <p className="nova-page-subtitle">
          Attestation simplifiée de TVA à taux réduit (art. 279-0 bis du CGI) — à faire signer par le client avant
          facturation à 10%.
        </p>
      </header>

      <Card>
        <form onSubmit={handleSubmit}>
          <SelectField
            label="Client *"
            required
            value={form.clientId}
            onChange={(e) => setForm({ ...form, clientId: e.target.value, devisId: "" })}
          >
            <option value="">Sélectionner un client</option>
            {(clients ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </SelectField>

          <SelectField
            label="Devis lié (optionnel)"
            value={form.devisId}
            onChange={(e) => setForm({ ...form, devisId: e.target.value })}
          >
            <option value="">Aucun devis lié</option>
            {devisForClient.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </SelectField>

          <Field
            label="Adresse des travaux *"
            required
            value={form.adresseTravaux}
            onChange={(e) => setForm({ ...form, adresseTravaux: e.target.value })}
            placeholder="12 rue des Lilas, 75011 Paris"
          />

          <Field
            label="Date de construction du logement *"
            required
            value={form.dateConstruction}
            onChange={(e) => setForm({ ...form, dateConstruction: e.target.value })}
            placeholder="avant 1990"
            hint="Le logement doit être achevé depuis plus de 2 ans."
          />

          <SelectField
            label="Type de logement *"
            required
            value={form.typeLogement}
            onChange={(e) => setForm({ ...form, typeLogement: e.target.value })}
          >
            {Object.entries(TYPE_LOGEMENT_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectField>

          <SelectField
            label="Usage du logement *"
            required
            value={form.usageLogement}
            onChange={(e) => setForm({ ...form, usageLogement: e.target.value })}
          >
            {Object.entries(USAGE_LOGEMENT_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectField>

          {error && <div className="error">{error}</div>}
          <Button type="submit" disabled={loading}>
            {loading ? "Création..." : "Créer l'attestation"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
