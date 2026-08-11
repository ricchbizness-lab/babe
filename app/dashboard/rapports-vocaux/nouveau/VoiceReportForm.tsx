"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Mic, Square } from "lucide-react";
import { Badge, BackLink, Button, Card, Field, SelectField, TextareaField } from "@/components/ui";

type ProjectOption = { id: string; name: string };
type Mode = "texte" | "audio";

type ReportResult = { summary: string };

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function VoiceReportForm({
  audioEnabled,
  defaultProjectId,
}: {
  audioEnabled: boolean;
  defaultProjectId?: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("texte");
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [authorLabel, setAuthorLabel] = useState("");
  const [projectId, setProjectId] = useState(defaultProjectId || "");
  const [transcriptText, setTranscriptText] = useState("");

  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ReportResult | null>(null);

  useEffect(() => {
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data) => setProjects((data.projects ?? []).map((p: { id: string; name: string }) => ({ id: p.id, name: p.name }))));
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startRecording() {
    setError("");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
      setAudioBlob(blob);
      setAudioUrl(URL.createObjectURL(blob));
      stream.getTracks().forEach((t) => t.stop());
    };
    recorder.start();
    mediaRecorderRef.current = recorder;
    setAudioBlob(null);
    setAudioUrl(null);
    setSeconds(0);
    setRecording(true);
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (mode === "texte" && !transcriptText.trim()) {
      setError("Saisissez le compte rendu avant d'envoyer.");
      return;
    }
    if (mode === "audio" && !audioBlob) {
      setError("Enregistrez un message avant d'envoyer.");
      return;
    }

    setSubmitting(true);
    const body: Record<string, unknown> = {
      authorLabel,
      projectId: projectId || undefined,
    };
    if (mode === "texte") {
      body.transcriptText = transcriptText;
    } else if (audioBlob) {
      body.audioBase64 = await blobToBase64(audioBlob);
      body.audioMimeType = audioBlob.type || "audio/webm";
    }

    try {
      const res = await fetch("/api/voice-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Impossible d'enregistrer le rapport.");
        return;
      }
      const data = await res.json();
      if (!data.report) {
        setError("Réponse inattendue du serveur — réessayez.");
        return;
      }
      setResult({ summary: data.report.summary });
    } catch {
      setError("Impossible de joindre le serveur — vérifiez votre connexion et réessayez.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="nova-page">
        <BackLink href="/dashboard/rapports-vocaux" label="Retour aux rapports vocaux" />
        <header className="nova-page-header">
          <h1>Rapport enregistré</h1>
        </header>
        <Card accent={false} className="nova-ai-zone">
          <div className="nova-ai-zone-header">
            <Badge tone="teal">Résumé Nova</Badge>
          </div>
          <p className="nova-ai-content">{result.summary}</p>
        </Card>
        <div>
          <Button onClick={() => router.push("/dashboard/rapports-vocaux")}>Voir tous les rapports</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="nova-page">
      <BackLink href="/dashboard/rapports-vocaux" label="Retour aux rapports vocaux" />

      <header className="nova-page-header">
        <h1>Nouveau rapport vocal</h1>
      </header>

      <div className="nova-notice">
        Ce compte rendu est un outil pratique pour le collaborateur — il n'est pas utilisé pour évaluer sa
        performance individuelle.
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <Field
            label="Nom du collaborateur / rôle"
            required
            value={authorLabel}
            onChange={(e) => setAuthorLabel(e.target.value)}
            placeholder="Marc (chef de chantier)"
          />
          <SelectField label="Chantier rattaché" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">Aucun chantier rattaché</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </SelectField>

          {audioEnabled && (
            <div className="nova-filter-row nova-mode-toggle">
              <button
                type="button"
                className={`nova-filter-chip ${mode === "texte" ? "nova-filter-chip-active" : ""}`}
                onClick={() => setMode("texte")}
              >
                Saisie manuelle
              </button>
              <button
                type="button"
                className={`nova-filter-chip ${mode === "audio" ? "nova-filter-chip-active" : ""}`}
                onClick={() => setMode("audio")}
              >
                Enregistrement vocal
              </button>
            </div>
          )}

          {mode === "texte" ? (
            <TextareaField
              label="Compte rendu"
              rows={6}
              value={transcriptText}
              onChange={(e) => setTranscriptText(e.target.value)}
              placeholder="Charpente posée à 60% aujourd'hui, il manque des tuiles pour finir la semaine..."
            />
          ) : (
            <div className="nova-record-block">
              <label>Enregistrement</label>
              <div className="nova-record-controls">
                {recording ? (
                  <Button type="button" variant="danger" className="nova-btn-recording" onClick={stopRecording}>
                    <Square size={16} strokeWidth={1.75} />
                    Arrêter
                  </Button>
                ) : (
                  <Button type="button" variant="danger" onClick={startRecording}>
                    <Mic size={16} strokeWidth={1.75} />
                    {audioBlob ? "Réenregistrer" : "Démarrer l'enregistrement"}
                  </Button>
                )}
                {recording && (
                  <div className="nova-record-indicator">
                    <span className="nova-record-dot" />
                    <span className="nova-record-timer">{formatTime(seconds)}</span>
                  </div>
                )}
              </div>
              {audioUrl && !recording && (
                <audio className="nova-record-preview" controls src={audioUrl} />
              )}
            </div>
          )}

          {!audioEnabled && <p className="nova-hint-standalone">Enregistrement vocal disponible avec la clé Groq.</p>}

          {error && <div className="error">{error}</div>}
          <Button type="submit" disabled={submitting}>
            {submitting ? "Envoi en cours..." : "Envoyer pour résumé"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
