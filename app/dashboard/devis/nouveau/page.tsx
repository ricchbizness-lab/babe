"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Bot, BookOpen, Plus, Trash2 } from "lucide-react";
import {
  Badge,
  Breadcrumb,
  Button,
  Card,
  Field,
  SearchInput,
  SelectField,
  Skeleton,
  Table,
  TextareaField,
  useToast,
  type TableColumn,
} from "@/components/ui";
import { fetchWithAuth } from "@/lib/fetchClient";
import { computeDevisTotals, lineTotalHT, tvaByRate, type DevisLineLike } from "@/lib/devisTotals";
import { CLIENT_TYPE_TVA_LABEL, suggestedTvaRate, TYPE_TRAVAUX_TVA_LABEL } from "@/lib/tva";
import { OUVRAGE_TYPE_LABEL } from "@/lib/validation";

type ClientOption = { id: string; name: string; typeClient: string };
type OuvrageOption = { id: string; label: string; type: string; unite: string; prixUnitaireHT: number; tvaDefaut: number };
type GenError = "no-key" | "no-subscription" | "other" | null;

const GEN_ERROR_MESSAGE: Record<Exclude<GenError, null>, string> = {
  "no-key": "La génération IA n'est pas encore configurée pour cet environnement. Vous pouvez rédiger le devis vous-même.",
  "no-subscription": "La génération IA est réservée aux abonnements actifs. Vous pouvez rédiger le devis vous-même.",
  other: "La génération a échoué, réessayez dans un instant — ou rédigez le devis vous-même.",
};

type ClientTypeTVA = "particulier" | "professionnel" | "collectivite";
type TypeTravauxTVA = "renovation" | "neuf" | "energie" | "entretien";
type LineType = "prestation" | "materiel" | "deplacement" | "maindoeuvre" | "autre";

const LINE_TYPE_LABEL: Record<LineType, string> = {
  prestation: "Prestation",
  materiel: "Matériel",
  deplacement: "Déplacement",
  maindoeuvre: "Main d'œuvre",
  autre: "Autre",
};

const CLIENT_TYPE_ORDER: ClientTypeTVA[] = ["particulier", "professionnel", "collectivite"];
const TRAVAUX_ORDER: TypeTravauxTVA[] = ["renovation", "neuf", "energie", "entretien"];
const VALID_LINE_TYPES: LineType[] = ["prestation", "materiel", "deplacement", "maindoeuvre", "autre"];
const VALID_TVA_VALUES = [20, 10, 5.5];

const Q_TEXT = {
  objet: "Quel est l'objet des travaux ?",
  clientTypeTVA: "C'est chez un particulier ou un professionnel ?",
  typeTravauxTVA: "Quel type de travaux ?",
  precisions: "Des précisions ? Surface, matériaux, contraintes particulières...",
  budget: "Budget indicatif ?",
  clientId: "Pour quel client ?",
};

type Answers = {
  objet: string;
  clientTypeTVA: ClientTypeTVA | "";
  typeTravauxTVA: TypeTravauxTVA | "";
  precisions: string;
  budget: string;
  clientId: string;
};

const EMPTY_ANSWERS: Answers = {
  objet: "",
  clientTypeTVA: "",
  typeTravauxTVA: "",
  precisions: "",
  budget: "",
  clientId: "",
};

type HistoryEntry = { question: string; answer: string };

type LineDraft = {
  id: string;
  type: LineType;
  description: string;
  quantite: string;
  unite: string;
  prixUnitaireHT: string;
  tva: string;
};

function emptyLine(defaultTva: number): LineDraft {
  return {
    id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: "prestation",
    description: "",
    quantite: "1",
    unite: "",
    prixUnitaireHT: "",
    tva: String(defaultTva),
  };
}

type AiLigne = { type?: string; description?: string; quantite?: number; unite?: string; prixUnitaireHT?: number; tva?: number };
type AiDevisJson = { titre?: string; description?: string; lignes: AiLigne[]; conditions?: string };

/** Parse la réponse IA en JSON strict — l'IA peut occasionnellement entourer le JSON de balises ```json. Retourne null si le parsing échoue ou si la forme est invalide, pour déclencher le repli en texte brut. */
function parseAiDevisJson(raw: string): AiDevisJson | null {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  try {
    const obj = JSON.parse(cleaned);
    if (!obj || typeof obj !== "object" || !Array.isArray(obj.lignes) || obj.lignes.length === 0) return null;
    return obj as AiDevisJson;
  } catch {
    return null;
  }
}

function sanitizeLigne(l: AiLigne, index: number, fallbackTva: number): LineDraft {
  const type = VALID_LINE_TYPES.includes(l.type as LineType) ? (l.type as LineType) : "prestation";
  const tva = typeof l.tva === "number" && VALID_TVA_VALUES.includes(l.tva) ? l.tva : fallbackTva;
  return {
    id: `ai-${index}`,
    type,
    description: l.description || "Prestation",
    quantite: String(l.quantite && l.quantite > 0 ? l.quantite : 1),
    unite: l.unite || "forfait",
    prixUnitaireHT: String(l.prixUnitaireHT && l.prixUnitaireHT > 0 ? l.prixUnitaireHT : 1),
    tva: String(tva),
  };
}

function buildContentText(titre: string, description: string, lines: LineDraft[], notes: string): string {
  const parts = [`TITRE : ${titre || "Devis"}`];
  if (description.trim()) parts.push(description.trim());
  if (lines.length > 0) parts.push(lines.map((l) => `- ${l.description}`).join("\n"));
  if (notes.trim()) parts.push(notes.trim());
  return parts.join("\n\n");
}

export default function NewDevisPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const [clients, setClients] = useState<ClientOption[]>([]);
  useEffect(() => {
    fetchWithAuth("/api/clients")
      .then((res) => res.json())
      .then((data) => setClients(data.clients ?? []));
  }, []);

  // --- Phase 1 : questions ---
  const [phase, setPhase] = useState<"questions" | "review" | "fallback">("questions");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [textDraft, setTextDraft] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<GenError>(null);

  const canGenerate = answers.objet.trim() !== "" && answers.clientTypeTVA !== "" && answers.typeTravauxTVA !== "";

  function pushHistory(question: string, answer: string) {
    setHistory((h) => [...h, { question, answer }]);
  }

  function submitObjet(e: FormEvent) {
    e.preventDefault();
    const v = textDraft.trim();
    if (!v) return;
    setAnswers((a) => ({ ...a, objet: v }));
    pushHistory(Q_TEXT.objet, v);
    setTextDraft("");
    setStep(1);
  }

  function chooseClientType(value: ClientTypeTVA) {
    setAnswers((a) => ({ ...a, clientTypeTVA: value }));
    pushHistory(Q_TEXT.clientTypeTVA, CLIENT_TYPE_TVA_LABEL[value]);
    setStep(2);
  }

  function chooseTravaux(value: TypeTravauxTVA) {
    setAnswers((a) => ({ ...a, typeTravauxTVA: value }));
    pushHistory(Q_TEXT.typeTravauxTVA, TYPE_TRAVAUX_TVA_LABEL[value]);
    setStep(3);
  }

  function submitPrecisions(e: FormEvent) {
    e.preventDefault();
    const v = textDraft.trim();
    setAnswers((a) => ({ ...a, precisions: v }));
    pushHistory(Q_TEXT.precisions, v || "—");
    setTextDraft("");
    setStep(4);
  }
  function skipPrecisions() {
    setAnswers((a) => ({ ...a, precisions: "" }));
    pushHistory(Q_TEXT.precisions, "—");
    setTextDraft("");
    setStep(4);
  }

  function submitBudget(e: FormEvent) {
    e.preventDefault();
    const v = textDraft.trim();
    setAnswers((a) => ({ ...a, budget: v }));
    pushHistory(Q_TEXT.budget, v ? `${Number(v).toLocaleString("fr-FR")} €` : "—");
    setTextDraft("");
    goToClientStepOrSkip();
  }
  function skipBudget() {
    setAnswers((a) => ({ ...a, budget: "" }));
    pushHistory(Q_TEXT.budget, "—");
    setTextDraft("");
    goToClientStepOrSkip();
  }

  function chooseClient(clientId: string) {
    const client = clients.find((c) => c.id === clientId);
    setAnswers((a) => ({ ...a, clientId }));
    pushHistory(Q_TEXT.clientId, client?.name || "—");
    setStep(6);
  }
  function skipClient() {
    setAnswers((a) => ({ ...a, clientId: "" }));
    pushHistory(Q_TEXT.clientId, "Sans client");
    setStep(6);
  }

  // Arrivée depuis la fiche d'un client ("Nouveau devis" avec ?clientId=...)
  // — inutile de reposer la question, on l'enregistre directement.
  function goToClientStepOrSkip() {
    const urlClientId = searchParams.get("clientId");
    if (urlClientId && clients.some((c) => c.id === urlClientId)) {
      chooseClient(urlClientId);
    } else {
      setStep(5);
    }
  }

  // --- Phase 2 : lignes générées ---
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([]);
  const [fallbackContent, setFallbackContent] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [ouvragePickerOpen, setOuvragePickerOpen] = useState(false);
  const [ouvrageOptions, setOuvrageOptions] = useState<OuvrageOption[] | null>(null);
  const [ouvrageQuery, setOuvrageQuery] = useState("");

  useEffect(() => {
    if (!ouvragePickerOpen || ouvrageOptions !== null) return;
    fetchWithAuth("/api/ouvrages")
      .then((res) => res.json())
      .then((data) => setOuvrageOptions(data.ouvrages ?? []));
  }, [ouvragePickerOpen, ouvrageOptions]);

  async function handleGenerate() {
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetchWithAuth("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: "devis",
          input: {
            objet: answers.objet,
            typeClient: answers.clientTypeTVA,
            typeTravaux: answers.typeTravauxTVA,
            precisions: answers.precisions || undefined,
            budget: answers.budget ? Number(answers.budget) : undefined,
            clientId: answers.clientId || undefined,
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
      const raw = data.result || "";
      const parsed = parseAiDevisJson(raw);
      const fallbackTva = suggestedTvaRate(answers.typeTravauxTVA, answers.clientTypeTVA);
      if (parsed) {
        setTitre(parsed.titre || answers.objet);
        setDescription(parsed.description || "");
        setNotes(parsed.conditions || "");
        setLines(parsed.lignes.map((l, i) => sanitizeLigne(l, i, fallbackTva)));
        setPhase("review");
      } else {
        setTitre(answers.objet);
        setFallbackContent(raw);
        setPhase("fallback");
      }
    } catch {
      setGenError("other");
      toast.error("Erreur de génération IA — impossible de joindre le serveur.");
    } finally {
      setGenerating(false);
    }
  }

  function updateLine(id: string, patch: Partial<LineDraft>) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function removeLine(id: string) {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }

  function addManualLine() {
    setLines((prev) => [...prev, emptyLine(suggestedTvaRate(answers.typeTravauxTVA, answers.clientTypeTVA))]);
  }

  function addFromOuvrage(o: OuvrageOption) {
    setLines((prev) => [
      ...prev,
      {
        id: `ouvrage-${o.id}-${Date.now()}`,
        type: "prestation",
        description: o.label,
        quantite: "1",
        unite: o.unite,
        prixUnitaireHT: String(o.prixUnitaireHT),
        tva: String(o.tvaDefaut),
      },
    ]);
    setOuvragePickerOpen(false);
    setOuvrageQuery("");
  }

  const numericLines: DevisLineLike[] = lines.map((l) => ({
    quantite: Number(l.quantite) || 0,
    prixUnitaire: Number(l.prixUnitaireHT) || 0,
    tva: Number(l.tva) || 0,
  }));
  const totals = computeDevisTotals(numericLines, 0);
  const tvaBuckets = tvaByRate(numericLines, 0);

  async function saveDevis(payload: Record<string, unknown>) {
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetchWithAuth("/api/devis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message = data.error || "Impossible d'enregistrer le devis — vérifiez les champs.";
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

  function handleSaveStructured() {
    const payloadLines = lines
      .filter((l) => l.description.trim())
      .map((l) => ({
        type: l.type,
        description: l.description,
        quantite: Number(l.quantite) || 1,
        unite: l.unite || undefined,
        prixUnitaire: Number(l.prixUnitaireHT) || 0,
        tva: Number(l.tva) || 20,
      }));
    saveDevis({
      label: titre || answers.objet,
      clientId: answers.clientId || undefined,
      amount: totals.totalHT,
      description: description || undefined,
      content: buildContentText(titre, description, lines, notes),
      notesDevis: notes || undefined,
      typeTravauxTVA: answers.typeTravauxTVA,
      clientTypeTVA: answers.clientTypeTVA,
      lines: payloadLines,
    });
  }

  function handleSaveFallback() {
    saveDevis({
      label: titre || answers.objet,
      clientId: answers.clientId || undefined,
      amount: answers.budget ? Number(answers.budget) : undefined,
      description: description || undefined,
      content: fallbackContent,
      typeTravauxTVA: answers.typeTravauxTVA,
      clientTypeTVA: answers.clientTypeTVA,
    });
  }

  const lineColumns: TableColumn<LineDraft>[] = [
    {
      key: "type",
      label: "Type",
      render: (l) => (
        <select className="nova-inline-select nova-inline-select-wide" value={l.type} onChange={(e) => updateLine(l.id, { type: e.target.value as LineType })}>
          {VALID_LINE_TYPES.map((t) => (
            <option key={t} value={t}>
              {LINE_TYPE_LABEL[t]}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: "description",
      label: "Description",
      render: (l) => (
        <input
          type="text"
          className="nova-table-input nova-table-input-desc"
          value={l.description}
          onChange={(e) => updateLine(l.id, { description: e.target.value })}
          placeholder="Description de la prestation"
        />
      ),
    },
    {
      key: "quantite",
      label: "Qté",
      align: "right",
      render: (l) => (
        <input
          type="number"
          min="0"
          step="0.01"
          value={l.quantite}
          onChange={(e) => updateLine(l.id, { quantite: e.target.value })}
          className="nova-table-input nova-table-num-input"
        />
      ),
    },
    {
      key: "unite",
      label: "Unité",
      render: (l) => (
        <input
          type="text"
          className="nova-table-input nova-table-num-input"
          value={l.unite}
          onChange={(e) => updateLine(l.id, { unite: e.target.value })}
          placeholder="h, m², forfait..."
        />
      ),
    },
    {
      key: "prixUnitaireHT",
      label: "Prix HT",
      align: "right",
      render: (l) => (
        <input
          type="number"
          min="0"
          step="0.01"
          value={l.prixUnitaireHT}
          onChange={(e) => updateLine(l.id, { prixUnitaireHT: e.target.value })}
          className="nova-table-input nova-table-num-input"
        />
      ),
    },
    {
      key: "tva",
      label: "TVA %",
      align: "right",
      render: (l) => (
        <select className="nova-inline-select" value={l.tva} onChange={(e) => updateLine(l.id, { tva: e.target.value })}>
          <option value="20">20%</option>
          <option value="10">10%</option>
          <option value="5.5">5.5%</option>
        </select>
      ),
    },
    {
      key: "totalHT",
      label: "Total HT",
      align: "right",
      render: (l) => `${lineTotalHT({ quantite: Number(l.quantite) || 0, prixUnitaire: Number(l.prixUnitaireHT) || 0, tva: 0 }).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €`,
    },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (l) => (
        <button type="button" className="nova-icon-btn" onClick={() => removeLine(l.id)} aria-label="Supprimer la ligne">
          <Trash2 size={14} strokeWidth={1.75} />
        </button>
      ),
    },
  ];

  return (
    <div className="nova-page">
      <Breadcrumb items={[{ label: "Devis", href: "/dashboard/devis" }, { label: "Nouveau devis" }]} />

      <header className="nova-page-header">
        <h1>Nouveau devis</h1>
        <p className="nova-page-subtitle">Nova vous pose quelques questions pour générer un devis complet.</p>
      </header>

      {phase === "questions" && (
        <>
          <Card accent={false} className="nova-ai-zone">
            <div className="nova-devis-assistant">
              {history.map((h, i) => (
                <div key={i}>
                  <div className="nova-copilot-bubble-row">
                    <span className="nova-copilot-avatar" aria-hidden="true">
                      <Bot size={15} strokeWidth={1.75} />
                    </span>
                    <div className="nova-copilot-bubble-col">
                      <div className="nova-copilot-bubble nova-copilot-bubble-assistant">{h.question}</div>
                    </div>
                  </div>
                  <div className="nova-copilot-bubble-row nova-copilot-bubble-row-user">
                    <div className="nova-copilot-bubble-col">
                      <div className="nova-copilot-bubble nova-copilot-bubble-user">{h.answer}</div>
                    </div>
                  </div>
                </div>
              ))}

              {step < 6 && (
                <div className="nova-copilot-bubble-row">
                  <span className="nova-copilot-avatar" aria-hidden="true">
                    <Bot size={15} strokeWidth={1.75} />
                  </span>
                  <div className="nova-copilot-bubble-col">
                    <div className="nova-copilot-bubble nova-copilot-bubble-assistant">
                      {step === 0 && Q_TEXT.objet}
                      {step === 1 && Q_TEXT.clientTypeTVA}
                      {step === 2 && Q_TEXT.typeTravauxTVA}
                      {step === 3 && Q_TEXT.precisions}
                      {step === 4 && Q_TEXT.budget}
                      {step === 5 && Q_TEXT.clientId}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {step < 6 && (
              <div className="nova-devis-assistant-controls">
                {step === 0 && (
                  <form className="nova-copilot-input-row" onSubmit={submitObjet}>
                    <input
                      type="text"
                      value={textDraft}
                      onChange={(e) => setTextDraft(e.target.value)}
                      placeholder="Ex. Rénovation salle de bain, pose de parquet..."
                      autoFocus
                    />
                    <Button type="submit" disabled={!textDraft.trim()}>
                      Suivant →
                    </Button>
                  </form>
                )}

                {step === 1 && (
                  <div className="nova-quick-choices">
                    {CLIENT_TYPE_ORDER.map((v) => (
                      <button key={v} type="button" className="nova-quick-choice-btn" onClick={() => chooseClientType(v)}>
                        {CLIENT_TYPE_TVA_LABEL[v]}
                      </button>
                    ))}
                  </div>
                )}

                {step === 2 && (
                  <div className="nova-quick-choices">
                    {TRAVAUX_ORDER.map((v) => (
                      <button key={v} type="button" className="nova-quick-choice-btn" onClick={() => chooseTravaux(v)}>
                        {TYPE_TRAVAUX_TVA_LABEL[v]}
                      </button>
                    ))}
                  </div>
                )}

                {step === 3 && (
                  <form onSubmit={submitPrecisions}>
                    <TextareaField
                      label=""
                      rows={3}
                      value={textDraft}
                      onChange={(e) => setTextDraft(e.target.value)}
                      placeholder="Surface, matériaux, contraintes particulières..."
                    />
                    <div className="nova-status-actions">
                      <Button type="submit">Suivant →</Button>
                      <Button type="button" variant="ghost" onClick={skipPrecisions}>
                        Passer
                      </Button>
                    </div>
                  </form>
                )}

                {step === 4 && (
                  <form onSubmit={submitBudget}>
                    <Field
                      label=""
                      type="number"
                      min="0"
                      step="0.01"
                      value={textDraft}
                      onChange={(e) => setTextDraft(e.target.value)}
                      placeholder="8400"
                    />
                    <div className="nova-status-actions">
                      <Button type="submit">Suivant →</Button>
                      <Button type="button" variant="ghost" onClick={skipBudget}>
                        Passer
                      </Button>
                    </div>
                  </form>
                )}

                {step === 5 && (
                  <div>
                    <SelectField label="" defaultValue="" onChange={(e) => e.target.value && chooseClient(e.target.value)}>
                      <option value="" disabled>
                        Sélectionner un client...
                      </option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </SelectField>
                    <div className="nova-status-actions">
                      <Button type="button" variant="ghost" onClick={skipClient}>
                        Passer — sans client
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {generating && (
              <div className="nova-ai-loading">
                <p className="nova-ai-loading-label">Nova rédige votre devis...</p>
                <Skeleton style={{ height: 160 }} />
              </div>
            )}

            {genError && <div className="nova-info-banner">{GEN_ERROR_MESSAGE[genError]}</div>}
          </Card>

          {canGenerate && !generating && (
            <div className="nova-wizard-actions">
              <Button onClick={handleGenerate} disabled={generating}>
                Générer le devis avec Nova →
              </Button>
            </div>
          )}
        </>
      )}

      {phase === "review" && (
        <>
          <Card>
            <Field label="Intitulé du devis" required value={titre} onChange={(e) => setTitre(e.target.value)} />
            <TextareaField label="Description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Card>

          <section>
            <div className="nova-section-header-row">
              <h2 className="nova-section-title">Lignes du devis</h2>
              <div className="nova-header-actions">
                <Button variant="secondary" onClick={() => setOuvragePickerOpen(true)}>
                  <BookOpen size={16} strokeWidth={1.75} />
                  Choisir depuis la bibliothèque
                </Button>
                <Button variant="secondary" onClick={addManualLine}>
                  <Plus size={16} strokeWidth={1.75} />
                  Ajouter une ligne manuellement
                </Button>
              </div>
            </div>

            <Table columns={lineColumns} rows={lines} emptyLabel="Aucune ligne — ajoutez-en une." />

            {lines.length > 0 && (
              <div className="nova-devis-totals">
                <div className="nova-devis-totals-row">
                  <span>Total HT</span>
                  <span>{totals.totalHT.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €</span>
                </div>
                {tvaBuckets.map((b) => (
                  <div className="nova-devis-totals-row" key={b.rate}>
                    <span>TVA {b.rate}%</span>
                    <span>{b.tva.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €</span>
                  </div>
                ))}
                <div className="nova-devis-totals-row nova-devis-totals-ttc">
                  <span>Total TTC</span>
                  <span>{totals.totalTTC.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €</span>
                </div>
              </div>
            )}
          </section>

          <Card>
            <TextareaField
              label="Notes de bas de devis (optionnel)"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Conditions, délais, remarques..."
            />
          </Card>

          {saveError && <div className="error">{saveError}</div>}

          <div className="nova-wizard-actions">
            <Button type="button" variant="secondary" onClick={() => setPhase("questions")}>
              ← Modifier les réponses
            </Button>
            <Button type="button" onClick={handleSaveStructured} disabled={saving || !titre.trim() || lines.length === 0}>
              {saving ? "Enregistrement..." : "Enregistrer le devis →"}
            </Button>
          </div>

          {ouvragePickerOpen && (
            <div className="nova-modal-overlay" onClick={() => setOuvragePickerOpen(false)}>
              <div
                className="nova-modal nova-modal-edit"
                role="dialog"
                aria-modal="true"
                aria-label="Choisir depuis la bibliothèque"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="nova-modal-title">Choisir depuis la bibliothèque</h3>
                <SearchInput value={ouvrageQuery} onChange={setOuvrageQuery} placeholder="Rechercher un ouvrage..." />
                {ouvrageOptions === null ? (
                  <Skeleton style={{ height: 160 }} />
                ) : (
                  <div className="nova-picker-list">
                    {ouvrageOptions
                      .filter((o) => o.label.toLowerCase().includes(ouvrageQuery.trim().toLowerCase()))
                      .map((o) => (
                        <button key={o.id} type="button" className="nova-picker-row" onClick={() => addFromOuvrage(o)}>
                          <span className="nova-picker-row-label">
                            {o.label} <Badge tone="neutral">{OUVRAGE_TYPE_LABEL[o.type as keyof typeof OUVRAGE_TYPE_LABEL] || o.type}</Badge>
                          </span>
                          <span className="nova-picker-row-price">
                            {o.prixUnitaireHT.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} € / {o.unite}
                          </span>
                        </button>
                      ))}
                    {ouvrageOptions.length === 0 && <p className="nova-page-subtitle">Bibliothèque vide.</p>}
                  </div>
                )}
                <div className="nova-modal-actions">
                  <Button type="button" variant="ghost" onClick={() => setOuvragePickerOpen(false)}>
                    Fermer
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {phase === "fallback" && (
        <>
          <Card accent={false} className="nova-ai-zone">
            <div className="nova-ai-zone-header">
              <span className="nova-page-subtitle">Nova n'a pas pu structurer le devis automatiquement — contenu à ajuster ci-dessous.</span>
            </div>
            <Field label="Intitulé du devis" required value={titre} onChange={(e) => setTitre(e.target.value)} />
            <textarea value={fallbackContent} onChange={(e) => setFallbackContent(e.target.value)} rows={12} />
          </Card>

          {saveError && <div className="error">{saveError}</div>}

          <div className="nova-wizard-actions">
            <Button type="button" variant="secondary" onClick={() => setPhase("questions")}>
              ← Modifier les réponses
            </Button>
            <Button type="button" onClick={handleSaveFallback} disabled={saving || !titre.trim() || !fallbackContent.trim()}>
              {saving ? "Enregistrement..." : "Enregistrer le devis →"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
