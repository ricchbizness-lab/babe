"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Sparkles } from "lucide-react";
import { Badge, BackLink, Button, Card, Field, Skeleton, SelectField, TextareaField, useToast } from "@/components/ui";

type ClientOption = { id: string; name: string };
type GenError = "no-key" | "no-subscription" | "other" | null;

const GEN_ERROR_MESSAGE: Record<Exclude<GenError, null>, string> = {
  "no-key": "La génération IA n'est pas encore configurée pour cet environnement. Vous pouvez rédiger le devis vous-même ci-dessous.",
  "no-subscription": "La génération IA est réservée aux abonnements actifs. Vous pouvez rédiger le devis vous-même ci-dessous.",
  other: "La génération a échoué, réessayez dans un instant — ou rédigez le devis vous-même ci-dessous.",
};

export default function NewDevisPage() {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [form, setForm] = useState({ label: "", clientId: "", amount: "", description: "" });
  const [stepError, setStepError] = useState("");

  const [content, setContent] = useState("");
  const [aiGenerated, setAiGenerated] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<GenError>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    fetch("/api/clients")
      .then((res) => res.json())
      .then((data) => setClients(data.clients ?? []));
  }, []);

  function goToStep2(e: FormEvent) {
    e.preventDefault();
    if (!form.label.trim()) {
      setStepError("Indiquez au moins un intitulé pour le devis.");
      return;
    }
    setStepError("");
    setStep(2);
  }

  async function handleGenerate() {
    setGenerating(true);
    setGenError(null);
    const clientName = clients.find((c) => c.id === form.clientId)?.name;
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: "devis",
          input: {
            label: form.label,
            client: clientName,
            montant: form.amount ? Number(form.amount) : undefined,
            description: form.description,
          },
        }),
      });
      if (!res.ok) {
        const kind: Exclude<GenError, null> = res.status === 503 ? "no-key" : res.status === 402 ? "no-subscription" : "other";
        setGenError(kind);
        toast.error("Erreur de génération IA — " + GEN_ERROR_MESSAGE[kind]);
        return;
      }
      const data = await res.json();
      setContent(data.result || "");
      setAiGenerated(true);
    } catch {
      setGenError("other");
      toast.error("Erreur de génération IA — impossible de joindre le serveur.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch("/api/devis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: form.label,
          clientId: form.clientId || undefined,
          amount: form.amount ? Number(form.amount) : undefined,
          description: form.description || undefined,
          content,
        }),
      });
      if (!res.ok) {
        const message = "Impossible d'enregistrer le devis — vérifiez les champs.";
        setSaveError(message);
        toast.error(message);
        return;
      }
      const data = await res.json();
      toast.success("Devis créé");
      router.push(`/dashboard/devis/${data.devis.id}`);
    } catch {
      const message = "Impossible de joindre le serveur — réessayez.";
      setSaveError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="nova-page">
      <BackLink href="/dashboard/devis" label="Retour aux devis" />

      <header className="nova-page-header">
        <h1>Nouveau devis</h1>
      </header>

      <div className="nova-step-indicator">
        <span className={`nova-step-dot ${step >= 1 ? "nova-step-dot-done" : ""}`} />
        Étape {step} sur 2 — {step === 1 ? "Informations de base" : "Contenu du devis"}
        <span className={`nova-step-dot ${step === 2 ? "nova-step-dot-active" : ""}`} />
      </div>

      {step === 1 && (
        <Card>
          <form onSubmit={goToStep2}>
            <Field
              label="Intitulé du devis"
              required
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
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
              label="Montant estimé (€)"
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="8400"
            />
            <TextareaField
              label="Description de la prestation"
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Dépose de l'ancienne couverture, pose de tuiles neuves, zinguerie..."
              hint="Ces détails servent de base à la génération IA à l'étape suivante."
            />
            {stepError && <div className="error">{stepError}</div>}
            <Button type="submit">Suivant →</Button>
          </form>
        </Card>
      )}

      {step === 2 && (
        <>
          <Card accent={false} className="nova-ai-zone">
            <div className="nova-ai-zone-header">
              {aiGenerated ? <Badge tone="teal">Généré par Nova</Badge> : <span className="nova-page-subtitle">Contenu du devis</span>}
              <Button
                type="button"
                variant="secondary"
                onClick={handleGenerate}
                disabled={generating}
              >
                {aiGenerated ? <RefreshCw size={15} strokeWidth={1.75} /> : <Sparkles size={15} strokeWidth={1.75} />}
                {generating ? "Génération..." : aiGenerated ? "Régénérer" : "Générer avec Nova"}
              </Button>
            </div>

            {generating ? (
              <div className="nova-ai-loading">
                <p className="nova-ai-loading-label">Nova rédige votre devis...</p>
                <Skeleton style={{ height: 220 }} />
              </div>
            ) : (
              <textarea
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  setAiGenerated(false);
                }}
                rows={10}
                placeholder="Cliquez sur « Générer avec Nova », ou rédigez directement le contenu du devis ici."
              />
            )}

            {genError && <div className="nova-info-banner">{GEN_ERROR_MESSAGE[genError]}</div>}
          </Card>

          {saveError && <div className="error">{saveError}</div>}

          <div className="nova-wizard-actions">
            <Button type="button" variant="secondary" onClick={() => setStep(1)}>
              ← Précédent
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving || !content.trim()}>
              {saving ? "Enregistrement..." : "Enregistrer le devis"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
