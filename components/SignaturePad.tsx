"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button, initialsFromName } from "@/components/ui";
import { PrintableDocument, type PrintableLine } from "@/components/PrintableDocument";
import { computeDevisTotals } from "@/lib/devisTotals";
import { devisReference } from "@/lib/facturation";

type Devis = {
  id: string;
  label: string;
  description: string | null;
  amount: number | null;
  remise: number | null;
  createdAt: string;
  updatedAt: string;
  lines: PrintableLine[];
  client: { name: string; email: string | null; phone: string | null; address: string | null } | null;
};

type Business = {
  name: string;
  siret: string | null;
  address: string | null;
  logoBase64: string | null;
  conditionsPaiement: string | null;
};

type Props = {
  token: string;
  devis: Devis;
  business: Business;
  alreadySigned: { signedAt: string; signatureData: string | null } | null;
};

function montantTTC(devis: Devis): number {
  return devis.lines.length > 0
    ? computeDevisTotals(devis.lines, devis.remise || 0).totalTTC
    : (devis.amount || 0) * 1.2;
}

export function SignaturePad({ token, devis, business, alreadySigned }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const numero = devisReference([devis], devis.id);
  const ttc = montantTTC(devis);

  function getPos(e: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLCanvasElement>) {
    const ctx = canvasRef.current!.getContext("2d");
    if (!ctx) return;
    drawingRef.current = true;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current!.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.strokeStyle = "#14181C";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  }

  function handlePointerUp() {
    drawingRef.current = false;
  }

  function handleClear() {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d");
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  }

  async function handleSubmit() {
    if (!hasDrawn || !accepted || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const signatureData = canvasRef.current!.toDataURL("image/png");
      const res = await fetch(`/api/signature/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signatureData, accepted: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Impossible d'enregistrer la signature — réessayez.");
        return;
      }
      setDone(true);
    } catch {
      setError("Impossible de joindre le serveur — réessayez.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="nova-portal">
      <div className="nova-portal-card nova-signature-card">
        <header className="nova-portal-header">
          {business.logoBase64 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={business.logoBase64} alt={business.name} className="nova-portal-logo" />
          ) : (
            <div className="nova-portal-logo nova-portal-logo-fallback">{initialsFromName(business.name)}</div>
          )}
          <div>
            <div className="nova-portal-business">{business.name}</div>
            <div className="nova-portal-tagline">Signature du devis</div>
          </div>
        </header>

        <PrintableDocument
          kind="devis"
          numero={numero}
          date={devis.updatedAt}
          business={business}
          client={devis.client}
          label={devis.label}
          description={devis.description}
          lines={devis.lines}
          fallbackAmountHT={devis.amount}
          remisePct={devis.remise || 0}
        />

        {alreadySigned ? (
          <div className="nova-signature-done">
            <CheckCircle2 size={40} strokeWidth={1.5} className="nova-signature-done-icon" />
            <h2>Ce devis a déjà été signé</h2>
            <p>Signé le {new Date(alreadySigned.signedAt).toLocaleString("fr-FR")}.</p>
            {alreadySigned.signatureData && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={alreadySigned.signatureData} alt="Signature" className="nova-signature-preview" />
            )}
          </div>
        ) : done ? (
          <div className="nova-signature-done">
            <CheckCircle2 size={40} strokeWidth={1.5} className="nova-signature-done-icon" />
            <h2>Signature enregistrée</h2>
            <p>Merci, votre signature a bien été enregistrée. L'entreprise a été notifiée.</p>
          </div>
        ) : (
          <section className="nova-portal-section nova-signature-zone">
            <h2>Votre signature</h2>
            <p className="nova-signature-instructions">Signez ici avec votre doigt ou votre souris</p>
            <canvas
              ref={canvasRef}
              width={600}
              height={220}
              className="nova-signature-canvas"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            />
            <Button type="button" variant="secondary" onClick={handleClear}>
              Effacer
            </Button>

            <p className="nova-signature-legal">
              En signant ce document, j'accepte le devis {numero} d'un montant de{" "}
              {ttc.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} € et je m'engage à en respecter les
              conditions. Bon pour accord.
            </p>

            <label className="nova-signature-checkbox">
              <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
              <span>J'ai lu et j'accepte les conditions du devis</span>
            </label>

            {error && <p className="error">{error}</p>}

            <Button
              onClick={handleSubmit}
              disabled={!hasDrawn || !accepted || submitting}
              className="nova-portal-contact-btn"
            >
              {submitting ? "Envoi..." : "Valider ma signature"}
            </Button>
          </section>
        )}
      </div>
      <footer className="nova-portal-footer">Propulsé par Nova</footer>
    </div>
  );
}
