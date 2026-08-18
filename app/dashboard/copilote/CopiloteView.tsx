"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { FileBarChart, Send } from "lucide-react";
import { Badge, Skeleton, useToast } from "@/components/ui";
import { fetchWithAuth } from "@/lib/fetchClient";

type Registre = {
  devisTotal: number;
  devisAcceptes: number;
  caFacture: number;
  tachesTraiteesATemps: number;
  tachesEnAttente: number;
  tempsEstime: { heures: number; tauxHoraire: number; estimationEuros: number };
};

type DevisRow = { id: string; status: string; amount: number | null };
type ChatMessage = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = ["Pourquoi ma marge baisse ?", "Quels devis sont en attente ?", "Que dois-je prioriser cette semaine ?"];

function fmtEuro(n: number): string {
  return `${n.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €`;
}

export function CopiloteView() {
  const toast = useToast();
  const [registre, setRegistre] = useState<Registre | null>(null);
  const [devis, setDevis] = useState<DevisRow[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const historyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchWithAuth("/api/registre")
      .then((res) => res.json())
      .then((data) => setRegistre(data.registre));
    fetchWithAuth("/api/devis")
      .then((res) => res.json())
      .then((data) => setDevis(data.devis ?? []));
  }, []);

  useEffect(() => {
    historyRef.current?.scrollTo({ top: historyRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function handleSend(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setSending(true);
    try {
      const res = await fetchWithAuth("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Erreur lors de la réponse de Nova.");
        return;
      }
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      toast.error("Impossible de joindre le serveur — réessayez.");
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    handleSend(input);
  }

  const pendingDevis = devis.filter((d) => d.status === "brouillon" || d.status === "envoye");
  const pendingTotal = pendingDevis.reduce((sum, d) => sum + (d.amount || 0), 0);

  return (
    <div className="nova-page">
      <header className="nova-page-header-row">
        <div>
          <h1>Copilote</h1>
          <p className="nova-page-subtitle">Nova, votre copilote de pilotage — options à évaluer, jamais de décisions à votre place.</p>
        </div>
        <Link href="/dashboard/copilote/rapport" className="nova-btn nova-btn-secondary">
          <FileBarChart size={16} strokeWidth={1.75} />
          Rapport stratégique
        </Link>
      </header>

      <div className="nova-copilot-columns">
        <div className="nova-registre">
          <h2 className="nova-section-title">Registre d'activité</h2>
          {registre === null ? (
            <>
              <Skeleton style={{ width: 100, height: 26, marginBottom: 6 }} />
              <Skeleton style={{ width: 140, height: 12 }} />
            </>
          ) : (
            <>
              <div className="nova-registre-item">
                <div className="nova-registre-value">{fmtEuro(registre.caFacture)}</div>
                <div className="nova-registre-label">CA facturé (devis acceptés)</div>
              </div>
              <div className="nova-registre-item">
                <div className="nova-registre-value">{pendingDevis.length}</div>
                <div className="nova-registre-label">
                  Devis en attente{pendingTotal > 0 ? ` — ${fmtEuro(pendingTotal)} estimés` : ""}
                </div>
              </div>
              <div className="nova-registre-item">
                <div className="nova-registre-value">
                  {registre.tachesTraiteesATemps} / {registre.tachesTraiteesATemps + registre.tachesEnAttente}
                </div>
                <div className="nova-registre-label">Tâches traitées</div>
              </div>
              <div className="nova-registre-divider" />
              <div className="nova-registre-estimate">
                <div className="nova-registre-estimate-label">Estimation — non vérifiable</div>
                <div className="nova-registre-estimate-value">
                  {registre.tempsEstime.heures.toFixed(1)} h de temps estimé gagné · {fmtEuro(registre.tempsEstime.estimationEuros)}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="nova-copilot-chat">
          <div className="nova-copilot-history" ref={historyRef}>
            {messages.length === 0 ? (
              <div className="nova-copilot-suggestions">
                <p className="nova-copilot-suggestions-lead">Posez une question à Nova sur votre activité, ou choisissez :</p>
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" className="nova-copilot-suggestion" onClick={() => handleSend(s)}>
                    {s}
                  </button>
                ))}
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={`nova-copilot-bubble-row ${m.role === "user" ? "nova-copilot-bubble-row-user" : ""}`}>
                  {m.role === "assistant" && <Badge tone="neutral">Nova</Badge>}
                  <div className={`nova-copilot-bubble ${m.role === "user" ? "nova-copilot-bubble-user" : "nova-copilot-bubble-assistant"}`}>
                    {m.content}
                  </div>
                </div>
              ))
            )}
            {sending && (
              <div className="nova-copilot-bubble-row">
                <Badge tone="neutral">Nova</Badge>
                <div className="nova-copilot-bubble nova-copilot-bubble-assistant">
                  <span className="nova-typing-dots">
                    <span />
                    <span />
                    <span />
                  </span>
                </div>
              </div>
            )}
          </div>
          <form className="nova-copilot-input-row" onSubmit={handleSubmit}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Écrivez à Nova..."
              aria-label="Message à Nova"
              disabled={sending}
            />
            <button type="submit" className="nova-btn nova-btn-primary" disabled={sending || !input.trim()}>
              <Send size={15} strokeWidth={1.75} />
              Envoyer
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
