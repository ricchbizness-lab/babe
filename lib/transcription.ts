/**
 * L'API Claude ne fait pas de transcription audio native — un service de
 * transcription tiers convertit l'audio en texte avant que Claude ne le
 * résume. Implémentation avec Groq (API compatible Whisper, rapide et peu
 * chère) — nécessite GROQ_API_KEY dans les variables d'environnement.
 *
 * Pour changer de fournisseur (OpenAI Whisper direct, AssemblyAI...), ne
 * modifier que ce fichier — le reste du produit n'a aucune dépendance
 * directe à Groq.
 */

export interface TranscriptionResult {
  transcript: string;
  language: string;
}

const GROQ_TRANSCRIPTION_URL = "https://api.groq.com/openai/v1/audio/transcriptions";

/**
 * Transcrit un fichier audio fourni en base64 (pas de stockage objet
 * nécessaire pour l'instant — le fichier est envoyé directement à Groq et
 * n'est pas conservé côté NOVA, seul le texte transcrit l'est).
 */
export async function transcribeAudioBase64(
  audioBase64: string,
  mimeType: string,
  filename = "audio.webm"
): Promise<TranscriptionResult> {
  if (!process.env.GROQ_API_KEY) {
    throw new Error(
      "GROQ_API_KEY manquant — créer un compte sur console.groq.com, générer une clé API, " +
      "et l'ajouter à .env sous GROQ_API_KEY avant d'activer l'upload audio."
    );
  }

  const buffer = Buffer.from(audioBase64, "base64");
  const blob = new Blob([buffer], { type: mimeType });

  const formData = new FormData();
  formData.append("file", blob, filename);
  formData.append("model", "whisper-large-v3");
  formData.append("response_format", "verbose_json");

  const res = await fetch(GROQ_TRANSCRIPTION_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: formData,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Échec de la transcription (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return {
    transcript: data.text || "",
    language: data.language || "fr",
  };
}

/** Conservé pour compatibilité si un fournisseur basé sur une URL (plutôt que base64) est branché plus tard. */
export async function transcribeAudio(_audioUrl: string): Promise<TranscriptionResult> {
  throw new Error(
    "transcribeAudio(url) n'est pas implémenté — utiliser transcribeAudioBase64() " +
    "pour le flux actuel (upload direct, sans stockage objet intermédiaire)."
  );
}
